from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session, Column
from pgvector.sqlalchemy import Vector

class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"
    id: str = Field(primary_key=True)
    merchant: str
    amount: float
    currency: str = Field(default="USD")
    category: Optional[str] = None # Switched back to TEXT as per latest SQL
    transaction_date: Optional[datetime] = None
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    raw_snippet: Optional[str] = None
    confidence_score: Optional[float] = None
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(384)))

class TransactionResponse(SQLModel):
    category: str
    amount: float
    currency: str = "USD"
    merchant: str
    date: Optional[str] = None
    confidence: float = 0.0

def create_db_and_tables(engine):
    SQLModel.metadata.create_all(engine)
