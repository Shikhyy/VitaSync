from __future__ import annotations

import logging
import uuid
from io import BytesIO
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.ml.ner_pipeline import MedicalNERPipeline
from app.models.models import Document, DocumentChunk, IngestionStatusEnum, MedicalEntity
from app.routers.auth import get_current_user
from app.schemas.ingest import IngestResponse, IngestStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter()
ner_pipeline = MedicalNERPipeline()

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
    db: AsyncSession = Depends(get_db),
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

    # Process immediately so the user sees real extraction status instead of simulated progress.
    text = _extract_text(content, file.content_type or "", file.filename or "")
    ner_result = ner_pipeline.extract(text, task_id)
    document_type = _infer_document_type(file.filename or "", text)

    document = Document(
        patient_id=uuid.UUID(patient_id),
        filename=file.filename or "uploaded-document",
        file_type=file.content_type,
        document_type=document_type,
        source_name="Uploaded by Patient",
        ingestion_status=IngestionStatusEnum.done,
        entity_count=ner_result.entity_count,
        raw_text_preview=text[:500],
        celery_task_id=task_id,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(document)
    await db.flush()

    for entity in ner_result.entities:
        db.add(MedicalEntity(
            document_id=document.id,
            patient_id=document.patient_id,
            entity_type=entity.entity_type,
            text=entity.text,
            normalised_code=entity.normalised_code,
            numeric_value=entity.numeric_value,
            unit=entity.unit,
            confidence=entity.confidence,
        ))

    for idx, chunk in enumerate(_chunk_text(text)):
        db.add(DocumentChunk(
            patient_id=document.patient_id,
            document_id=document.id,
            chunk_text=chunk,
            chunk_index=idx,
            entity_types=sorted({entity.entity_type for entity in ner_result.entities}),
        ))

    await db.flush()

    logger.info(
        "Document ingested: task_id=%s patient_id=%s filename=%s entities=%d",
        task_id, patient_id, file.filename, ner_result.entity_count,
    )

    return IngestResponse(task_id=task_id, status="done", message="Document ingested")


@router.get("/documents", response_model=list[IngestStatusResponse])
async def list_documents(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[IngestStatusResponse]:
    """List documents uploaded by the current patient."""
    result = await db.scalars(
        select(Document)
        .where(Document.patient_id == uuid.UUID(current_user["id"]))
        .order_by(Document.created_at.desc())
    )
    return [_document_response(document) for document in result.all()]


@router.get("/status/{task_id}", response_model=IngestStatusResponse)
async def get_ingestion_status(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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
    document = await db.scalar(select(Document).where(Document.celery_task_id == task_id))
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found",
        )
    if str(document.patient_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return _document_response(document)


def _document_response(document: Document) -> IngestStatusResponse:
    status_value = document.ingestion_status.value if hasattr(document.ingestion_status, "value") else str(document.ingestion_status)
    created_at = document.created_at.isoformat() if document.created_at else datetime.now(timezone.utc).isoformat()
    return IngestStatusResponse(
        task_id=document.celery_task_id or str(document.id),
        patient_id=str(document.patient_id),
        filename=document.filename,
        file_type=document.file_type,
        document_type=document.document_type,
        status=status_value,
        entity_count=document.entity_count or 0,
        created_at=created_at,
    )


def _chunk_text(text: str, chunk_size: int = 1200, overlap: int = 150) -> list[str]:
    """Split extracted text into persisted chunks for grounded Qwen retrieval."""
    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        chunks.append(cleaned[start:end])
        if end == len(cleaned):
            break
        start = max(0, end - overlap)
    return chunks


def _extract_text(content: bytes, content_type: str, filename: str) -> str:
    """Extract real text from supported upload types."""
    try:
        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            import fitz

            with fitz.open(stream=content, filetype="pdf") as doc:
                return "\n".join(page.get_text() for page in doc).strip()

        if content_type in {"image/jpeg", "image/png"}:
            from PIL import Image
            import pytesseract

            image = Image.open(BytesIO(content))
            return pytesseract.image_to_string(image).strip()

        if content_type in {"text/csv", "application/json"} or filename.lower().endswith((".csv", ".json", ".txt")):
            return content.decode("utf-8", errors="replace").strip()
    except Exception as e:
        logger.warning("Text extraction failed for %s: %s", filename, e)

    return content[:5000].decode("utf-8", errors="replace").strip()


def _infer_document_type(filename: str, text: str) -> str:
    lower = f"{filename} {text[:1000]}".lower()
    if "prescription" in lower or "rx" in lower:
        return "Prescription"
    if "ecg" in lower or "electrocardiogram" in lower:
        return "ECG Report"
    if "discharge" in lower:
        return "Discharge Summary"
    if "lab" in lower or "hba1c" in lower or "creatinine" in lower or "ldl" in lower:
        return "Lab Report"
    if "consult" in lower or "assessment" in lower:
        return "Consultation Note"
    return "Medical Document"
