from __future__ import annotations

import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, relationship
from pgvector.sqlalchemy import Vector
import uuid as uuid_module


class Base(DeclarativeBase):
    pass


# ── Enums ─────────────────────────────────────────────────────────
class UserRoleEnum(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"


class IngestionStatusEnum(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    failed = "failed"


class ConsentStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    revoked = "revoked"


class AlertTypeEnum(str, enum.Enum):
    lab_anomaly = "lab_anomaly"
    trend_change = "trend_change"
    risk_increase = "risk_increase"
    drug_interaction = "drug_interaction"


class SeverityEnum(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class ConsultationStatusEnum(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


# ── Models ────────────────────────────────────────────────────────
class User(Base):
    """Platform user — either a patient or a licensed clinician."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRoleEnum), nullable=False)
    full_name = Column(String(200), nullable=False)
    institution = Column(String(200))
    licence_number = Column(String(100))
    wallet_address = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    documents = relationship("Document", back_populates="patient", foreign_keys="Document.patient_id")
    patient_consents = relationship("Consent", back_populates="patient", foreign_keys="Consent.patient_id")
    doctor_consents = relationship("Consent", back_populates="doctor", foreign_keys="Consent.doctor_id")
    alerts = relationship("Alert", back_populates="patient")
    risk_scores = relationship("RiskScore", back_populates="patient", order_by="RiskScore.computed_at.desc()")


class Document(Base):
    """Medical document uploaded by a patient and processed by the ingestion pipeline."""

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(500), nullable=False)
    file_type = Column(String(100))  # MIME type
    document_type = Column(String(100))  # Lab Report, Discharge Summary, etc.
    source_name = Column(String(200))  # e.g. "City Diagnostic Lab"
    document_date = Column(DateTime)  # Date on the document itself
    minio_path = Column(String(500))  # Object storage path
    ingestion_status = Column(Enum(IngestionStatusEnum), default=IngestionStatusEnum.pending, nullable=False)
    entity_count = Column(Integer, default=0)
    raw_text_preview = Column(Text)  # First 500 chars — never stored in logs
    celery_task_id = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))

    patient = relationship("User", back_populates="documents", foreign_keys=[patient_id])
    entities = relationship("MedicalEntity", back_populates="document")


class MedicalEntity(Base):
    """NER-extracted medical entity from a document (BioBERT output)."""

    __tablename__ = "medical_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # DISEASE, DRUG, LAB_TEST, LAB_VALUE, DOSAGE
    text = Column(String(500), nullable=False)
    normalised_code = Column(String(50))  # ICD-10, LOINC, RxNorm
    numeric_value = Column(Float)
    unit = Column(String(50))
    mention_date = Column(DateTime)
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="entities")


class Consent(Base):
    """X402-gated consent record between a patient and a clinician."""

    __tablename__ = "consents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    scope = Column(String(200), nullable=False)
    status = Column(Enum(ConsentStatusEnum), default=ConsentStatusEnum.pending, nullable=False)
    price_per_query = Column(Float, default=0.0)
    query_count = Column(Integer, default=0)
    total_earned = Column(Float, default=0.0)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True))
    revoked_at = Column(DateTime(timezone=True))

    patient = relationship("User", back_populates="patient_consents", foreign_keys=[patient_id])
    doctor = relationship("User", back_populates="doctor_consents", foreign_keys=[doctor_id])


class RiskScore(Base):
    """ML-computed disease risk scores for a patient at a point in time."""

    __tablename__ = "risk_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    diabetes_risk = Column(Float, nullable=False)
    cardiovascular_risk = Column(Float, nullable=False)
    ckd_risk = Column(Float, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    model_version = Column(String(50), default="gbm-v1.0")

    patient = relationship("User", back_populates="risk_scores")


class Alert(Base):
    """Clinical alert generated by the monitoring agent."""

    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    alert_type = Column(Enum(AlertTypeEnum), nullable=False)
    severity = Column(Enum(SeverityEnum), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    source_lab_name = Column(String(100))
    ml_score = Column(Float)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    read_at = Column(DateTime(timezone=True))

    patient = relationship("User", back_populates="alerts")


class DocumentChunk(Base):
    """Vector embedding chunk for Semantic Search."""

    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(768))  # PubMedBERT output dimension
    entity_types = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Note: the HNSW/IVFFlat index should ideally be created via Alembic migration.

    patient = relationship("User")
    document = relationship("Document")


class Consultation(Base):
    """Scheduled consultation between a patient and clinician."""

    __tablename__ = "consultations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    doctor_name = Column(String(200), nullable=False)
    slot_time = Column(DateTime(timezone=True), nullable=False)
    reason = Column(Text)
    status = Column(Enum(ConsultationStatusEnum), default=ConsultationStatusEnum.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])


class Message(Base):
    """Secure message between two VitaSync users."""

    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
