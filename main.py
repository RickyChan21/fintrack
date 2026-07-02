import os
import json
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, create_engine, select
from dotenv import load_dotenv

from models import Transaction

load_dotenv()

app = FastAPI(title="Fintrack")

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    with Session(engine) as session:
        statement = select(Transaction).order_by(Transaction.transaction_date.desc())
        transactions = session.exec(statement).all()

    tx_list = []
    cat_totals = {}
    total_spent = 0.0

    for tx in transactions:
        total_spent += tx.amount
        if tx.category:
            cat_totals[tx.category] = cat_totals.get(tx.category, 0) + tx.amount

        tx_list.append({
            "id": tx.id,
            "merchant": tx.merchant,
            "amount": tx.amount,
            "currency": tx.currency,
            "category": tx.category,
            "bank": tx.bank,
            "type": tx.transaction_type,
            "date": tx.transaction_date.strftime("%b %d, %Y") if tx.transaction_date else None,
            "confidence": round(tx.confidence_score, 2) if tx.confidence_score else None,
        })

    top_category = max(cat_totals, key=cat_totals.get) if cat_totals else "N/A"

    return templates.TemplateResponse("index.html", {
        "request": request,
        "transactions": json.dumps(tx_list),
        "transactions_list": tx_list,
        "total_spent": round(total_spent, 2),
        "tx_count": len(tx_list),
        "top_category": top_category,
    })
