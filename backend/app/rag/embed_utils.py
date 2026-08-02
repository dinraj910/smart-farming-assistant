"""
Wraps the sentence-transformers embedding model as a single reusable object,
loaded once, not per-call.
"""
from sentence_transformers import SentenceTransformer

_model = None

def get_embedding_model():

    global _model
    
    if _model is None:
        print("Loading embedding model (all-MiniLM-L6-v2)...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        return _model

def embed_text(text: str):
    
    model = get_embedding_model()
    
    return model.encode(text).tolist()  





    