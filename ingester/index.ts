import { google } from "googleapis";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { queue } from "../src/lib/queue";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GMAIL_SEARCH_QUERY = process.env.GMAIL_SEARCH_QUERY || "from:alerts@chase.com -label:fintrack_processed";
const GMAIL_LABEL_DONE = process.env.GMAIL_LABEL_DONE || "fintrack_processed";
const POLL_INTERVAL = parseInt(process.env.GMAIL_POLL_INTERVAL || "300");

function auth() {
  const client_id = process.env.GMAIL_CLIENT_ID;
  const client_secret = process.env.GMAIL_CLIENT_SECRET;
  const refresh_token = process.env.GMAIL_REFRESH_TOKEN;

  if (client_id && client_secret && refresh_token) {
    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, "urn:ietf:wg:oauth:2.0:oob");
    oauth2Client.setCredentials({ refresh_token });
    return google.gmail({ version: "v1", auth: oauth2Client });
  }

  // Fallback to files for local dev
  const tokenPath = process.env.GMAIL_TOKEN_PATH || path.join(__dirname, "..", "token.json");
  const credsPath = process.env.GMAIL_CREDENTIALS_PATH || path.join(__dirname, "..", "credentials.json");

  const token = JSON.parse(readFileSync(tokenPath, "utf-8"));
  const creds = JSON.parse(readFileSync(credsPath, "utf-8"));
  const { client_secret: cs, client_id: ci } = creds.installed || creds.web;

  const oauth2Client = new google.auth.OAuth2(ci, cs, "urn:ietf:wg:oauth:2.0:oob");
  oauth2Client.setCredentials(token);
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
  if (!TOKEN_PATH || !CREDENTIALS_PATH) {
    console.error("GMAIL_TOKEN_PATH and GMAIL_CREDENTIALS_PATH must be set");
    return;
  }

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
        format: "full",
      });

      const payload = detail.data.payload;
      let text = "";

      if (payload?.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            text = Buffer.from(part.body.data, "base64url").toString("utf-8");
            break;
          }
        }
      } else if (payload?.body?.data) {
        text = Buffer.from(payload.body.data, "base64url").toString("utf-8");
      }

      if (!text.trim()) continue;

      const msgId = detail.data.internalDate || msg.id!;
      const txId = createHash("md5").update(msgId.toString()).digest("hex");

      await queue.add("process", { id: txId, snippet: text }, { jobId: txId });

      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id!,
        requestBody: { addLabelIds: [labelId] },
      });

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
