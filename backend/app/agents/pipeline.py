from __future__ import annotations

import logging

from crewai import Agent, Task, Crew, Process
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

from app.config import settings
from app.ml.anomaly_detector import AnomalyDetector
from app.ml.risk_predictor import RiskPredictor

logger = logging.getLogger(__name__)

anomaly_detector = AnomalyDetector()
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
        if settings.dev_mode:
            return f"[DEV MODE] Extracted text from {file_path} ({file_type}). " \
                   "Patient: 47F. Diagnosis: T2DM. HbA1c: 7.2%. BP: 128/82mmHg."
        # Production implementation stub
        raise NotImplementedError("Connect PyMuPDF / Qwen-VL in production")


class NERExtractorTool(BaseTool):
    """Run BioBERT NER to extract medical entities from text."""

    name: str = "ner_extractor"
    description: str = "Extract DISEASE, DRUG, DOSAGE, LAB_TEST, LAB_VALUE entities from medical text"
    args_schema: type[BaseModel] = NERInput

    def _run(self, raw_text: str, document_id: str) -> dict:
        """Run BioBERT NER on the extracted text.

        Returns structured entities for knowledge graph upsert.
        """
        import asyncio
        from app.db.mindsdb import mindsdb_client
        
        # In production this would be real BioBERT inference
        entities = [
            {"type": "DISEASE", "text": "Type 2 Diabetes Mellitus", "norm": "E11"},
            {"type": "LAB_TEST", "text": "HbA1c", "norm": "4548-4"},
            {"type": "LAB_VALUE", "text": "7.2%", "value": 7.2, "unit": "%"},
            {"type": "DRUG", "text": "Metformin", "norm": "DB00331"},
            {"type": "DOSAGE", "text": "500mg twice daily"},
        ]
        
        # Trigger the async graph upsert using event loop if needed, but since tools run synchronously in CrewAI by default:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(mindsdb_client.upsert_graph_nodes(entities, "patient-uuid"))
            else:
                loop.run_until_complete(mindsdb_client.upsert_graph_nodes(entities, "patient-uuid"))
        except Exception as e:
            logger.warning("Graph upsert bypassed in CrewAI sync execution: %s", e)
            
        if settings.dev_mode:
            return {
                "document_id": document_id,
                "entities": entities,
            }
        raise NotImplementedError("Deploy BioBERT in production")


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
        """Generate a grounded answer using Qwen 72B via vLLM.

        In dev mode: returns a mock answer.
        """
        if settings.dev_mode:
            return f"[DEV MODE] Answer to '{question}': Based on {len(context_docs)} documents retrieved. " \
                   f"Risk context: {risk_context}. Connect vLLM for real Qwen 72B inference."
        raise NotImplementedError("Start vLLM server in production")


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
