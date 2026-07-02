import { google } from "googleapis";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
const { client_secret, client_id } = credentials.installed || credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  "urn:ietf:wg:oauth:2.0:oob"
);

async function main() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("Open this URL in your browser:\n");
  console.log(authUrl);
  console.log("\nGrant access, then paste the code here:\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise<string>((resolve) => rl.question("> ", resolve));

  const { tokens } = await oauth2Client.getToken(code);
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  console.log("\n✅ token.json saved.");
  console.log("\nFor Docker env vars, add these to your container:\n");
  console.log(`GMAIL_CLIENT_ID=${client_id}`);
  console.log(`GMAIL_CLIENT_SECRET=${client_secret}`);
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log("");
  rl.close();
}

main();
