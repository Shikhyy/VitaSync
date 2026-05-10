from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import Consultation, ConsultationStatusEnum, User
from app.routers.auth import get_current_user
from app.schemas.consultation import ConsultationCreate, ConsultationResponse, ConsultationStatus

router = APIRouter()

@router.post("/", response_model=ConsultationResponse)
async def book_consultation(
    consult: ConsultationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book consultations")

    doctor_id = _parse_uuid(consult.doctor_id, "doctor_id")
    doctor = await db.get(User, doctor_id)
    if not doctor or (doctor.role.value if hasattr(doctor.role, "value") else str(doctor.role)) != "doctor":
        raise HTTPException(status_code=404, detail="Doctor not found")

    booking = Consultation(
        patient_id=_parse_uuid(current_user["id"], "patient_id"),
        doctor_id=doctor_id,
        doctor_name=doctor.full_name or consult.doctor_name,
        slot_time=consult.slot_time,
        reason=consult.reason,
        status=ConsultationStatusEnum.confirmed,
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)
    return _consultation_response(booking, current_user.get("full_name") or current_user["id"])

@router.get("/patient", response_model=List[ConsultationResponse])
async def get_patient_consultations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(Consultation)
        .where(Consultation.patient_id == _parse_uuid(current_user["id"], "patient_id"))
        .order_by(Consultation.slot_time.asc())
    )
    return [_consultation_response(c, current_user.get("full_name") or current_user["id"]) for c in result.all()]

@router.get("/doctor", response_model=List[ConsultationResponse])
async def get_doctor_consultations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.scalars(
        select(Consultation)
        .where(Consultation.doctor_id == _parse_uuid(current_user["id"], "doctor_id"))
        .order_by(Consultation.slot_time.asc())
    )
    bookings = []
    for consultation in result.all():
        patient = await db.get(User, consultation.patient_id)
        bookings.append(_consultation_response(consultation, patient.full_name if patient else str(consultation.patient_id)))
    return bookings


def _consultation_response(consultation: Consultation, patient_name: str) -> ConsultationResponse:
    status_value = consultation.status.value if hasattr(consultation.status, "value") else str(consultation.status)
    return ConsultationResponse(
        id=str(consultation.id),
        patient_id=str(consultation.patient_id),
        patient_name=patient_name,
        doctor_id=str(consultation.doctor_id),
        doctor_name=consultation.doctor_name,
        slot_time=consultation.slot_time,
        reason=consultation.reason,
        status=ConsultationStatus(status_value),
        created_at=consultation.created_at or datetime.now(timezone.utc),
    )


def _parse_uuid(value: str, field_name: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")
