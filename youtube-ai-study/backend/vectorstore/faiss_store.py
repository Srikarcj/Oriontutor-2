import json
import os
from typing import List, Dict, Tuple

import numpy as np

from backend.config import get_settings


class VectorStoreError(Exception):
    """Raised when vector index operations fail."""


def _paths_for_video(video_id: str) -> Tuple[str, str]:
    """
    Compute paths for a video's embedding matrix (.npy) and metadata (.json).
    """
    settings = get_settings()
    os.makedirs(settings.faiss_root_dir, exist_ok=True)
    index_path = os.path.join(settings.faiss_root_dir, f"{video_id}.npy")
    meta_path = os.path.join(settings.faiss_root_dir, f"{video_id}.json")
    return index_path, meta_path


def save_video_index(video_id: str, embeddings: np.ndarray, chunks: List[Dict]) -> None:
    """
    Persist embeddings + metadata for a single video.

    This implementation uses a simple NumPy-based store instead of FAISS to
    avoid native compilation issues on some platforms. For each video we save:
    - <video_id>.npy: 2D float32 array of embeddings (num_chunks x dim)
    - <video_id>.json: metadata including the original chunk texts.
    """
    if embeddings.size == 0:
        raise VectorStoreError("No embeddings provided to save.")

    index_path, meta_path = _paths_for_video(video_id)
    # Save embeddings
    np.save(index_path, embeddings.astype("float32"))

    # Save metadata
    metadata = {
        "video_id": video_id,
        "chunks": chunks,
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


def load_video_index(video_id: str) -> Tuple[np.ndarray, Dict]:
    """
    Load embeddings matrix and metadata for a given video.
    """
    index_path, meta_path = _paths_for_video(video_id)
    if not (os.path.exists(index_path) and os.path.exists(meta_path)):
        raise VectorStoreError("No index found for this video. Process it first.")

    embeddings = np.load(index_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
    return embeddings, metadata


def _cosine_similarities(query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between a single query vector and all rows in matrix.
    """
    if query.ndim != 1:
        raise ValueError("Query embedding must be a 1D array.")

    # Ensure float32
    query = query.astype("float32")
    matrix = matrix.astype("float32")

    # Normalize
    q_norm = np.linalg.norm(query) + 1e-10
    m_norms = np.linalg.norm(matrix, axis=1) + 1e-10

    sims = (matrix @ query) / (m_norms * q_norm)
    return sims


def search_video_chunks(video_id: str, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict]:
    """
    Run a similarity search for a single query embedding against a video's index.
    Returns a list of chunk metadata dicts with similarity scores (higher is better).
    """
    if query_embedding.ndim == 2:
        # Take first row if a batch is accidentally passed
        query_embedding = query_embedding[0]

    embeddings, metadata = load_video_index(video_id)
    if embeddings.size == 0:
        raise VectorStoreError("Index for this video is empty.")

    sims = _cosine_similarities(query_embedding, embeddings)

    # Get top_k indices by similarity (descending)
    top_k = min(top_k, sims.shape[0])
    top_indices = np.argsort(-sims)[:top_k]

    chunks: List[Dict] = metadata.get("chunks", [])
    results: List[Dict] = []
    for rank, idx in enumerate(top_indices):
        if idx < 0 or idx >= len(chunks):
            continue
        chunk_meta = chunks[idx].copy()
        chunk_meta["score"] = float(sims[idx])
        chunk_meta["rank"] = int(rank)
        results.append(chunk_meta)

    return results


def delete_video_index(video_id: str) -> None:
    index_path, meta_path = _paths_for_video(video_id)
    for path in (index_path, meta_path):
        if os.path.exists(path):
            os.remove(path)

