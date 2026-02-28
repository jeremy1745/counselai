from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
from app.services.rag import stream_rag_response, extract_citations, embed_query, search_chunks

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
                import json
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

    return StreamingResponse(generate(), media_type="text/event-stream")


async def _get_session():
    from app.database import async_session
    return async_session()
