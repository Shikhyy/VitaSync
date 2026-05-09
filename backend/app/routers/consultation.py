from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
import uuid

from app.routers.auth import get_current_user
from app.schemas.consultation import ConsultationCreate, ConsultationResponse, ConsultationStatus

router = APIRouter()

# In-memory consultation store
_CONSULTATIONS: list[dict] = []

@router.post("/", response_model=ConsultationResponse)
async def book_consultation(
    consult: ConsultationCreate,
    current_user: dict = Depends(get_current_user)
):
    # For demo: allow anyone to book. In production: check roles/consent.
    new_booking = {
        "id": str(uuid.uuid4()),
        "patient_id": current_user["id"],
        "patient_name": current_user.get("fullName", "Unknown Patient"),
        "doctor_id": consult.doctor_id,
        "doctor_name": consult.doctor_name,
        "slot_time": consult.slot_time,
        "reason": consult.reason,
        "status": ConsultationStatus.CONFIRMED, # Immediate confirmation for demo
        "created_at": datetime.now(timezone.utc)
    }
    
    _CONSULTATIONS.append(new_booking)
    return new_booking

@router.get("/patient", response_model=List[ConsultationResponse])
async def get_patient_consultations(
    current_user: dict = Depends(get_current_user)
):
    return [c for c in _CONSULTATIONS if c["patient_id"] == current_user["id"]]

@router.get("/doctor", response_model=List[ConsultationResponse])
async def get_doctor_consultations(
    current_user: dict = Depends(get_current_user)
):
    # In demo, current_user might be a doctor or a patient.
    # For a real doctor portal, we filter by doctor_id.
    # For demo purposes, we'll return all if it's the doctor portal view.
    return _CONSULTATIONS
