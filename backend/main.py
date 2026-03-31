from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ocr import extract_text_from_image, extract_fields
from decision_engine import analyze_document
from rag import get_rule_index_status, rebuild_index_from_json_rules
import shutil, uuid, os
from dotenv import load_dotenv
import pytesseract

BASE_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))

app = FastAPI(title="RAG Financial System")

cors_origins = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"status": "RAG System Running"}


@app.get("/health")
def health_check():
    tesseract_available = True
    try:
        _ = pytesseract.get_tesseract_version()
    except Exception:
        tesseract_available = False

    return {
        "status": "ok",
        "groq_key_present": bool(os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")),
        "tesseract_available": tesseract_available,
        "rule_index": get_rule_index_status(),
    }


@app.post("/rules/reindex")
def reindex_rules():
    return rebuild_index_from_json_rules()

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # 1. Save file
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. OCR
    raw_text = extract_text_from_image(file_path)

    # 3. Extract fields
    fields = extract_fields(raw_text)

    # 4. RAG + LLM decision
    decision = analyze_document(fields)

    return {
        "document_id": doc_id,
        "extracted_fields": fields,
        "decision": decision
    }