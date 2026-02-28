import httpx

from app.config import settings


async def embed_texts(texts: list[str], prefix: str = "search_document: ") -> list[list[float]]:
    """Embed a batch of texts via Ollama. Adds the nomic-embed-text task prefix."""
    embeddings = []
    async with httpx.AsyncClient(timeout=120) as client:
        for text in texts:
            resp = await client.post(
                f"{settings.ollama_url}/api/embeddings",
                json={"model": settings.embedding_model, "prompt": prefix + text},
            )
            resp.raise_for_status()
            embeddings.append(resp.json()["embedding"])
    return embeddings


async def embed_query(text: str) -> list[float]:
    """Embed a single query text with the search_query prefix."""
    result = await embed_texts([text], prefix="search_query: ")
    return result[0]
