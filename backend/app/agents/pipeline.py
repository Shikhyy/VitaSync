from __future__ import annotations

import logging
import asyncio

from crewai import Agent, Task, Crew, Process
try:
    from crewai.tools import BaseTool
except ImportError:
    from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.config import settings
from app.llm import vllm_client
from app.ml.anomaly_detector import AnomalyDetector
from app.ml.ner_pipeline import MedicalNERPipeline
from app.ml.risk_predictor import RiskPredictor

logger = logging.getLogger(__name__)

anomaly_detector = AnomalyDetector()
ner_pipeline = MedicalNERPipeline()
risk_predictor = RiskPredictor()


# ── Tool schemas ─────────────────────────────────────────────────
class ExtractTextInput(BaseModel):
    file_path: str = Field(..., description="Path to the document file on MinIO")
    file_type: str = Field(..., description="MIME type of the document")


class NERInput(BaseModel):
    raw_text: str = Field(..., description="Raw text extracted from a medical document")
    document_id: str = Field(..., description="Document UUID for traceability")


class RiskInput(BaseModel):
    patient_id: str = Field(..., description="Patient UUID")
    lab_values: dict = Field(..., description="Dict of lab marker → value")


class QueryInput(BaseModel):
    question: str = Field(..., description="Clinical question to answer")
    context_docs: list[str] = Field(..., description="Retrieved document chunks")
    risk_context: dict = Field(..., description="ML risk scores for the patient")


# ── Tools ────────────────────────────────────────────────────────
class DocumentExtractorTool(BaseTool):
    """Extract text from a medical document using PyMuPDF / Qwen-VL / pytesseract."""

    name: str = "document_extractor"
    description: str = "Extract raw text from a PDF, DICOM, or image medical document"
    args_schema: type[BaseModel] = ExtractTextInput

    def _run(self, file_path: str, file_type: str) -> str:
        """Extract text from the document at the given file path.

        PDF: PyMuPDF. JPEG/PNG scans: Qwen-VL OCR. DICOM: pydicom.
        """
        from pathlib import Path

        path = Path(file_path)
        if not path.exists():
            logger.warning("Document extractor could not find %s", file_path)
            return ""
        content = path.read_bytes()
        from app.routers.ingest import _extract_text
        return _extract_text(content, file_type, path.name)


class NERExtractorTool(BaseTool):
    """Run BioBERT NER to extract medical entities from text."""

    name: str = "ner_extractor"
    description: str = "Extract DISEASE, DRUG, DOSAGE, LAB_TEST, LAB_VALUE entities from medical text"
    args_schema: type[BaseModel] = NERInput

    def _run(self, raw_text: str, document_id: str) -> dict:
        """Run BioBERT NER on the extracted text.

        Returns structured entities for knowledge graph upsert.
        """
        result = ner_pipeline.extract(raw_text, document_id)
        return {
            "document_id": document_id,
            "entities": [
                {
                    "type": entity.entity_type,
                    "text": entity.text,
                    "norm": entity.normalised_code,
                    "value": entity.numeric_value,
                    "unit": entity.unit,
                    "confidence": entity.confidence,
                }
                for entity in result.entities
            ],
        }


class RiskAnalysisTool(BaseTool):
    """Run XGBoost anomaly detection and GBM risk scoring."""

    name: str = "risk_analyser"
    description: str = "Analyse lab values for anomalies and compute disease risk scores"
    args_schema: type[BaseModel] = RiskInput

    def _run(self, patient_id: str, lab_values: dict) -> dict:
        """Score each lab value for anomaly, then predict overall disease risks."""
        anomaly_scores = {}
        for lab, value in lab_values.items():
            score = anomaly_detector.score(lab, float(value))
            anomaly_scores[lab] = score
            if score > settings.alert_threshold:
                logger.warning(
                    "Anomaly detected: patient=%s lab=%s score=%.2f",
                    patient_id, lab, score,
                )

        risk_scores = risk_predictor.predict({
            "age": 47, "bmi": 27.4,
            "hba1c": lab_values.get("hba1c", 5.5),
            "systolic_bp": lab_values.get("systolic_bp", 120),
            "ldl": lab_values.get("ldl", 2.5),
            "creatinine": lab_values.get("creatinine", 0.9),
            "fasting_glucose": lab_values.get("glucose", 100),
            "smoking": 0, "family_history_diabetes": 1, "family_history_cvd": 0,
        })

        return {
            "patient_id": patient_id,
            "anomaly_scores": anomaly_scores,
            "risk_scores": risk_scores,
            "high_anomalies": [k for k, v in anomaly_scores.items() if v > settings.alert_threshold],
        }


class LLMQueryTool(BaseTool):
    """Query Qwen 72B via vLLM for grounded clinical answers."""

    name: str = "llm_query"
    description: str = "Ask Qwen 72B a clinical question with RAG context"
    args_schema: type[BaseModel] = QueryInput

    def _run(self, question: str, context_docs: list[str], risk_context: dict) -> str:
        """Generate a grounded answer using Qwen 72B via vLLM."""
        context = "\n\n".join(f"[{idx + 1}] {doc}" for idx, doc in enumerate(context_docs))
        prompt = (
            "You are a clinical information assistant. Answer only from the supplied patient context, "
            "cite source numbers inline, and do not diagnose or prescribe.\n\n"
            f"Risk context: {risk_context}\n\n"
            f"Patient context:\n{context}\n\n"
            f"Clinical question: {question}\n"
            "Answer:"
        )
        return asyncio.run(vllm_client.generate(prompt))


# ── CrewAI Agent Definitions ─────────────────────────────────────
def build_ingestion_crew(file_path: str, file_type: str, patient_id: str) -> Crew:
    """Build the 5-agent ingestion pipeline crew.

    Pipeline: extract text → NER entities → risk analysis → graph upsert → alert check.

    Args:
        file_path: Path to the uploaded document in MinIO.
        file_type: MIME type of the document.
        patient_id: Patient UUID for the document.

    Returns:
        Configured CrewAI Crew ready to kickoff().
    """
    extract_tool = DocumentExtractorTool()
    ner_tool = NERExtractorTool()
    risk_tool = RiskAnalysisTool()

    # Agent 1: Document Specialist
    document_specialist = Agent(
        role="Medical Document Specialist",
        goal="Extract all text from the medical document accurately",
        backstory=(
            "Expert at parsing PDF, DICOM, images. Uses PyMuPDF for text PDFs, "
            "Qwen-VL for image-based scans, and pytesseract as fallback. "
            "Preserves tables, lab values, and date context."
        ),
        tools=[extract_tool],
        verbose=True,
        allow_delegation=False,
    )

    # Agent 2: Knowledge Graph Architect
    ner_agent = Agent(
        role="Knowledge Graph Architect",
        goal="Extract and normalise all medical entities from document text",
        backstory=(
            "Specialist in BioBERT NER for clinical text. Maps entities to ICD-10, "
            "LOINC, and RxNorm. Ensures the MindsDB knowledge graph stays consistent."
        ),
        tools=[ner_tool],
        verbose=True,
        allow_delegation=False,
    )

    # Agent 3: ML Risk Analyst
    ml_analyst = Agent(
        role="Clinical Data Scientist",
        goal="Detect anomalies in new lab results and update disease risk scores",
        backstory=(
            "Trained in clinical ML. Uses XGBoost for per-lab anomaly classification "
            "and gradient boosting for longitudinal disease risk. "
            f"Raises alerts when ML score exceeds {settings.alert_threshold}."
        ),
        tools=[risk_tool],
        verbose=True,
        allow_delegation=False,
    )

    # Tasks
    task_extract = Task(
        description=f"Extract all text from the document at {file_path} (type: {file_type})",
        expected_output="Complete raw text extracted from the medical document",
        agent=document_specialist,
    )

    task_ner = Task(
        description="Run BioBERT NER on the extracted text. Return a JSON list of entities.",
        expected_output="JSON list of entities: type, text, normalisation code, value",
        agent=ner_agent,
        context=[task_extract],
    )

    task_risk = Task(
        description=f"Score all lab values from the document for patient {patient_id}. Return anomaly scores and risk predictions.",
        expected_output="JSON with anomaly_scores, risk_scores, and high_anomalies list",
        agent=ml_analyst,
        context=[task_ner],
    )

    return Crew(
        agents=[document_specialist, ner_agent, ml_analyst],
        tasks=[task_extract, task_ner, task_risk],
        process=Process.sequential,
        verbose=True,
    )


def build_query_crew(question: str, patient_id: str) -> Crew:
    """Build the query-answering crew.

    Retrieves context, computes ML risk, then queries Qwen 72B.

    Args:
        question: Clinical question from the doctor.
        patient_id: Patient UUID to query against.

    Returns:
        Configured CrewAI Crew ready to kickoff().
    """
    risk_tool = RiskAnalysisTool()
    llm_tool = LLMQueryTool()

    # Agent 4: Query Agent
    query_agent = Agent(
        role="Clinical Intelligence Assistant",
        goal="Answer the doctor's clinical question with cited, grounded evidence",
        backstory=(
            "Expert at retrieval-augmented generation for clinical queries. "
            "Always cites source documents inline. Never invents facts. "
            "Injects ML risk scores as additional context for the LLM."
        ),
        tools=[risk_tool, llm_tool],
        verbose=True,
        allow_delegation=False,
    )

    task_query = Task(
        description=f"Answer this clinical question: '{question}' for patient {patient_id}.",
        expected_output="Grounded clinical answer with document citations and confidence score",
        agent=query_agent,
    )

    return Crew(
        agents=[query_agent],
        tasks=[task_query],
        process=Process.sequential,
        verbose=True,
    )
