import asyncio
import os
import re

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.case import Case
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services.security_logger import log_document_operation

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)

router = APIRouter(tags=["documents"])


def _validate_uuid(value: str, name: str) -> None:
    if not UUID_RE.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {name} format")


@router.post("/cases/{case_id}/documents", response_model=list[DocumentResponse], status_code=201)
async def upload_documents(
    case_id: str,
    files: list[UploadFile],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_uuid(case_id, "case_id")
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    max_bytes = settings.max_upload_size_mb * 1024 * 1024

    docs = []
    for file in files:
        content = await file.read()
        if not content[:5].startswith(b"%PDF-"):
            raise HTTPException(status_code=400, detail=f"Only PDF files are accepted: {file.filename}")

        if len(content) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_size_mb}MB limit: {file.filename}")

        doc = Document(
            case_id=case_id,
            filename=file.filename,
            filepath="",
            file_size=0,
        )
        db.add(doc)
        await db.flush()

        upload_dir = os.path.join(settings.upload_dir, case_id)
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, f"{doc.id}.pdf")

        with open(filepath, "wb") as f:
            f.write(content)

        doc.filepath = filepath
        doc.file_size = len(content)
        docs.append(doc)

    await db.commit()
    for doc in docs:
        await db.refresh(doc)

    from app.services.ingestion import ingest_document

    for doc in docs:
        log_document_operation(user.email, "upload", case_id, doc.id)
        asyncio.create_task(ingest_document(doc.id))

    return docs


@router.get("/cases/{case_id}/documents", response_model=list[DocumentResponse])
async def list_documents(case_id: str, _user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _validate_uuid(case_id, "case_id")
    result = await db.execute(
        select(Document).where(Document.case_id == case_id).order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/cases/{case_id}/documents/{doc_id}", status_code=204)
async def delete_document(case_id: str, doc_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _validate_uuid(case_id, "case_id")
    _validate_uuid(doc_id, "doc_id")
    doc = await db.get(Document, doc_id)
    if not doc or doc.case_id != case_id:
        raise HTTPException(status_code=404, detail="Document not found")

    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)

    from app.services.vector_store import delete_document_vectors

    delete_document_vectors(doc_id)

    log_document_operation(user.email, "delete", case_id, doc_id)

    await db.delete(doc)
    await db.commit()
