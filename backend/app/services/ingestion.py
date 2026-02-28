import logging

import pymupdf

from app.database import async_session
from app.models.document import Document
from app.services.chunking import chunk_pages
from app.services.embedding import embed_texts
from app.services.vector_store import upsert_chunks

logger = logging.getLogger(__name__)


def extract_pages(filepath: str) -> list[dict]:
    """Extract text from each page of a PDF using PyMuPDF."""
    pages = []
    doc = pymupdf.open(filepath)
    for i, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            pages.append({"page": i + 1, "text": text})
    doc.close()
    return pages


async def ingest_document(doc_id: str):
    """Run the full ingestion pipeline for a document."""
    async with async_session() as db:
        doc = await db.get(Document, doc_id)
        if not doc:
            logger.error(f"Document {doc_id} not found")
            return

        try:
            doc.status = "processing"
            await db.commit()

            # Extract text
            pages = extract_pages(doc.filepath)
            doc.page_count = len(pages)

            if not pages:
                doc.status = "completed"
                await db.commit()
                return

            # Chunk
            chunks = chunk_pages(pages)
            if not chunks:
                doc.status = "completed"
                await db.commit()
                return

            # Embed
            chunk_texts = [c.text for c in chunks]
            embeddings = await embed_texts(chunk_texts)

            # Store in Qdrant
            chunk_dicts = [{"text": c.text, "page_numbers": c.page_numbers, "chunk_index": c.chunk_index} for c in chunks]
            upsert_chunks(
                case_id=doc.case_id,
                document_id=doc.id,
                document_name=doc.filename,
                chunks=chunk_dicts,
                embeddings=embeddings,
            )

            doc.status = "completed"
            await db.commit()
            logger.info(f"Ingested document {doc.filename}: {len(chunks)} chunks")

        except Exception as e:
            logger.exception(f"Ingestion failed for {doc_id}")
            doc.status = "failed"
            doc.error_message = str(e)[:500]
            await db.commit()
