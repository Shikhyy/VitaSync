from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
import uuid

from app.routers.auth import get_current_user
from app.schemas.communication import MessageCreate, MessageResponse

router = APIRouter()

# In-memory message store: {conversation_id: [messages]}
# conversation_id is sorted tuple of (user1_id, user2_id) joined by "_"
_MESSAGES: dict[str, list[dict]] = {}

def get_convo_id(u1: str, u2: str) -> str:
    return "_".join(sorted([u1, u2]))

@router.post("/", response_model=MessageResponse)
async def send_message(
    msg: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    sender_id = current_user["id"]
    convo_id = get_convo_id(sender_id, msg.recipient_id)
    
    new_msg = {
        "id": str(uuid.uuid4()),
        "sender_id": sender_id,
        "recipient_id": msg.recipient_id,
        "content": msg.content,
        "timestamp": datetime.now(timezone.utc)
    }
    
    if convo_id not in _MESSAGES:
        _MESSAGES[convo_id] = []
    _MESSAGES[convo_id].append(new_msg)
    
    return new_msg

@router.get("/{other_user_id}", response_model=List[MessageResponse])
async def get_messages(
    other_user_id: str,
    current_user: dict = Depends(get_current_user)
):
    convo_id = get_convo_id(current_user["id"], other_user_id)
    return _MESSAGES.get(convo_id, [])
