import pandas as pd
from sklearn.metrics import accuracy_score, classification_report
from decision_engine import analyze_document
from openai import OpenAI
from dotenv import load_dotenv
import os, json, time

load_dotenv()

# LLM-only client (same Groq, but no RAG rules injected)
llm_client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

def llm_only_decision(fields: dict) -> str:
    """LLM decision WITHOUT RAG — baseline comparison"""
    prompt = f"""
You are an accountant. Given this invoice data:
{json.dumps(fields, indent=2)}

Decide: Approved, Rejected, or Needs Review.
Respond ONLY with JSON: {{"decision": "Approved/Rejected/Needs Review"}}"""
    
    response = llm_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1
    )
    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())["decision"]

# Load test data
df = pd.read_csv('test_invoices.csv')
total = len(df)
rag_preds = []
llm_preds = []

print(f"\nRunning comparison on {total} invoices...\n")
print(f"{'#':<5} {'Vendor':<20} {'Amount':<8} {'GST':<6} {'Truth':<14} {'RAG+LLM':<14} {'LLM Only'}")
print("-" * 80)

for i, (_, row) in enumerate(df.iterrows()):
    fields = {
        'vendor': row['vendor'],
        'amount': int(row['amount']),
        'has_gst': bool(row['has_gst'])
    }
    truth = row['correct_decision']

    try:
        # RAG + LLM prediction
        rag_result = analyze_document(fields)
        rag_pred = rag_result['decision']
    except Exception as e:
        rag_pred = "Error"

    time.sleep(0.3)

    try:
        # LLM only prediction
        llm_pred = llm_only_decision(fields)
    except Exception as e:
        llm_pred = "Error"

    rag_preds.append(rag_pred)
    llm_preds.append(llm_pred)

    print(f"{i+1:<5} {row['vendor']:<20} {row['amount']:<8} {str(row['has_gst']):<6} {truth:<14} {rag_pred:<14} {llm_pred}")
    time.sleep(0.3)

# Calculate results
ground_truth = df['correct_decision'].tolist()

rag_valid  = [(p,g) for p,g in zip(rag_preds, ground_truth) if p != "Error"]
llm_valid  = [(p,g) for p,g in zip(llm_preds, ground_truth) if p != "Error"]

rag_acc = accuracy_score([g for _,g in rag_valid], [p for p,_ in rag_valid])
llm_acc = accuracy_score([g for _,g in llm_valid], [p for p,_ in llm_valid])

print(f"\n{'='*60}")
print(f"  FINAL RESULTS — This goes in your research paper!")
print(f"{'='*60}")
print(f"  LLM Only Accuracy  : {llm_acc:.2%}")
print(f"  RAG + LLM Accuracy : {rag_acc:.2%}")
print(f"  Improvement        : +{(rag_acc - llm_acc)*100:.1f}%")
print(f"{'='*60}")

print(f"\nRAG + LLM Detailed Report:")
print(classification_report(
    [g for _,g in rag_valid],
    [p for p,_ in rag_valid],
    zero_division=0
))

print(f"LLM Only Detailed Report:")
print(classification_report(
    [g for _,g in llm_valid],
    [p for p,_ in llm_valid],
    zero_division=0
))

# Save results to CSV for your paper
results_df = pd.DataFrame({
    'invoice_id': df['invoice_id'],
    'ground_truth': ground_truth,
    'rag_prediction': rag_preds,
    'llm_prediction': llm_preds
})
results_df.to_csv('evaluation_results.csv', index=False)
print(f"\nFull results saved to evaluation_results.csv")