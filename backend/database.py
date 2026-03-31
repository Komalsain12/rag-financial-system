from sqlalchemy import create_engine, Column, String, Float, Text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./rag_financial.db")
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True)
    file_name = Column(String)

class Decision(Base):
    __tablename__ = "decisions"
    id = Column(String, primary_key=True)
    document_id = Column(String)
    category = Column(String)
    decision = Column(String)
    risk_level = Column(String)
    confidence = Column(Float)
    reasoning = Column(Text)

Base.metadata.create_all(engine)
print("Database tables created!")