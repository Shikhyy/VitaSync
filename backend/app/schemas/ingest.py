from __future__ import annotations

from pydantic import BaseModel


class IngestResponse(BaseModel):
    task_id: str
    status: str
    message: str


class IngestStatusResponse(BaseModel):
    task_id: str
    patient_id: str
    filename: str | None = None
    file_type: str | None = None
    document_type: str | None = None
    status: str  # pending | processing | done | failed
    entity_count: int = 0
    created_at: str
