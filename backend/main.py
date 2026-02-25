from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ocr import extract_text_from_image, extract_fields
from decision_engine import analyze_document
import shutil, uuid, os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RAG Financial System")

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def root():
    return {"status": "RAG System Running"}

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