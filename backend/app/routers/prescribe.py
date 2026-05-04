from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.ml.drug_checker import DrugInteractionChecker
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

drug_checker = DrugInteractionChecker()


# ── Drug interaction schemas ──────────────────────────────────────
class DrugCheckRequest(BaseModel):
    new_drug: str = Field(..., min_length=2, description="Drug name to check")
    current_medications: list[str] = Field(
        default_factory=list,
        description="Patient's current medication list",
    )


class InteractionDetail(BaseModel):
    drug_a: str
    drug_b: str
    severity: str
    mechanism: str
    description: str
    recommendation: str
    evidence: str


class DrugCheckResponse(BaseModel):
    new_drug: str
    is_safe: bool
    highest_severity: str | None
    interaction_count: int
    interactions: list[InteractionDetail]


@router.post("/drug-check", response_model=DrugCheckResponse)
async def check_drug_interaction(
    body: DrugCheckRequest,
    current_user: dict = Depends(get_current_user),
) -> DrugCheckResponse:
    """Check a new drug for interactions with a patient's current medications.

    Uses rule-based DrugBank lookup with alias resolution.

    Args:
        body: New drug name + list of current medications.
        current_user: Authenticated doctor.

    Returns:
        Safety result with all detected interactions and recommendations.
    """
    if current_user["role"] != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clinicians can use the drug interaction checker",
        )
    result = drug_checker.check(body.new_drug, body.current_medications)
    return DrugCheckResponse(
        new_drug=result.new_drug,
        is_safe=result.is_safe,
        highest_severity=result.highest_severity,
        interaction_count=len(result.interactions),
        interactions=[
            InteractionDetail(
                drug_a=i.drug_a,
                drug_b=i.drug_b,
                severity=i.severity,
                mechanism=i.mechanism,
                description=i.description,
                recommendation=i.recommendation,
                evidence=i.evidence,
            )
            for i in result.interactions
        ],
    )
