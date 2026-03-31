import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import json, os

model = SentenceTransformer('all-MiniLM-L6-v2')

# File paths to store the index and rules directory on disk
INDEX_PATH = os.path.join(os.path.dirname(__file__), 'faiss_index.bin')
RULES_DIR = os.path.join(os.path.dirname(__file__), 'rules')
# Keep old rules_store path as fallback only (will be removed eventually)
OLD_RULES_PATH = os.path.join(os.path.dirname(__file__), 'rules_store.json')


def load_rules_from_json_dir() -> list:
    """Load and merge all JSON files from the `backend/rules/` directory.

    The loader is forgiving: it accepts a JSON list of strings, a dict
    with a `rules` key, plain dicts, or a single string. Non-string items
    are converted to JSON strings.
    """
    chunks = []
    if not os.path.isdir(RULES_DIR):
        return chunks

    for fname in sorted(os.listdir(RULES_DIR)):
        if not fname.lower().endswith('.json'):
            continue
        path = os.path.join(RULES_DIR, fname)
        try:
            with open(path, encoding='utf-8') as f:
                data = json.load(f)

            if isinstance(data, list):
                for item in data:
                    if isinstance(item, str):
                        chunks.append(item.strip())
                    else:
                        chunks.append(json.dumps(item))

            elif isinstance(data, dict):
                # Common pattern: { "rules": [ ... ] }
                if 'rules' in data and isinstance(data['rules'], list):
                    for item in data['rules']:
                        if isinstance(item, str):
                            chunks.append(item.strip())
                        else:
                            chunks.append(json.dumps(item))
                else:
                    # Fall back: collect string values or stringify others
                    for v in data.values():
                        if isinstance(v, str):
                            chunks.append(v.strip())
                        elif isinstance(v, list):
                            for item in v:
                                if isinstance(item, str):
                                    chunks.append(item.strip())
                                else:
                                    chunks.append(json.dumps(item))
                        else:
                            chunks.append(json.dumps(v))

            elif isinstance(data, str):
                chunks.append(data.strip())

        except Exception as e:
            print(f"Warning: failed to load {path}: {e}")

    # Filter out empty lines and comment-like entries
    chunks = [c for c in chunks if c and not c.startswith('#')]
    return chunks


def build_index_from_rules(chunks: list):
    """Create a FAISS index from a list of rule strings and save it to disk."""
    if not chunks:
        raise ValueError('No rules provided to build index')

    embeddings = model.encode(chunks).astype('float32')
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    faiss.write_index(index, INDEX_PATH)
    print(f"Built FAISS index with {len(chunks)} rules")
    return index


def load_knowledge_base(file_path: str):
    """Load rules from a .txt file (one-per-line) and build the FAISS index.

    This function remains for backwards compatibility with text-based
    rules. For JSON-based rules, use `load_rules_from_json_dir()` and
    `build_index_from_rules()`.
    """
    with open(file_path, encoding='utf-8') as f:
        text = f.read()

    # One rule per line, skip blank lines and comments
    chunks = [line.strip() for line in text.split('\n')
              if line.strip() and not line.startswith('#')]

    build_index_from_rules(chunks)


def retrieve_relevant_rules(query: str, top_k: int = 5) -> list:
    """Find most relevant rules for a given query.

    The function loads the FAISS index from disk and merges rules from
    all JSON files in `backend/rules/` to map indices back to rule text.
    If no JSON rules are present but the legacy `rules_store.json` exists,
    it will fall back to that file once.
    """
    # Load combined rules
    chunks = load_rules_from_json_dir()
    if not chunks and os.path.exists(OLD_RULES_PATH):
        # Backwards compatibility fallback
        try:
            with open(OLD_RULES_PATH, encoding='utf-8') as f:
                chunks = json.load(f)
        except Exception:
            chunks = []

    # If still no chunks, nothing to return
    if not chunks:
        return []

    # Ensure FAISS index exists and matches the number of rules
    need_rebuild = False
    try:
        index = faiss.read_index(INDEX_PATH)
        # some FAISS indices expose ntotal
        if hasattr(index, 'ntotal') and index.ntotal != len(chunks):
            need_rebuild = True
    except Exception:
        need_rebuild = True

    if need_rebuild:
        try:
            index = build_index_from_rules(chunks)
        except Exception as e:
            print(f"Failed to build FAISS index: {e}")
            return []

    # Search
    query_embedding = model.encode([query]).astype('float32')
    distances, indices = index.search(query_embedding, top_k)

    return [chunks[i] for i in indices[0] if i < len(chunks)]