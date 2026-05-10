from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal, get_db
from app.ml.anomaly_detector import AnomalyDetector
from app.ml.risk_predictor import RiskPredictor
from app.models.models import Alert, AlertTypeEnum, SeverityEnum
from app.routers.auth import get_current_user
from app.schemas.monitor import AlertResponse, AlertType, Severity

logger = logging.getLogger(__name__)
router = APIRouter()

anomaly_detector = AnomalyDetector()
risk_predictor = RiskPredictor()

# Connected WebSocket clients
_WS_CLIENTS: dict[str, list[WebSocket]] = {}


@router.get("/alerts/{patient_id}", response_model=list[AlertResponse])
async def get_patient_alerts(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    """Retrieve all alerts for a patient, newest first.

    Args:
        patient_id: UUID of the patient.
        current_user: Authenticated user (must be the patient or their approved doctor).

    Returns:
        List of alert objects sorted by creation time descending.
    """
    if current_user["role"] == "patient" and current_user["id"] != patient_id:
        return []
    result = await db.scalars(
        select(Alert)
        .where(Alert.patient_id == _parse_uuid(patient_id, "patient_id"))
        .order_by(Alert.created_at.desc())
    )
    return [_alert_response(alert) for alert in result.all()]


@router.websocket("/ws/{patient_id}")
async def alerts_websocket(websocket: WebSocket, patient_id: str) -> None:
    """WebSocket endpoint for real-time alert delivery.

    Clients connect here to receive instant push notifications when the
    monitoring agent detects an anomaly with ML score > settings.alert_threshold.

    The monitoring agent (Celery beat task) calls _broadcast_alert() when
    it fires a new alert.

    Args:
        websocket: WebSocket connection.
        patient_id: Patient whose alerts this client wants to receive.
    """
    await websocket.accept()
    if patient_id not in _WS_CLIENTS:
        _WS_CLIENTS[patient_id] = []
    _WS_CLIENTS[patient_id].append(websocket)
    logger.info("WebSocket connected: patient=%s total=%d", patient_id, len(_WS_CLIENTS[patient_id]))

    try:
        while True:
            # Keep connection alive — actual push is done via _broadcast_alert
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        _WS_CLIENTS[patient_id].remove(websocket)
        logger.info("WebSocket disconnected: patient=%s", patient_id)


async def create_and_broadcast_alert(
    patient_id: str,
    alert_type: AlertType,
    severity: Severity,
    title: str,
    body: str,
    source_lab_name: str | None = None,
    ml_score: float | None = None,
) -> None:
    """Create an alert and push it to all connected WebSocket clients.

    Called by the Celery monitoring agent when ML score > threshold.

    Args:
        patient_id: Patient to alert.
        alert_type: Type of anomaly detected.
        severity: Alert severity level.
        title: Short alert title.
        body: Full alert body text.
        source_lab_name: Lab marker that triggered the alert.
        ml_score: Raw ML classification score.
    """
    async with AsyncSessionLocal() as session:
        alert = Alert(
            patient_id=_parse_uuid(patient_id, "patient_id"),
            alert_type=AlertTypeEnum(alert_type.value),
            severity=SeverityEnum(severity.value),
            title=title,
            body=body,
            source_lab_name=source_lab_name,
            ml_score=ml_score,
            is_read=False,
        )
        session.add(alert)
        await session.commit()
        await session.refresh(alert)

    payload = _alert_response(alert).model_dump(mode="json")

    # Broadcast to all connected WebSocket clients
    ws_list = _WS_CLIENTS.get(patient_id, [])
    for ws in ws_list:
        try:
            import json
            await ws.send_text(json.dumps(payload))
        except Exception as e:
            logger.warning("WebSocket send failed: %s", e)


def _alert_response(alert: Alert) -> AlertResponse:
    return AlertResponse(
        id=str(alert.id),
        patient_id=str(alert.patient_id),
        type=AlertType(alert.alert_type.value if hasattr(alert.alert_type, "value") else str(alert.alert_type)),
        severity=Severity(alert.severity.value if hasattr(alert.severity, "value") else str(alert.severity)),
        title=alert.title,
        body=alert.body,
        source_lab_name=alert.source_lab_name,
        ml_score=alert.ml_score,
        is_read=alert.is_read,
        created_at=alert.created_at.isoformat() if alert.created_at else datetime.now(timezone.utc).isoformat(),
    )


def _parse_uuid(value: str, field_name: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")
