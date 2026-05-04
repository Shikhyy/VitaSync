from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class AlertType(str, Enum):
    lab_anomaly = "lab_anomaly"
    trend_change = "trend_change"
    risk_increase = "risk_increase"
    drug_interaction = "drug_interaction"


class Severity(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AlertResponse(BaseModel):
    id: str
    patient_id: str
    type: AlertType
    severity: Severity
    title: str
    body: str
    source_lab_name: str | None = None
    ml_score: float | None = Field(None, ge=0.0, le=1.0)
    is_read: bool = False
    created_at: str
