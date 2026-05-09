from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MessageBase(BaseModel):
    content: str
    recipient_id: str

class MessageCreate(MessageBase):
    pass

class MessageResponse(MessageBase):
    id: str
    sender_id: str
    timestamp: datetime

    class Config:
        from_attributes = True
