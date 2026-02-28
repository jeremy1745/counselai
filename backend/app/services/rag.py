import json
import re
from collections.abc import AsyncIterator

import httpx

from app.config import settings
from app.services.embedding import embed_query
from app.services.vector_store import search_chunks

SYSTEM_PROMPT_TEMPLATE = """You are CAISE, an AI legal research assistant. Answer the user's question based ONLY on the provided source documents. Follow these rules strictly:

1. Only use information from the sources below. If the sources don't contain relevant information, say so.
2. Cite your sources using [Source N] notation inline where N corresponds to the source number.
3. Be precise and thorough in your analysis.
4. Use professional legal language appropriate for an attorney audience.

SOURCES:
{sources}

Remember: cite every factual claim with [Source N]. Do not fabricate information."""


def build_sources_text(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        pages = ", ".join(str(p) for p in chunk["page_numbers"])
        parts.append(f"[Source {i}] (Document: {chunk['document_name']}, Pages: {pages})\n{chunk['text']}")
    return "\n\n".join(parts)


def extract_citations(content: str, chunks: list[dict]) -> list[dict]:
    """Parse [Source N] references from the completed response."""
    refs = set(int(m) for m in re.findall(r'\[Source (\d+)\]', content))
    citations = []
    for ref in sorted(refs):
        if 1 <= ref <= len(chunks):
            chunk = chunks[ref - 1]
            citations.append({
                "source_index": ref,
                "document_name": chunk["document_name"],
                "page_numbers": chunk["page_numbers"],
                "snippet": chunk["text"][:300],
            })
    return citations


async def stream_rag_response(
    case_id: str,
    question: str,
    history: list[dict],
) -> AsyncIterator[str]:
    """
    Full RAG pipeline:
    1. Embed query
    2. Retrieve chunks
    3. Stream LLM response
    4. Yield SSE events
    """
    # 1. Embed the question
    query_embedding = await embed_query(question)

    # 2. Retrieve relevant chunks
    chunks = search_chunks(case_id, query_embedding)

    if not chunks:
        yield f"data: {json.dumps({'type': 'token', 'content': 'No relevant documents found for this case. Please upload documents first.'})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'citations': []})}\n\n"
        return

    # 3. Build prompt
    sources_text = build_sources_text(chunks)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(sources=sources_text)

    messages = [{"role": "system", "content": system_prompt}]
    # Include recent history for context (last 10 messages)
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": question})

    # 4. Stream from Ollama
    full_response = ""
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream(
            "POST",
            f"{settings.ollama_url}/api/chat",
            json={"model": settings.chat_model, "messages": messages, "stream": True},
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                data = json.loads(line)
                if "message" in data and "content" in data["message"]:
                    token = data["message"]["content"]
                    full_response += token
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

    # 5. Extract citations and send final event
    citations = extract_citations(full_response, chunks)
    yield f"data: {json.dumps({'type': 'done', 'content': full_response, 'citations': citations})}\n\n"
