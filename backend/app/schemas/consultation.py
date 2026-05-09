from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional, List

class ConsultationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class ConsultationBase(BaseModel):
    doctor_id: str
    doctor_name: str
    slot_time: datetime
    reason: Optional[str] = None

class ConsultationCreate(ConsultationBase):
    pass

class ConsultationResponse(ConsultationBase):
    id: str
    patient_id: str
    patient_name: str
    status: ConsultationStatus
    created_at: datetime

    class Config:
        from_attributes = True
