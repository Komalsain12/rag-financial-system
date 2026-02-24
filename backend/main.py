from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RAG Financial System")

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"])

@app.get("/")
def root():
    return {"status": "RAG System Running"}

from fastapi import UploadFile, File
from ocr import extract_text_from_image, extract_fields
import shutil, uuid, os

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())
    # os.path.join works correctly on Windows (uses backslash)
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    raw_text = extract_text_from_image(file_path)
    fields = extract_fields(raw_text)

    return {
        "document_id": doc_id,
        "extracted_fields": fields
    }

from decision_engine import analyze_document

@app.post("/analyze")
async def full_pipeline(file: UploadFile = File(...)):

    # 1. Save uploaded file
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 2. OCR — read text from the document
    raw_text = extract_text_from_image(file_path)

    # 3. Extract structured financial fields
    fields = extract_fields(raw_text)

    # 4. RAG + LLM — make expert decision
    decision = analyze_document(fields)

    return {
        "document_id": doc_id,
        "extracted_fields": fields,
        "decision": decision
    }