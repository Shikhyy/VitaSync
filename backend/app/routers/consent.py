from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.models import Consent, ConsentStatusEnum, User
from app.routers.auth import get_current_user
from app.schemas.consent import (
    ConsentRequest,
    ConsentApproval,
    ConsentResponse,
    ConsentListResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _parse_uuid(value: str, field_name: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {field_name}")


def _parse_expiry(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


async def _consent_response(consent: Consent, db: AsyncSession) -> ConsentResponse:
    doctor = await db.get(User, consent.doctor_id)
    expires_at = consent.expires_at.isoformat() if consent.expires_at else None
    created_at = consent.created_at.isoformat() if consent.created_at else datetime.now(timezone.utc).isoformat()
    return ConsentResponse(
        id=str(consent.id),
        patient_id=str(consent.patient_id),
        doctor_id=str(consent.doctor_id),
        doctor_name=doctor.full_name if doctor else None,
        institution=doctor.institution if doctor else None,
        scope=consent.scope,
        status=consent.status.value if hasattr(consent.status, "value") else str(consent.status),
        price_per_query=consent.price_per_query or 0.0,
        query_count=consent.query_count or 0,
        expires_at=expires_at,
        created_at=created_at,
    )


@router.post("/request", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def request_consent(
    body: ConsentRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsentResponse:
    """Doctor requests consent to query a patient's records.

    Args:
        body: Consent request payload (patient_id, scope, vitasync_id).
        current_user: Authenticated doctor.

    Returns:
        Created consent request (pending status).

    Raises:
        HTTPException 403: If caller is not a doctor.
    """
    if current_user["role"] != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can request consent",
        )
    patient_id = _parse_uuid(body.patient_id, "patient_id")
    patient = await db.get(User, patient_id)
    if not patient or (patient.role.value if hasattr(patient.role, "value") else str(patient.role)) != "patient":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    doctor_id = _parse_uuid(current_user["id"], "doctor_id")
    consent = Consent(
        patient_id=patient_id,
        doctor_id=doctor_id,
        scope=body.scope,
        status=ConsentStatusEnum.pending,
        price_per_query=0.0,
        query_count=0,
    )
    db.add(consent)
    await db.flush()
    await db.refresh(consent)
    logger.info("Consent request: doctor=%s patient=%s", current_user["id"], body.patient_id)
    return await _consent_response(consent, db)


@router.post("/{consent_id}/approve", response_model=ConsentResponse)
async def approve_consent(
    consent_id: str,
    body: ConsentApproval,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsentResponse:
    """Patient approves a consent request, setting price and expiry.

    Args:
        consent_id: UUID of the pending consent request.
        body: Approval terms (price_per_query, expires_at).
        current_user: Authenticated patient.

    Returns:
        Updated consent with approved status and terms.

    Raises:
        HTTPException 404: If consent request not found.
        HTTPException 403: If the consent belongs to a different patient.
    """
    consent = await db.get(Consent, _parse_uuid(consent_id, "consent_id"))
    if not consent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent request not found")
    if str(consent.patient_id) != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    consent.status = ConsentStatusEnum.approved
    consent.price_per_query = body.price_per_query
    consent.expires_at = _parse_expiry(body.expires_at)
    consent.approved_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(consent)
    logger.info("Consent approved: id=%s price=%s", consent_id, body.price_per_query)
    return await _consent_response(consent, db)


@router.delete("/{consent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_consent(
    consent_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Patient revokes a previously approved consent.

    One-tap revocation — immediately invalidates all future queries.

    Args:
        consent_id: UUID of the consent to revoke.
        current_user: Authenticated patient.

    Raises:
        HTTPException 404: If consent not found.
        HTTPException 403: If caller is not the consent owner.
    """
    consent = await db.get(Consent, _parse_uuid(consent_id, "consent_id"))
    if not consent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent not found")
    if str(consent.patient_id) != current_user["id"] and str(consent.doctor_id) != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    consent.status = ConsentStatusEnum.revoked
    consent.revoked_at = datetime.now(timezone.utc)
    logger.info("Consent revoked: id=%s", consent_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/my", response_model=ConsentListResponse)
async def list_my_consents(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsentListResponse:
    """List all consent requests/approvals for the current user.

    Returns all consents where the user is either the patient or the doctor.
    """
    user_id = current_user["id"]
    role = current_user["role"]
    user_uuid = _parse_uuid(user_id, "user_id")
    if role == "patient":
        result = await db.scalars(select(Consent).where(Consent.patient_id == user_uuid).order_by(Consent.created_at.desc()))
    else:
        result = await db.scalars(select(Consent).where(Consent.doctor_id == user_uuid).order_by(Consent.created_at.desc()))
    items = [await _consent_response(consent, db) for consent in result.all()]
    return ConsentListResponse(consents=items)


async def has_approved_consent(patient_id: str, doctor_id: str, db: AsyncSession) -> bool:
    """Return whether a doctor has active approved access to a patient."""
    return await get_active_consent(patient_id, doctor_id, db) is not None


async def get_active_consent(patient_id: str, doctor_id: str, db: AsyncSession) -> Consent | None:
    """Return the active consent agreement for a doctor and patient."""
    now = datetime.now(timezone.utc)
    patient_uuid = _parse_uuid(patient_id, "patient_id")
    doctor_uuid = _parse_uuid(doctor_id, "doctor_id")
    return await db.scalar(
        select(Consent).where(
            Consent.patient_id == patient_uuid,
            Consent.doctor_id == doctor_uuid,
            Consent.status == ConsentStatusEnum.approved,
            or_(Consent.expires_at.is_(None), Consent.expires_at > now),
        )
    )
