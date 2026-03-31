from openai import OpenAI
from dotenv import load_dotenv
import os, json, re
from rag import retrieve_relevant_rules

load_dotenv()

def _get_llm_client() -> OpenAI:
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Missing GROQ_API_KEY in environment. Add it to .env before analyzing documents."
        )

    return OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )

SYSTEM_PROMPT = """You are a senior financial compliance officer and chartered accountant 
with 20 years of experience in Indian corporate finance, GST regulations, and expense management.

Your job is to audit financial documents and give FAIR, ACCURATE decisions.

IMPORTANT: You must be balanced — not too strict, not too lenient.
- A legitimate invoice from a known vendor with proper details SHOULD be Approved
- Only flag genuine problems, not minor OCR issues
- A missing field due to poor image quality is different from a genuinely missing field

YOUR DECISION CRITERIA:

APPROVED — when ALL of these are true:
  - Document has a recognizable vendor/business name
  - Amount is clearly present and reasonable
  - Amount is below Rs.10,000
  - No obvious fraud or compliance violations
  - GST present OR amount is small enough (under Rs.1000)

NEEDS REVIEW — when ANY of these apply:
  - Amount is between Rs.10,000 and Rs.50,000 (needs manager approval)
  - GST number completely absent on invoice above Rs.5000
  - Vendor is completely unrecognizable
  - Document partially readable but key fields missing

REJECTED — only when these are true:
  - Document text is completely empty or unreadable
  - Amount is above Rs.50,000 (needs finance head approval)
  - Document is obviously not a financial document at all

Your reasoning must be 7-8 sentences covering:
1. What the document is and what it contains
2. Which fields were found and verified
3. Which fields are missing and why that matters
4. Which accounting rule applies to this case
5. GST compliance status assessment
6. Risk assessment with specific reasons
7. Final decision with clear justification
8. Recommended next action for the accounts team"""


def validate_gstin(gstin: str) -> bool:
    if not gstin:
        return False
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    return bool(re.match(pattern, str(gstin).strip().upper()))


def build_flags(fields: dict) -> list:
    """Smart compliance flags — distinguishes real issues from OCR limitations."""
    flags = []
    amount      = float(fields.get('amount', 0) or 0)
    vendor      = str(fields.get('vendor', '') or '')
    gst_number  = str(fields.get('gst_number', '') or '')
    invoice_num = str(fields.get('invoice_number', '') or '')
    raw_text    = str(fields.get('raw_text', '') or '')

    text_len = len(raw_text.strip())

    # Text quality
    if text_len < 15:
        flags.append("✗ [CRITICAL] Document is unreadable — OCR extracted no usable text")
    elif text_len < 80:
        flags.append("⚠ [WARNING] Limited text extracted — image quality may be poor")
    else:
        flags.append("✓ [OK] Document text successfully extracted by OCR")

    # Amount
    if amount == 0:
        flags.append("⚠ [WARNING] Invoice amount not detected — check image quality")
    elif amount > 50000:
        flags.append(f"✗ [CRITICAL] Amount Rs.{amount:,.0f} exceeds Rs.50,000 limit — Finance Head approval mandatory")
    elif amount > 10000:
        flags.append(f"⚠ [WARNING] Amount Rs.{amount:,.0f} above Rs.10,000 — Manager approval required")
    elif amount > 5000:
        flags.append(f"ℹ [INFO] Amount Rs.{amount:,.0f} — standard business expense, verify GST")
    else:
        flags.append(f"✓ [OK] Amount Rs.{amount:,.0f} is within auto-approval limit")

    # GST
    if gst_number and gst_number not in ['', 'None', 'N/A']:
        if validate_gstin(gst_number):
            flags.append(f"✓ [OK] Valid GSTIN detected: {gst_number}")
        else:
            flags.append(f"⚠ [WARNING] GST number found but format is invalid: {gst_number} — verify with vendor")
    else:
        if amount > 5000:
            flags.append("⚠ [WARNING] No GST number found — required for B2B transactions above Rs.5,000")
        elif amount > 1000:
            flags.append("ℹ [INFO] No GST number — acceptable for small purchases but should be collected")
        else:
            flags.append("✓ [OK] GST not required for transactions below Rs.1,000")

    # Invoice number
    if invoice_num and invoice_num not in ['', 'None', 'N/A']:
        flags.append(f"✓ [OK] Invoice reference number present: {invoice_num}")
    else:
        flags.append("ℹ [INFO] Invoice number not detected — may affect audit trail")

    # Vendor
    if vendor and len(vendor) > 2 and vendor.lower() not in ['unknown', 'n/a', 'none']:
        flags.append(f"✓ [OK] Vendor identified: {vendor}")
    else:
        flags.append("⚠ [WARNING] Vendor name not clearly identified in document")

    return flags


def analyze_document(extracted_fields: dict) -> dict:
    amount      = float(extracted_fields.get('amount', 0) or 0)
    vendor      = str(extracted_fields.get('vendor', 'Unknown') or 'Unknown')
    gst_number  = extracted_fields.get('gst_number', None)
    invoice_num = extracted_fields.get('invoice_number', None)
    raw_text    = str(extracted_fields.get('raw_text', '') or '')

    # Hard reject: completely unreadable document
    if not raw_text or len(raw_text.strip()) < 15:
        return {
            "category": "Unknown",
            "decision": "Rejected",
            "risk_level": "High",
            "confidence": 97,
            "reasoning": (
                "This document was submitted for financial audit review but the OCR engine was completely unable to extract readable text from it. "
                "This critical failure means none of the required fields — vendor name, invoice amount, GST number, or invoice reference — could be verified. "
                "Without these fields, it is impossible to assess compliance with GST regulations, expense policy, or vendor authorization rules. "
                "Under standard accounting controls, any document that cannot be read or verified must be automatically rejected to prevent fraudulent claims. "
                "The risk level is rated High because an unreadable document cannot be distinguished from a fabricated or tampered one. "
                "The confidence in this Rejected decision is 97% as the absence of readable content leaves virtually no room for alternative interpretation. "
                "The accounts team should contact the vendor to obtain a fresh, clear copy of the invoice — preferably a digital PDF directly from their billing system. "
                "Recommended action: Re-upload at minimum 300 DPI resolution with proper lighting, or request the vendor to email a PDF invoice directly."
            )
        }

    # Build flags and retrieve rules
    flags = build_flags(extracted_fields)
    flags_text = "\n".join([f"  {f}" for f in flags])

    query = f"expense approval invoice compliance GST rules amount {amount} vendor payment"
    relevant_rules = retrieve_relevant_rules(query)
    rules_text = "\n".join([f"  • {r}" for r in relevant_rules])

    user_prompt = f"""
FINANCIAL DOCUMENT COMPLIANCE AUDIT REPORT
============================================

EXTRACTED INVOICE DATA:
  • Vendor Name    : {vendor}
  • Invoice Amount : Rs. {amount:,.2f}
  • GST Number     : {gst_number or 'NOT DETECTED'}
  • Invoice Number : {invoice_num or 'NOT DETECTED'}
  • Text Quality   : {len(raw_text)} characters extracted

DOCUMENT TEXT PREVIEW:
{raw_text[:500] if raw_text else '[NO TEXT]'}

AUTOMATED COMPLIANCE FLAGS:
{flags_text}

APPLICABLE ACCOUNTING RULES (retrieved via RAG):
{rules_text}

DECISION GUIDELINES TO FOLLOW:
  → Rs.0–999 any vendor              : Approved (petty cash, GST not required)
  → Rs.1000–4999 with GST            : Approved (standard compliant invoice)
  → Rs.1000–4999 without GST         : Approved if vendor is recognizable, else Needs Review
  → Rs.5000–9999 with valid GST      : Approved (normal business expense)
  → Rs.5000–9999 without GST         : Needs Review (non-compliant, needs clarification)
  → Rs.10000–49999                   : Needs Review (manager must sign off)
  → Rs.50000+                        : Rejected (board/finance head approval process)
  → Unreadable document              : Rejected (cannot verify anything)

FAIRNESS RULE: If the invoice looks legitimate — has a real vendor name, a clear amount, 
and a reference number — and the amount is under Rs.10,000 with GST present, it should be 
Approved. Do not penalize legitimate invoices for minor OCR gaps like partial addresses.

Write exactly 7-8 sentences as a professional audit report covering all 8 required points,
then give your JSON decision.

RESPOND ONLY with this JSON — no markdown, no backticks, no extra text before or after:
{{
  "category": "Office Supplies / Travel / Meals / Software / Equipment / Professional Services / Medical / Utilities / Other",
  "decision": "Approved / Rejected / Needs Review",
  "risk_level": "Low / Medium / High",
  "confidence": <integer 55-98>,
  "reasoning": "<exactly 7-8 professional sentences covering: document summary, verified fields, missing fields, applicable rule, GST compliance, risk level reasoning, decision justification, next action>"
}}"""

    client = _get_llm_client()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt}
        ],
        temperature=0.1,
        max_tokens=1200
    )

    result_text = response.choices[0].message.content.strip()

    # Clean any markdown wrapping
    if "```" in result_text:
        for part in result_text.split("```"):
            part = part.strip().lstrip("json").strip()
            if part.startswith("{"):
                result_text = part
                break

    result = json.loads(result_text.strip())

    # ── Post-processing hard rules (override LLM only for clear violations) ──

    # Rule 1: Amount above 50k = always Rejected
    if amount > 50000:
        result['decision']   = 'Rejected'
        result['risk_level'] = 'High'

    # Rule 2: Amount 10k–50k = minimum Needs Review (can't be auto-Approved)
    elif amount > 10000 and result['decision'] == 'Approved':
        result['decision']   = 'Needs Review'
        if result['risk_level'] == 'Low':
            result['risk_level'] = 'Medium'

    # Rule 3: Above 5k with no GST = Needs Review (not outright Reject)
    elif amount > 5000 and not gst_number and result['decision'] == 'Approved':
        result['decision']   = 'Needs Review'

    # Rule 4: Small amounts from any recognizable vendor = let Approved stand
    # (don't interfere — trust the LLM for amounts under 5k)

    return result