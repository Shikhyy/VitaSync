from __future__ import annotations

import logging

from app.agents.pipeline import build_ingestion_crew
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_document(self, task_id: str, patient_id: str, file_path: str, file_type: str) -> dict:
    """Celery task: run the full 5-agent ingestion pipeline on a document.

    Executes in background after a file upload is accepted by the API.

    Pipeline:
    1. DocumentExtractorTool: Extract text (PyMuPDF / Qwen-VL / pytesseract)
    2. NERExtractorTool: BioBERT NER → entity list
    3. RiskAnalysisTool: XGBoost anomaly + GBM risk scoring
    4. MindsDB graph upsert (inline after NER)
    5. Alert broadcast via WebSocket if anomaly score > 0.65

    Args:
        task_id: Ingestion task UUID (for status polling).
        patient_id: Patient UUID.
        file_path: Path to document in MinIO.
        file_type: MIME type of the uploaded file.

    Returns:
        Result dict with entity_count, risk_scores, and alert_count.
    """
    logger.info("Ingestion task started: task_id=%s patient_id=%s", task_id, patient_id)
    try:
        crew = build_ingestion_crew(file_path, file_type, patient_id)
        result = crew.kickoff()
        logger.info("Ingestion complete: task_id=%s", task_id)
        return {"task_id": task_id, "status": "done", "result": str(result)}
    except Exception as exc:
        logger.error("Ingestion task failed: task_id=%s error=%s", task_id, exc)
        raise self.retry(exc=exc) from exc
