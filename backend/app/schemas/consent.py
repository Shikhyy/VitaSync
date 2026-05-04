from __future__ import annotations

from pydantic import BaseModel, Field


class ConsentRequest(BaseModel):
    patient_id: str
    scope: str = Field(..., description="e.g. 'Last 12 months' or 'Full history'")
    vitasync_id: str | None = None


class ConsentApproval(BaseModel):
    price_per_query: float = Field(..., ge=0.0, le=100.0)
    expires_at: str  # ISO date string


class ConsentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    doctor_name: str | None = None
    institution: str | None = None
    scope: str
    status: str  # pending | approved | revoked
    price_per_query: float = 0.0
    query_count: int = 0
    expires_at: str | None = None
    created_at: str


class ConsentListResponse(BaseModel):
    consents: list[ConsentResponse]
