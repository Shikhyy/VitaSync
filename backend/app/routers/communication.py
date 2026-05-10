from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
import uuid
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import Message, User
from app.routers.auth import get_current_user
from app.schemas.communication import MessageCreate, MessageResponse

router = APIRouter()

@router.post("/", response_model=MessageResponse)
async def send_message(
    msg: MessageCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sender_id = _parse_uuid(current_user["id"], "sender_id")
    recipient_id = _parse_uuid(msg.recipient_id, "recipient_id")
    recipient = await db.get(User, recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    new_msg = Message(
        sender_id=sender_id,
        recipient_id=recipient_id,
        content=msg.content,
    )
    db.add(new_msg)
    await db.flush()
    await db.refresh(new_msg)
    return _message_response(new_msg)

@router.get("/{other_user_id}", response_model=List[MessageResponse])
async def get_messages(
    other_user_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_id = _parse_uuid(current_user["id"], "user_id")
    other_id = _parse_uuid(other_user_id, "other_user_id")
    result = await db.scalars(
        select(Message)
        .where(
            or_(
                (Message.sender_id == current_id) & (Message.recipient_id == other_id),
                (Message.sender_id == other_id) & (Message.recipient_id == current_id),
            )
        )
        .order_by(Message.timestamp.asc())
    )
    return [_message_response(message) for message in result.all()]


def _message_response(message: Message) -> MessageResponse:
    return MessageResponse(
        id=str(message.id),
        sender_id=str(message.sender_id),
        recipient_id=str(message.recipient_id),
        content=message.content,
        timestamp=message.timestamp or datetime.now(timezone.utc),
    )


def _parse_uuid(value: str, field_name: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")
