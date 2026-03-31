import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import json, os, hashlib

EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2'
model = SentenceTransformer(EMBEDDING_MODEL_NAME)

# File paths to store the index and rules directory on disk
INDEX_PATH = os.path.join(os.path.dirname(__file__), 'faiss_index.bin')
INDEX_META_PATH = os.path.join(os.path.dirname(__file__), 'faiss_index_meta.json')
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
                        chunks.append(json.dumps(item, ensure_ascii=False, sort_keys=True))

            elif isinstance(data, dict):
                # Common pattern: { "rules": [ ... ] }
                if 'rules' in data and isinstance(data['rules'], list):
                    for item in data['rules']:
                        if isinstance(item, str):
                            chunks.append(item.strip())
                        else:
                            chunks.append(json.dumps(item, ensure_ascii=False, sort_keys=True))
                else:
                    # Fall back: store full dict as one retrievable rule chunk
                    chunks.append(json.dumps(data, ensure_ascii=False, sort_keys=True))

            elif isinstance(data, str):
                chunks.append(data.strip())

        except Exception as e:
            print(f"Warning: failed to load {path}: {e}")

    # Filter out empty lines and comment-like entries
    chunks = [c for c in chunks if c and not c.startswith('#')]
    return chunks


def _compute_rules_hash(chunks: list) -> str:
    payload = "\n<<RULE>>\n".join(chunks)
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def _read_index_meta() -> dict:
    if not os.path.exists(INDEX_META_PATH):
        return {}
    try:
        with open(INDEX_META_PATH, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def _write_index_meta(chunks: list):
    meta = {
        'rules_hash': _compute_rules_hash(chunks),
        'rules_count': len(chunks),
        'embedding_model': EMBEDDING_MODEL_NAME,
    }
    with open(INDEX_META_PATH, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


def build_index_from_rules(chunks: list):
    """Create a FAISS index from a list of rule strings and save it to disk."""
    if not chunks:
        raise ValueError('No rules provided to build index')

    embeddings = model.encode(chunks).astype('float32')
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    faiss.write_index(index, INDEX_PATH)
    _write_index_meta(chunks)
    print(f"Built FAISS index with {len(chunks)} rules")
    return index


def rebuild_index_from_json_rules() -> dict:
    chunks = load_rules_from_json_dir()
    if not chunks:
        return {'ok': False, 'message': 'No JSON rules found', 'rules_count': 0}

    build_index_from_rules(chunks)
    return {
        'ok': True,
        'message': 'FAISS index rebuilt from JSON rules',
        'rules_count': len(chunks),
        'rules_hash': _compute_rules_hash(chunks),
    }


def get_rule_index_status() -> dict:
    chunks = load_rules_from_json_dir()
    chunk_count = len(chunks)
    rules_hash = _compute_rules_hash(chunks) if chunks else None
    meta = _read_index_meta()

    index_exists = os.path.exists(INDEX_PATH)
    ntotal = None
    if index_exists:
        try:
            ntotal = faiss.read_index(INDEX_PATH).ntotal
        except Exception:
            ntotal = None

    meta_matches = (
        bool(meta)
        and meta.get('rules_hash') == rules_hash
        and meta.get('rules_count') == chunk_count
        and meta.get('embedding_model') == EMBEDDING_MODEL_NAME
    )

    return {
        'rules_count': chunk_count,
        'rules_hash': rules_hash,
        'index_exists': index_exists,
        'index_ntotal': ntotal,
        'index_meta': meta,
        'needs_rebuild': not (index_exists and ntotal == chunk_count and meta_matches),
    }


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

    # Ensure FAISS index exists and matches current rule corpus.
    need_rebuild = False
    current_hash = _compute_rules_hash(chunks)
    meta = _read_index_meta()
    meta_matches = (
        bool(meta)
        and meta.get('rules_hash') == current_hash
        and meta.get('rules_count') == len(chunks)
        and meta.get('embedding_model') == EMBEDDING_MODEL_NAME
    )

    try:
        index = faiss.read_index(INDEX_PATH)
        # some FAISS indices expose ntotal
        if hasattr(index, 'ntotal') and index.ntotal != len(chunks):
            need_rebuild = True
    except Exception:
        need_rebuild = True

    if not meta_matches:
        need_rebuild = True

    if need_rebuild:
        try:
            index = build_index_from_rules(chunks)
        except Exception as e:
            print(f"Failed to build FAISS index: {e}")
            return []

    # Search
    top_k = max(1, min(top_k, len(chunks)))
    query_embedding = model.encode([query]).astype('float32')
    distances, indices = index.search(query_embedding, top_k)

    return [chunks[i] for i in indices[0] if 0 <= i < len(chunks)]