from openai import OpenAI
from dotenv import load_dotenv
import os, json
from rag import retrieve_relevant_rules

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

SYSTEM_PROMPT = """You are a senior accountant with 20 years of experience
in Indian financial compliance, GST regulations, and expense management.
You make precise, explainable decisions based only on the accounting rules provided."""

def analyze_document(extracted_fields: dict) -> dict:
    amount = extracted_fields.get('amount', 0)
    query = f"Rules for expense amount {amount} vendor compliance GST approval"

    relevant_rules = retrieve_relevant_rules(query)
    rules_text = "\n".join([f"- {r}" for r in relevant_rules])

    user_prompt = f"""
Financial Document Data:
{json.dumps(extracted_fields, indent=2)}

Relevant Accounting Rules (retrieved from knowledge base):
{rules_text}

Decision Rules:
- Amount below Rs.1000 = ALWAYS "Approved"
- Amount Rs.1000-5000 with has_gst=True = "Approved"  
- Amount Rs.1000-5000 with has_gst=False = "Needs Review"
- Amount above Rs.5000 = "Needs Review"
- Unknown vendor with high amount = "Needs Review"

Apply these rules strictly to the document data above.

Respond ONLY with valid JSON, no other text, no markdown backticks:
{{
  "category": "Office Supplies / Travel / Meals / Software / Equipment",
  "decision": "Approved / Rejected / Needs Review",
  "risk_level": "Low / Medium / High",
  "confidence": 85,
  "reasoning": "Brief explanation of which rule was applied"
}}"""

   
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.1
    )

    result_text = response.choices[0].message.content

    # Clean up in case model adds markdown backticks
    result_text = result_text.strip()
    if result_text.startswith("```"):
        result_text = result_text.split("```")[1]
        if result_text.startswith("json"):
            result_text = result_text[4:]

    return json.loads(result_text.strip())