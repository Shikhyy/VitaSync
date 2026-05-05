from __future__ import annotations

import logging

from app.config import settings
from app.ml.anomaly_detector import AnomalyDetector
from app.ml.risk_predictor import RiskPredictor
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

anomaly_detector = AnomalyDetector()
risk_predictor = RiskPredictor()

# Mock patient lab data for dev mode — replace with DB queries in production
_MOCK_PATIENT_LABS: dict[str, dict] = {
    "default": {
        "hba1c": [6.5, 6.7, 6.9, 7.0, 7.2],
        "creatinine": [0.8, 0.85, 0.9, 0.9, 0.9],
        "ldl": [3.2, 2.9, 2.6, 2.5, 2.4],
        "systolic_bp": [138, 135, 132, 130, 128],
    }
}


@celery_app.task(name="app.tasks.monitor_task.run_monitoring_cycle")
def run_monitoring_cycle() -> dict:
    """Celery beat task: run the health monitoring cycle for all active patients.

    Runs every 10 minutes (see celery_app.py beat_schedule).

    Pipeline for each patient:
    1. Fetch latest lab values from DB.
    2. Run XGBoost anomaly detection on each lab marker.
    3. If any score > alert_threshold: update risk scores, generate alert.
    4. LLM is NOT called in this task — it fires in the query router only.
    5. Push WebSocket notification if alert was generated.

    Returns:
        Summary of the monitoring cycle results.
    """
    logger.info("Monitoring cycle started")
    results = {"patients_checked": 0, "alerts_generated": 0}

    # In production: query DB for all active patients
    patient_ids = ["mock-patient-001"]

    for patient_id in patient_ids:
        try:
            patient_results = _check_patient(patient_id)
            results["patients_checked"] += 1
            results["alerts_generated"] += patient_results.get("alerts", 0)
        except Exception as e:
            logger.error("Monitor failed for patient=%s: %s", patient_id, e)

    logger.info(
        "Monitoring cycle complete: %d patients, %d alerts",
        results["patients_checked"], results["alerts_generated"],
    )
    return results


def _check_patient(patient_id: str) -> dict:
    """Check a single patient's latest labs and fire alerts if needed.

    Args:
        patient_id: Patient UUID.

    Returns:
        Dict with alert count and risk scores.
    """
    labs = _MOCK_PATIENT_LABS.get(patient_id, _MOCK_PATIENT_LABS["default"])
    alerts_fired = 0
    high_anomalies = []

    for lab_name, history in labs.items():
        if not history:
            continue
        latest = history[-1]
        prev_history = history[:-1]
        score = anomaly_detector.score(lab_name, latest, prev_history)

        if score > settings.alert_threshold:
            high_anomalies.append((lab_name, latest, score))
            logger.warning(
                "Alert triggered: patient=%s lab=%s value=%.2f score=%.2f",
                patient_id, lab_name, latest, score,
            )
            # In production: call monitor router's create_and_broadcast_alert()
            # via asyncio.run() or celery chord
            alerts_fired += 1

    # Update risk scores regardless
    risk_features = {
        "age": 47, "bmi": 27.4,
        "hba1c": labs.get("hba1c", [5.5])[-1],
        "systolic_bp": labs.get("systolic_bp", [120])[-1],
        "ldl": labs.get("ldl", [2.5])[-1],
        "creatinine": labs.get("creatinine", [0.9])[-1],
        "fasting_glucose": 126, "smoking": 0,
        "family_history_diabetes": 1, "family_history_cvd": 0,
    }
    risk_scores = risk_predictor.predict(risk_features)
    logger.debug("Risk scores updated: patient=%s %s", patient_id, risk_scores)

    return {"alerts": alerts_fired, "risk_scores": risk_scores}
