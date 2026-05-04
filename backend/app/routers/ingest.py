from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status

from app.routers.auth import get_current_user
from app.schemas.ingest import IngestResponse, IngestStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory task store (replace with Celery task tracking in production)
_TASKS: dict[str, dict] = {}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/dicom",
    "text/csv",
    "application/json",
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", response_model=IngestResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> IngestResponse:
    """Upload a medical document for ingestion.

    File is validated and queued as a Celery task. The ingestion pipeline
    runs: text extraction → NER → graph upsert → embedding → vector store.

    Args:
        file: Uploaded file (PDF, JPEG, PNG, DICOM, CSV, HL7 JSON).
        current_user: Authenticated user from JWT.

    Returns:
        Task ID and initial status. Poll /ingest/status/{task_id} for progress.

    Raises:
        HTTPException 400: If file type or size is invalid.
        HTTPException 413: If file exceeds 50 MB.
    """
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Accepted: PDF, JPEG, PNG, DICOM, CSV, HL7 JSON",
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 50 MB limit",
        )

    task_id = str(uuid.uuid4())
    patient_id = current_user["id"]

    # Store task metadata (in production, dispatch to Celery here)
    _TASKS[task_id] = {
        "task_id": task_id,
        "patient_id": patient_id,
        "filename": file.filename,
        "file_type": file.content_type,
        "status": "pending",
        "entity_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # In production: process_document.apply_async(args=[task_id, patient_id, content])
    logger.info(
        "Document upload queued: task_id=%s patient_id=%s filename=%s",
        task_id, patient_id, file.filename,
    )

    return IngestResponse(task_id=task_id, status="pending", message="Document queued for ingestion")


@router.get("/status/{task_id}", response_model=IngestStatusResponse)
async def get_ingestion_status(
    task_id: str,
    current_user: dict = Depends(get_current_user),
) -> IngestStatusResponse:
    """Get the current status of a document ingestion task.

    Args:
        task_id: UUID of the ingestion task.
        current_user: Authenticated user from JWT.

    Returns:
        Task status including entity_count when complete.

    Raises:
        HTTPException 404: If task not found.
        HTTPException 403: If task belongs to a different patient.
    """
    task = _TASKS.get(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found",
        )
    if task["patient_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return IngestStatusResponse(**task)
