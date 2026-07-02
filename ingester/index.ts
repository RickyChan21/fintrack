import Imap from "imap";
import { simpleParser } from "mailparser";
import { createHash } from "crypto";
import { queue } from "../src/lib/queue";

const GMAIL_USER = process.env.GMAIL_USER!;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD!;
const GMAIL_SEARCH_QUERY = process.env.GMAIL_SEARCH_QUERY || "from:alerts@chase.com -label:fintrack_processed";
const POLL_INTERVAL = parseInt(process.env.GMAIL_POLL_INTERVAL || "300");

function connectImap(): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: GMAIL_USER,
      password: GMAIL_APP_PASSWORD,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });
    imap.once("ready", () => resolve(imap));
    imap.once("error", reject);
    imap.connect();
  });
}

function searchEmails(imap: Imap): Promise<number[]> {
  return new Promise((resolve, reject) => {
    imap.openBox("[Gmail]/All Mail", true, (err) => {
      if (err) imap.openBox("INBOX", true, (err2) => {
        if (err2) return reject(err2);
        search();
      });
      else search();
    });
    function search() {
      imap.search([["X-GM-RAW", GMAIL_SEARCH_QUERY]], (err, results) => {
        if (err) reject(err);
        else resolve(results || []);
      });
    }
  });
}

function fetchEmail(imap: Imap, seqno: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const f = imap.fetch(seqno, { bodies: "" });
    f.on("message", (msg) => {
      msg.on("body", (stream) => {
        let chunks = "";
        stream.on("data", (chunk: Buffer) => (chunks += chunk.toString()));
        stream.on("end", () => resolve(chunks));
      });
    });
    f.once("error", reject);
  });
}

async function processGmail() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
    return;
  }

  try {
    const imap = await connectImap();
    const results = await searchEmails(imap);

    if (results.length > 0) {
      console.log(`Found ${results.length} new emails`);

      for (const seqno of results.slice(-10)) {
        const raw = await fetchEmail(imap, seqno);
        const parsed = await simpleParser(raw);
        const text = parsed.text || "";
        if (!text.trim()) continue;

        const msgId = parsed.messageId || `seq-${seqno}`;
        const txId = createHash("md5").update(msgId).digest("hex");

        await queue.add("process", { id: txId, snippet: text }, { jobId: txId });
        console.log(`Queued: ${txId}`);
      }
    } else {
      console.log("No new emails");
    }

    imap.end();
  } catch (err) {
    console.error("Gmail error:", err);
  }
}

async function main() {
  console.log("Gmail Ingester started");
  while (true) {
    await processGmail();
    console.log(`Sleeping ${POLL_INTERVAL}s...`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL * 1000));
  }
}

main();
