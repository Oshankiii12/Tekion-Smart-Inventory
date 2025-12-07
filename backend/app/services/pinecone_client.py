from typing import List, Dict, Any
from pinecone import Pinecone, ServerlessSpec
from app.config import get_settings

settings = get_settings()

pc = Pinecone(api_key=settings.PINECONE_API_KEY)


def get_or_create_index():
    """
    Get the Pinecone index. If it doesn't exist (in dev),
    try to create it with the appropriate dimension.
    """
    index_name = settings.pinecone_index_name

    existing_indexes = [idx["name"] for idx in pc.list_indexes()]

    if index_name not in existing_indexes:
        
        pc.create_index(
            name=index_name,
            dimension=3072,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region=settings.pinecone_environment
            )
        )

    return pc.Index(index_name)


def upsert_vectors(vectors: List[Dict[str, Any]]):
    """
    Upsert a batch of vectors into Pinecone.
    vectors: list of dicts with { 'id', 'values', 'metadata' }
    """
    index = get_or_create_index()
    index.upsert(vectors=vectors)


def query_similar(
    query_vector: List[float],
    top_k: int = 10,
    filter_obj: Dict[str, Any] | None = None
) -> List[Dict[str, Any]]:
    """
    Query Pinecone index and return top_k matches with metadata.
    """
    index = get_or_create_index()
    response = index.query(
        vector=query_vector,
        top_k=top_k,
        include_values=False,
        include_metadata=True,
        filter=filter_obj,
    )


    matches = []
    for match in response.matches:
        matches.append(
            {
                "id": match.id,
                "score": match.score,
                "metadata": match.metadata or {}
            }
        )
    return matches
