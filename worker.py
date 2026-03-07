import os
import json
import redis
import logging
import time
import socket
from urllib.parse import urlparse
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI, APIConnectionError, RateLimitError
from sqlmodel import Session, create_engine, select, and_
from models import Transaction, Category, TransactionResponse, create_db_and_tables
from tenacity import retry, wait_exponential, stop_never, before_sleep_log, retry_if_exception_type

# Rich UI imports
from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table
from rich.panel import Panel
from rich.live import Live

# Configure logging with Rich
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(rich_tracebacks=True)]
)
logger = logging.getLogger("rich")
console = Console()

load_dotenv()

# Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 16379))
REDIS_QUEUE = os.getenv("REDIS_QUEUE", "fintrack_queue")
PROCESSING_QUEUE = f"{REDIS_QUEUE}_processing"
DLQ_QUEUE = f"{REDIS_QUEUE}_dead_letter"
DATABASE_URL = os.getenv("DATABASE_URL")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "not-needed")
LLM_MODEL = os.getenv("LLM_MODEL", "llama3")

# Initialize clients
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
engine = create_engine(DATABASE_URL)
# Configure OpenAI client to point to local LLM server
client = OpenAI(base_url=LLM_BASE_URL, api_key=OPENAI_API_KEY)

# Ensure tables exist
create_db_and_tables(engine)

def is_llm_host_reachable():
    """Lightweight check to see if the desktop/LLM server is on the network."""
    try:
        url = urlparse(LLM_BASE_URL)
        host = url.hostname
        port = url.port or (80 if url.scheme == "http" else 443)
        # Try to open a socket connection (TCP handshake)
        with socket.create_connection((host, port), timeout=3):
            return True
    except (socket.timeout, ConnectionRefusedError, socket.gaierror, OSError):
        return False

def get_valid_categories():
    """Fetches valid categories from the database."""
    with Session(engine) as session:
        categories = session.exec(select(Category)).all()
        return {c.name: c.id for c in categories}

@retry(
    wait=wait_exponential(multiplier=1, min=4, max=60), 
    stop=stop_never,
    before_sleep=before_sleep_log(logger, logging.WARNING),
    retry=retry_if_exception_type((APIConnectionError, RateLimitError))
)
def categorize_transaction_with_retry(snippet, categories):
    """Calls local LLM to categorize the transaction."""
    # Double check reachability before making the heavy call
    if not is_llm_host_reachable():
        raise APIConnectionError("LLM Host is unreachable")

    category_list = ", ".join(list(categories.keys()))
    prompt = f"""
    Analyze this Spanish bank transaction from Panama and extract details in JSON format.
    
    Valid Categories: [{category_list}]

    Extract:
    - category: (Choose the best match from the list above)
    - amount: (Numeric value, e.g., 9.28)
    - currency: (Usually USD or PAB for Panama)
    - merchant: (Summarize the store name, e.g., "KFC" instead of "PedidosYa*Kfc Transist")
    - date: (ISO format YYYY-MM-DD if found)
    - confidence: (Float 0.0 to 1.0)

    Snippet: "{snippet}"

    Respond ONLY with valid JSON.
    """
    
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system", 
                "content": "You are an expert financial assistant specialized in Panamanian commerce and Spanish banking notifications. You clean up messy merchant names and extract structured data."
            },
            {"role": "user", "content": prompt}
        ],
        response_format={ "type": "json_object" }
    )
    content = response.choices[0].message.content
    # Use Pydantic to validate the shape (Feature: Bulletproof)
    return TransactionResponse.model_validate_json(content)

def get_embedding(text):
    """
    Generates a 384-dimension embedding using the local LLM server.
    Ensures the output is the correct size.
    """
    try:
        # Most local servers (Ollama, LM Studio) use this endpoint for embeddings
        response = client.embeddings.create(
            model=os.getenv("EMBEDDING_MODEL", "all-minilm"), # or your choice
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"⚠️ Failed to generate embedding: {e}")
        return None

def is_duplicate(merchant, amount, transaction_date):
    """Checks if a matching transaction already exists in the DB."""
    if not transaction_date:
        return False
    with Session(engine) as session:
        statement = select(Transaction).where(
            and_(
                Transaction.merchant == merchant,
                Transaction.amount == amount,
                Transaction.transaction_date == transaction_date
            )
        )
        results = session.exec(statement).first()
        return results is not None

def process_message(message_json, category_map):
    """Logic to process a single message from the queue."""
    try:
        data = json.loads(message_json)
        tx_id = data.get("id")
        snippet = data.get("snippet")
        
        if not tx_id or not snippet:
            logger.warning(f"[yellow]Invalid message format, skipping: {tx_id}[/yellow]")
            return True 
            
        logger.info(f"🔍 [bold blue]Processing:[/bold blue] {tx_id}")
        
        with Session(engine) as session:
            if session.get(Transaction, tx_id):
                logger.info(f"✅ [dim]ID {tx_id} already exists, skipping.[/dim]")
                return True
        
        # Categorize
        extracted = categorize_transaction_with_retry(snippet, category_map)
        
        if extracted:
            cat_name = extracted.category
            mch = extracted.merchant
            amt = extracted.amount
            curr = extracted.currency
            dt_str = extracted.date
            tx_dt = datetime.fromisoformat(dt_str) if dt_str else None

            # DUPLICATE DETECTION (Feature 4)
            if is_duplicate(mch, amt, tx_dt):
                logger.warning(f"⚠️  [orange3]Duplicate transaction detected. Skipping...[/orange3]")
                return True

            conf = extracted.confidence
            conf_color = "green" if conf > 0.8 else "yellow" if conf > 0.5 else "red"

            # Generate embedding for the snippet (Feature: Vector search)
            emb = get_embedding(snippet)

            with Session(engine) as session:
                transaction = Transaction(
                    id=tx_id,
                    merchant=mch,
                    amount=amt,
                    currency=curr,
                    category=cat_name,
                    transaction_date=tx_dt,
                    raw_snippet=snippet,
                    confidence_score=conf,
                    embedding=emb
                )
                session.add(transaction)
                session.commit()
                
                # Visual Feedback
                table = Table(title=f"New Transaction: {tx_id}", show_header=False, border_style="green")
                table.add_row("Merchant", mch)
                table.add_row("Amount", f"{amt} {curr}")
                table.add_row("Category", f"{cat_name}")
                table.add_row("Date", str(tx_dt))
                table.add_row("Confidence", f"[{conf_color}]{conf:.2f}[/{conf_color}]")
                table.add_row("Vectorized", "[green]YES[/green]" if emb else "[red]NO[/red]")
                console.print(table)
                
        return True
    except json.JSONDecodeError:
        logger.error("❌ [red]Failed to decode JSON from queue[/red]")
        return True # Remove malformed trash
    except Exception as e:
        logger.exception(f"❌ [red]Error processing transaction:[/red] {e}")
        return False # Stay in processing for retry or DLQ

def process_queue():
    console.print(Panel.fit("[bold green]Fintrack AI Worker v2.0[/bold green]", subtitle="Queue & LLM Processor"))
    logger.info(f"📡 Queue: [cyan]{REDIS_QUEUE}[/cyan] | Memory Cache Enabled")
    
    # 0. Cache setup
    category_map = {}
    last_category_refresh = 0
    REFRESH_INTERVAL = 600 # 10 minutes

    def refresh_categories():
        nonlocal category_map, last_category_refresh
        logger.info("📑 Refreshing categories from database...")
        category_map = get_valid_categories()
        last_category_refresh = time.time()
    
    # Initial fetch
    refresh_categories()
    
    if not category_map:
        logger.warning("No categories found in database!")

    # 1. Recovery on startup
    while True:
        orphaned = r.lindex(PROCESSING_QUEUE, -1)
        if not orphaned:
            break
        
        if not is_llm_host_reachable():
            logger.warning("🖥️  Desktop is offline. Waiting to recover...")
            time.sleep(60)
            continue

        logger.info("Recovering orphaned message from processing queue...")
        if process_message(orphaned, category_map):
            r.lrem(PROCESSING_QUEUE, 0, orphaned)
        else:
            # DEAD LETTER QUEUE (Feature 1)
            logger.error(f"💀 [bold red]Moving unrecoverable message to DLQ:[/bold red] {orphaned[:50]}...")
            r.rpush(DLQ_QUEUE, orphaned)
            r.lrem(PROCESSING_QUEUE, 0, orphaned)

    while True:
        try:
            # Auto-refresh cache if expired
            if time.time() - last_category_refresh > REFRESH_INTERVAL:
                refresh_categories()

            # Atomic move from main queue to processing queue
            message_json = r.brpoplpush(REDIS_QUEUE, PROCESSING_QUEUE, timeout=30)
            
            if not message_json:
                continue
            
            # **NETWORK AWARENESS CHECK**
            while not is_llm_host_reachable():
                logger.warning("💤 [yellow]Desktop offline. Sleeping for 5 minutes...[/yellow]")
                time.sleep(300) 
            
            # Process and handle DLQ
            # If process_message returns False twice, we DLQ it.
            if process_message(message_json, category_map):
                r.lrem(PROCESSING_QUEUE, 0, message_json)
            else:
                # If first time fails, try once more, then DLQ
                logger.warning("🔄 [yellow]Retrying once before DLQ...[/yellow]")
                if process_message(message_json, category_map):
                    r.lrem(PROCESSING_QUEUE, 0, message_json)
                else:
                    logger.error("💀 [bold red]Failing consistently. Moving to Dead Letter Queue.[/bold red]")
                    r.rpush(DLQ_QUEUE, message_json)
                    r.lrem(PROCESSING_QUEUE, 0, message_json)
            
        except Exception as e:
            logger.error(f"🔥 Critical loop error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    process_queue()
