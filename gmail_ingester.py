import os
import time
import json
import imaplib
import email
from email.policy import default
import redis
import logging
import hashlib
from dotenv import load_dotenv
from rich.logging import RichHandler

logging.basicConfig(level=logging.INFO, format="%(message)s", datefmt="[%X]", handlers=[RichHandler()])
logger = logging.getLogger("gmail_ingester")

load_dotenv()

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
# Customize this search to find your specific bank emails
GMAIL_SEARCH_QUERY = os.getenv("GMAIL_SEARCH_QUERY", "from:alerts@chase.com -label:fintrack_processed")
GMAIL_LABEL_DONE = os.getenv("GMAIL_LABEL_DONE", "fintrack_processed")
POLL_INTERVAL = int(os.getenv("GMAIL_POLL_INTERVAL", 300))

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 16379))
REDIS_QUEUE = os.getenv("REDIS_QUEUE", "fintrack_queue")

def extract_text_from_email(msg):
    text_content = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            # We only care about the plain text portion of the email for the LLM
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    text_content += payload.decode(errors="ignore") + "\n"
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            text_content = payload.decode(errors="ignore")
    return text_content.strip()

def process_gmail():
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        logger.error("⚠️ GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env")
        return

    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        
        # Select All Mail so we catch everything regardless of folder
        status, messages = mail.select('"[Gmail]/All Mail"')
        if status != 'OK':
            # Fallback to INBOX if All Mail fails
            mail.select("INBOX")
        
        # Use Gmail's custom search extension (X-GM-RAW) to allow advanced queries like "-label:xxx"
        status, response = mail.uid('SEARCH', 'X-GM-RAW', f'"{GMAIL_SEARCH_QUERY}"')
        
        if status == 'OK':
            uids = response[0].split()
            if uids:
                logger.info(f"📬 Found {len(uids)} new emails matching query.")
                for uid in uids:
                    # Fetch email body
                    res, msg_data = mail.uid('FETCH', uid, '(RFC822)')
                    if res == 'OK':
                        raw_email = msg_data[0][1]
                        msg = email.message_from_bytes(raw_email, policy=default)
                        
                        text_content = extract_text_from_email(msg)
                        if not text_content:
                            logger.warning(f"Could not extract text from email UID {uid.decode()}")
                            continue
                            
                        # Create unique ID from email Message-ID to prevent duplicates
                        msg_id = msg.get('Message-ID', f"uid-{uid.decode()}")
                        tx_id = hashlib.md5(msg_id.encode()).hexdigest()
                        
                        # Prepare payload for Fintrack Worker
                        payload = {
                            "id": tx_id,
                            "snippet": text_content
                        }
                        
                        # Push to Redis Queue
                        r.lpush(REDIS_QUEUE, json.dumps(payload))
                        logger.info(f"✅ Pushed to queue: {tx_id}")
                        
                        # Apply the "Processed" label using Gmail's IMAP extension
                        # Note: You should create the label "fintrack_processed" in your Gmail UI first!
                        mail.uid('STORE', uid, '+X-GM-LABELS', f'"{GMAIL_LABEL_DONE}"')
            else:
                logger.info("📭 No new emails found. Waiting...")
                
        mail.logout()
    except Exception as e:
        logger.error(f"❌ Error checking Gmail: {e}")

def run_loop():
    logger.info("🚀 Starting Gmail Ingester Loop...")
    while True:
        process_gmail()
        logger.info(f"💤 Sleeping for {POLL_INTERVAL} seconds...")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    run_loop()
