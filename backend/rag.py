import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import json, os

model = SentenceTransformer('all-MiniLM-L6-v2')

# File paths to store the index and rules on disk
INDEX_PATH = os.path.join(os.path.dirname(__file__), 'faiss_index.bin')
RULES_PATH = os.path.join(os.path.dirname(__file__), 'rules_store.json')

def load_knowledge_base(file_path: str):
    """Load rules from .txt file and save to FAISS index"""
    with open(file_path, encoding='utf-8') as f:
        text = f.read()

    # One rule per line, skip blank lines and comments
    chunks = [line.strip() for line in text.split('\n')
              if line.strip() and not line.startswith('#')]

    # Create embeddings
    embeddings = model.encode(chunks).astype('float32')

    # Build FAISS index
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    # Save index and rules to disk
    faiss.write_index(index, INDEX_PATH)
    with open(RULES_PATH, 'w', encoding='utf-8') as f:
        json.dump(chunks, f)

    print(f"Loaded {len(chunks)} rules into FAISS index")

def retrieve_relevant_rules(query: str, top_k: int = 5) -> list:
    """Find most relevant rules for a given query"""
    # Load saved index and rules
    index = faiss.read_index(INDEX_PATH)
    with open(RULES_PATH, encoding='utf-8') as f:
        chunks = json.load(f)

    # Search
    query_embedding = model.encode([query]).astype('float32')
    distances, indices = index.search(query_embedding, top_k)

    return [chunks[i] for i in indices[0] if i < len(chunks)]