import { google } from "googleapis";
import { createHash } from "crypto";
import Redis from "ioredis";
import { simpleParser } from "mailparser";
import { PrismaClient } from "@prisma/client";
import { queue } from "../src/lib/queue";

const REDIS_PORT = parseInt(process.env.REDIS_PORT || "16379");
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const r = new Redis(REDIS_PORT, REDIS_HOST);
const prisma = new PrismaClient();

function gmailAuth() {
  const cid = process.env.GMAIL_CLIENT_ID;
  const cs = process.env.GMAIL_CLIENT_SECRET;
  const rt = process.env.GMAIL_REFRESH_TOKEN;
  if (!cid || !cs || !rt) throw new Error("GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN must be set");
  const o = new google.auth.OAuth2(cid, cs, "urn:ietf:wg:oauth:2.0:oob");
  o.setCredentials({ refresh_token: rt });
  return google.gmail({ version: "v1", auth: o });
}

async function ensureLabel(gmail: ReturnType<typeof gmailAuth>, name: string) {
  const res = await gmail.users.labels.list({ userId: "me" });
  const existing = res.data.labels?.find((l) => l.name === name);
  if (existing) return existing.id!;
  const c = await gmail.users.labels.create({ userId: "me", requestBody: { name, labelListVisibility: "labelHide", messageListVisibility: "show" } });
  return c.data.id!;
}

async function processConfig(cfg: { name: string; searchQuery: string; labelDone: string }) {
  if (await r.get("fintrack:ingester:paused") === "true") return;
  try {
    const gmail = gmailAuth();
    const labelId = await ensureLabel(gmail, cfg.labelDone);
    const res = await gmail.users.messages.list({ userId: "me", q: cfg.searchQuery, maxResults: 20 });
    const msgs = res.data.messages || [];
    if (!msgs.length) { console.log(`[${cfg.name}] No new emails`); return; }
    console.log(`[${cfg.name}] Found ${msgs.length} new emails`);
    for (const msg of msgs) {
      const d = await gmail.users.messages.get({ userId: "me", id: msg.id!, format: "raw" });
      const raw = Buffer.from(d.data.raw!, "base64url");
      const p = await simpleParser(raw);
      const text = p.text || "";
      if (!text.trim()) continue;
      const txId = createHash("md5").update((d.data.internalDate || msg.id!).toString()).digest("hex");
      await queue.add("process", { id: txId, snippet: text, gmailId: msg.id, labelId }, { jobId: txId });
      console.log(`[${cfg.name}] Queued: ${txId}`);
    }
  } catch (err) { console.error(`[${cfg.name}] Error:`, err); }
}

async function main() {
  console.log("Gmail Ingester started");
  while (true) {
    const configs = await prisma.ingesterConfig.findMany({ where: { enabled: true } });
    if (!configs.length) {
      console.log("No enabled ingesters. Configure at /settings.");
      await new Promise((r) => setTimeout(r, 30000));
      continue;
    }
    for (const c of configs) await processConfig(c);
    const min = Math.min(...configs.map((c) => c.pollInterval)) * 1000;
    await new Promise((r) => setTimeout(r, min));
  }
}

main();
