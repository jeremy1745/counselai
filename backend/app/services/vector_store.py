import uuid

from qdrant_client import QdrantClient, models

from app.config import settings

client = QdrantClient(url=settings.qdrant_url)

VECTOR_SIZE = 768  # nomic-embed-text dimension


async def init_collection():
    collections = client.get_collections().collections
    names = [c.name for c in collections]
    if settings.qdrant_collection not in names:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE, distance=models.Distance.COSINE
            ),
        )


def upsert_chunks(
    case_id: str,
    document_id: str,
    document_name: str,
    chunks: list[dict],
    embeddings: list[list[float]],
):
    """Store chunk embeddings in Qdrant with metadata."""
    points = []
    for chunk, embedding in zip(chunks, embeddings):
        points.append(
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "case_id": case_id,
                    "document_id": document_id,
                    "document_name": document_name,
                    "chunk_index": chunk["chunk_index"],
                    "page_numbers": chunk["page_numbers"],
                    "text": chunk["text"],
                },
            )
        )
    client.upsert(collection_name=settings.qdrant_collection, points=points)


def search_chunks(case_id: str, query_embedding: list[float], top_k: int | None = None) -> list[dict]:
    """Search for relevant chunks filtered by case_id."""
    results = client.query_points(
        collection_name=settings.qdrant_collection,
        query=query_embedding,
        query_filter=models.Filter(
            must=[models.FieldCondition(key="case_id", match=models.MatchValue(value=case_id))]
        ),
        limit=top_k or settings.top_k,
        with_payload=True,
    )
    return [
        {
            "score": point.score,
            "text": point.payload["text"],
            "document_id": point.payload["document_id"],
            "document_name": point.payload["document_name"],
            "page_numbers": point.payload["page_numbers"],
            "chunk_index": point.payload["chunk_index"],
        }
        for point in results.points
    ]


def delete_document_vectors(document_id: str):
    """Delete all vectors for a given document."""
    client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id))]
            )
        ),
    )
