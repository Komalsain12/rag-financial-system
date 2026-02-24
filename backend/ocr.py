import pytesseract
from PIL import Image
import re

# WINDOWS REQUIRED — tell Python where Tesseract is installed
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_image(file_path: str) -> str:
    image = Image.open(file_path)
    text = pytesseract.image_to_string(image)
    return text

def extract_fields(text: str) -> dict:
    fields = {}

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