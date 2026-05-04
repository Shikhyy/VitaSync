from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.ml.anomaly_detector import AnomalyDetector
from app.ml.risk_predictor import RiskPredictor
from app.routers.auth import get_current_user
from app.schemas.monitor import AlertResponse, AlertType, Severity

logger = logging.getLogger(__name__)
router = APIRouter()

anomaly_detector = AnomalyDetector()
risk_predictor = RiskPredictor()

# In-memory alert store per patient
_ALERTS: dict[str, list[dict]] = {}

# Connected WebSocket clients
_WS_CLIENTS: dict[str, list[WebSocket]] = {}


@router.get("/alerts/{patient_id}", response_model=list[AlertResponse])
async def get_patient_alerts(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
) -> list[AlertResponse]:
    """Retrieve all alerts for a patient, newest first.

    Args:
        patient_id: UUID of the patient.
        current_user: Authenticated user (must be the patient or their approved doctor).

    Returns:
        List of alert objects sorted by creation time descending.
    """
    # In production: verify consent if doctor is requesting
    alerts = _ALERTS.get(patient_id, [])
    return [AlertResponse(**a) for a in reversed(alerts)]


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
    import uuid
    alert = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "type": alert_type,
        "severity": severity,
        "title": title,
        "body": body,
        "source_lab_name": source_lab_name,
        "ml_score": ml_score,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if patient_id not in _ALERTS:
        _ALERTS[patient_id] = []
    _ALERTS[patient_id].append(alert)

    # Broadcast to all connected WebSocket clients
    ws_list = _WS_CLIENTS.get(patient_id, [])
    for ws in ws_list:
        try:
            import json
            await ws.send_text(json.dumps(alert))
        except Exception as e:
            logger.warning("WebSocket send failed: %s", e)
