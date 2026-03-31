import pytesseract
from PIL import Image
import re
import os

# Configure Tesseract path only when explicitly provided or on Windows defaults.
_tesseract_from_env = os.getenv("TESSERACT_CMD", "").strip()
if _tesseract_from_env:
    pytesseract.pytesseract.tesseract_cmd = _tesseract_from_env
elif os.name == "nt":
    _default_win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(_default_win_path):
        pytesseract.pytesseract.tesseract_cmd = _default_win_path

def extract_text_from_image(file_path: str) -> str:
    image = Image.open(file_path)
    try:
        text = str(pytesseract.image_to_string(image))
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError(
            "Tesseract OCR binary not found. Install tesseract and set TESSERACT_CMD in .env if needed."
        ) from exc
    return text

def extract_fields(text: str) -> dict[str, object]:
    fields: dict[str, object] = {}

    # Find amount like Rs.4500 or ₹4,500
    amount_match = re.search(r'[₹Rs\.]+\s*([\d,]+)', text)
    if amount_match:
        fields['amount'] = float(amount_match.group(1).replace(',', ''))

    # Find invoice number like INV-1023
    inv_match = re.search(r'INV[-#]?\s*(\w+)', text, re.IGNORECASE)
    if inv_match:
        fields['invoice_number'] = inv_match.group(1)

    # Find GST number (15-char Indian format)
    gst_match = re.search(r'\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]\b', text)
    if gst_match:
        fields['gst_number'] = gst_match.group()

    fields['raw_text'] = text
    return fields