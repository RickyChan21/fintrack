import { google } from "googleapis";
import { createHash } from "crypto";
import { simpleParser } from "mailparser";
import { queue } from "../src/lib/queue";

const GMAIL_SEARCH_QUERY = process.env.GMAIL_SEARCH_QUERY || "from:alerts@chase.com -label:fintrack_processed";
const GMAIL_LABEL_DONE = process.env.GMAIL_LABEL_DONE || "fintrack_processed";
const POLL_INTERVAL = parseInt(process.env.GMAIL_POLL_INTERVAL || "300");

function auth() {
  const client_id = process.env.GMAIL_CLIENT_ID;
  const client_secret = process.env.GMAIL_CLIENT_SECRET;
  const refresh_token = process.env.GMAIL_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error("GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN must be set");
  }

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, "urn:ietf:wg:oauth:2.0:oob");
  oauth2Client.setCredentials({ refresh_token });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

async function ensureLabel(gmail: ReturnType<typeof auth>) {
  const res = await gmail.users.labels.list({ userId: "me" });
  const existing = res.data.labels?.find((l) => l.name === GMAIL_LABEL_DONE);
  if (existing) return existing.id!;

  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: GMAIL_LABEL_DONE,
      labelListVisibility: "labelHide",
      messageListVisibility: "show",
    },
  });
  return created.data.id!;
}

async function processGmail() {
  try {
    const gmail = auth();
    const labelId = await ensureLabel(gmail);

    const res = await gmail.users.messages.list({
      userId: "me",
      q: GMAIL_SEARCH_QUERY,
      maxResults: 20,
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) {
      console.log("No new emails");
      return;
    }

    console.log(`Found ${messages.length} new emails`);

    for (const msg of messages) {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "raw",
      });

      const raw = Buffer.from(detail.data.raw!, "base64url");
      const parsed = await simpleParser(raw);
      const text = parsed.text || "";
      if (!text.trim()) continue;

      const msgId = detail.data.internalDate || msg.id!;
      const txId = createHash("md5").update(msgId.toString()).digest("hex");

      await queue.add("process", { id: txId, snippet: text, gmailId: msg.id, labelId }, { jobId: txId });

      console.log(`Queued: ${txId}`);
    }
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
