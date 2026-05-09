from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.routers.auth import get_current_user
from app.schemas.consent import (
    ConsentRequest,
    ConsentApproval,
    ConsentResponse,
    ConsentListResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory consent store (replace with PostgreSQL in production)
_CONSENTS: dict[str, dict] = {}


@router.post("/request", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def request_consent(
    body: ConsentRequest,
    current_user: dict = Depends(get_current_user),
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
    consent_id = str(uuid.uuid4())
    consent = {
        "id": consent_id,
        "patient_id": body.patient_id,
        "doctor_id": current_user["id"],
        "doctor_name": current_user.get("full_name", "Unknown Doctor"),
        "institution": current_user.get("institution", ""),
        "scope": body.scope,
        "status": "pending",
        "price_per_query": 0.0,
        "query_count": 0,
        "expires_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _CONSENTS[consent_id] = consent
    logger.info("Consent request: doctor=%s patient=%s", current_user["id"], body.patient_id)
    return ConsentResponse(**consent)


@router.post("/{consent_id}/approve", response_model=ConsentResponse)
async def approve_consent(
    consent_id: str,
    body: ConsentApproval,
    current_user: dict = Depends(get_current_user),
) -> ConsentResponse:
    """Patient approves a consent request, setting price and expiry.

    In production: issues an X402 payment channel for gated query access.

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
    consent = _CONSENTS.get(consent_id)
    if not consent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent request not found")
    if consent["patient_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    consent["status"] = "approved"
    consent["price_per_query"] = body.price_per_query
    consent["expires_at"] = body.expires_at
    logger.info("Consent approved: id=%s price=%s", consent_id, body.price_per_query)
    return ConsentResponse(**consent)


@router.delete("/{consent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_consent(
    consent_id: str,
    current_user: dict = Depends(get_current_user),
) -> None:
    """Patient revokes a previously approved consent.

    One-tap revocation — immediately invalidates all future queries.

    Args:
        consent_id: UUID of the consent to revoke.
        current_user: Authenticated patient.

    Raises:
        HTTPException 404: If consent not found.
        HTTPException 403: If caller is not the consent owner.
    """
    consent = _CONSENTS.get(consent_id)
    if not consent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent not found")
    if consent["patient_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    consent["status"] = "revoked"
    logger.info("Consent revoked: id=%s", consent_id)


@router.get("/my", response_model=ConsentListResponse)
async def list_my_consents(current_user: dict = Depends(get_current_user)) -> ConsentListResponse:
    """List all consent requests/approvals for the current user.

    Returns all consents where the user is either the patient or the doctor.
    """
    user_id = current_user["id"]
    role = current_user["role"]
    if role == "patient":
        items = [c for c in _CONSENTS.values() if c["patient_id"] == user_id]
    else:
        items = [c for c in _CONSENTS.values() if c["doctor_id"] == user_id]
    return ConsentListResponse(consents=[ConsentResponse(**c) for c in items])
