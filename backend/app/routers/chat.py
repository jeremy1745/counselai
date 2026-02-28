import json
import logging
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.case import Case
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.export import generate_markdown, generate_pdf
from app.services.rag import stream_rag_response, extract_citations, embed_query, search_chunks

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


@router.post("/cases/{case_id}/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    case_id: str, body: ConversationCreate, db: AsyncSession = Depends(get_db)
):
    case = await db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    conv = Conversation(case_id=case_id, title=body.title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.get("/cases/{case_id}/conversations", response_model=list[ConversationResponse])
async def list_conversations(case_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).where(Conversation.case_id == case_id).order_by(Conversation.created_at.desc())
    )
    return result.scalars().all()


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageResponse])
async def get_messages(conv_id: str, db: AsyncSession = Depends(get_db)):
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    result = await db.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    # Normalize citations: ensure it's always a list
    response = []
    for msg in messages:
        response.append(MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            role=msg.role,
            content=msg.content,
            citations=msg.citations if isinstance(msg.citations, list) else [],
            created_at=msg.created_at,
        ))
    return response


@router.get("/conversations/{conv_id}/export")
async def export_conversation(
    conv_id: str,
    format: str = Query(..., pattern="^(pdf|markdown)$"),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    case = await db.get(Case, conv.case_id)

    result = await db.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    safe_title = re.sub(r'[^\w\s-]', '', conv.title).strip() or "conversation"

    if format == "pdf":
        data = generate_pdf(conv, case, messages)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
        )

    md = generate_markdown(conv, case, messages)
    return Response(
        content=md.encode(),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.md"'},
    )


@router.post("/conversations/{conv_id}/messages")
async def send_message(conv_id: str, body: MessageCreate, db: AsyncSession = Depends(get_db)):
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    user_msg = Message(conversation_id=conv_id, role="user", content=body.content, citations=[])
    db.add(user_msg)
    await db.commit()

    # Get conversation history
    result = await db.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in messages[:-1]]  # exclude the just-added message

    # We need to save the assistant message after streaming completes.
    # Wrap the generator to capture and save the response.
    async def generate():
        full_content = ""
        citations = []
        async for event in stream_rag_response(conv.case_id, body.content, history):
            yield event
            # Parse the SSE data to capture final content
            if event.startswith("data: "):
                try:
                    data = json.loads(event[6:].strip())
                    if data.get("type") == "done":
                        full_content = data.get("content", full_content)
                        citations = data.get("citations", [])
                except (json.JSONDecodeError, KeyError):
                    pass

        # Save assistant message after stream completes
        async with (await _get_session()) as save_db:
            assistant_msg = Message(
                conversation_id=conv_id,
                role="assistant",
                content=full_content,
                citations=citations,
            )
            save_db.add(assistant_msg)
            await save_db.commit()

            # Auto-title on first exchange
            msg_count = await save_db.scalar(
                select(func.count()).where(Message.conversation_id == conv_id)
            )
            if msg_count == 2:  # first user + first assistant
                title = await _generate_title(body.content)
                conv_obj = await save_db.get(Conversation, conv_id)
                if conv_obj:
                    conv_obj.title = title
                    await save_db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream")


async def _get_session():
    from app.database import async_session
    return async_session()


async def _generate_title(user_message: str) -> str:
    """Use the LLM to generate a short conversation title from the first message."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.ollama_url}/api/chat",
                json={
                    "model": settings.chat_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "Generate a short title (3-6 words) for a conversation that starts with the following message. Reply with ONLY the title, no quotes or punctuation.",
                        },
                        {"role": "user", "content": user_message},
                    ],
                    "stream": False,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            title = data["message"]["content"].strip().strip('"').strip("'")
            # Truncate if too long
            if len(title) > 80:
                title = title[:77] + "..."
            return title
    except Exception as e:
        logger.warning(f"Failed to generate title: {e}")
        # Fallback: first 50 chars of the message
        return user_message[:50] + ("..." if len(user_message) > 50 else "")
