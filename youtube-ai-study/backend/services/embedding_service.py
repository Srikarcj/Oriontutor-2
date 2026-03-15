from functools import lru_cache
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer


EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache()
def get_embedding_model() -> SentenceTransformer:
    """
    Load the sentence-transformers model once and reuse it across requests.
    """
    return SentenceTransformer(EMBEDDING_MODEL_NAME)


def embed_texts(texts: List[str]) -> np.ndarray:
    """
    Encode a list of texts into a 2D numpy array of embeddings.
    """
    if not texts:
        return np.empty((0, 384), dtype="float32")

    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)
    # Ensure float32 for FAISS
    return embeddings.astype("float32")

