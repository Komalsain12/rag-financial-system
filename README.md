# RAG-Based Expert Decision System for Financial Document Analysis

An AI-powered system that analyzes financial documents using 
Retrieval-Augmented Generation (RAG) to provide explainable decisions.

## Tech Stack
- Frontend: React
- Backend: FastAPI (Python)
- AI: Groq LLM + FAISS Vector Search
- Database: PostgreSQL

## Setup Instructions

### Backend
```bash
cd backend
py -3.11 -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn python-multipart sqlalchemy psycopg2-binary pillow pytesseract openai faiss-cpu numpy sentence-transformers python-dotenv
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure
```
rag-financial-system/
├── backend/
│   ├── main.py
│   ├── ocr.py
│   ├── rag.py
│   ├── decision_engine.py
│   ├── database.py
│   └── evaluate.py
├── frontend/
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── Upload.jsx
│           └── DecisionPanel.jsx
└── knowledge_base/
    └── accounting_rules.txt
```
