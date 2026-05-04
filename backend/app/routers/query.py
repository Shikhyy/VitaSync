from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.ml.risk_predictor import RiskPredictor
from app.routers.auth import get_current_user
from app.schemas.query import QueryRequest, QueryResponse, QuerySource

logger = logging.getLogger(__name__)
router = APIRouter()

risk_predictor = RiskPredictor()

# Mock knowledge base for dev mode
_DEV_DOCS = [
    {"id": "d1", "title": "ECG Report", "date": "2023-09-05", "source": "Cardiology Centre",
     "content": "Normal sinus rhythm. No ST-segment changes. PR interval 160ms. QRS 90ms."},
    {"id": "d2", "title": "Cardiology Referral Note", "date": "2023-11-20", "source": "Apollo Hospital",
     "content": "No arrhythmia detected on 24-hour Holter monitoring. Echocardiogram shows normal LV function EF 62%."},
    {"id": "d3", "title": "Lab Report", "date": "2024-03-14", "source": "City Diagnostic Lab",
     "content": "HbA1c 7.2%. Creatinine 0.9 mg/dL. eGFR 82. LDL 2.4 mmol/L. HDL 1.1 mmol/L."},
]


@router.post("/{patient_id}", response_model=QueryResponse)
async def query_patient_brain(
    patient_id: str,
    body: QueryRequest,
    current_user: dict = Depends(get_current_user),
) -> QueryResponse:
    """Query a patient's medical brain using RAG + Qwen 72B.

    Pipeline:
    1. Validate consent (X402 check in production).
    2. ML risk pre-computation for context injection.
    3. PubMedBERT semantic search → top-5 document chunks.
    4. Construct grounded prompt with ML context.
    5. Qwen 72B generation via vLLM.
    6. Return answer with inline citations and ML context.

    Args:
        patient_id: UUID of the patient being queried.
        body: Clinical question text.
        current_user: Authenticated doctor from JWT.

    Returns:
        Grounded answer with sources, confidence score, and ML context.

    Raises:
        HTTPException 403: If doctor does not have consent to query this patient.
        HTTPException 503: If vLLM inference server is unavailable.
    """
    if current_user["role"] != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clinicians can query patient records",
        )

    # Consent check (X402 gate)
    from app.routers.consent import _CONSENTS
    
    # Check if this doctor has an approved consent for this patient
    has_consent = False
    for c in _CONSENTS.values():
        if c["patient_id"] == patient_id and c["doctor_id"] == current_user["id"] and c["status"] == "approved":
            has_consent = True
            break
            
    if not has_consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have an approved consent agreement to query this patient's medical brain. Please request consent first."
        )

    logger.info(
        "Query initiated: doctor=%s patient=%s (Consent verified)",
        current_user["id"],
        patient_id,
    )

    start_time = time.time()

    # Import the compiled LangGraph workflow
    from app.agents.langgraph_flow import query_graph

    # Initialize the state for the graph
    initial_state = {
        "patient_id": patient_id,
        "question": body.question,
        "context_docs": [],
        "ml_context": {},
        "llm_draft": "",
        "confidence": 0.0,
        "final_answer": "",
        "search_iterations": 0
    }

    # Execute the LangGraph workflow
    final_state = await query_graph.ainvoke(initial_state)

    answer = final_state["final_answer"]
    confidence = final_state["confidence"]
    sources = final_state["context_docs"]
    risk_context = final_state["ml_context"]

    latency_ms = int((time.time() - start_time) * 1000)
    logger.info("Query complete: latency_ms=%d confidence=%.2f", latency_ms, confidence)

    return QueryResponse(
        query_id=str(uuid4()),
        answer=answer,
        sources=[
            QuerySource(
                title=f"Document {s.get('document_id', 'Unknown')}",
                date="Unknown", # we don't have date in the chunk currently
                source="Extracted Data",
                relevance=s.get("similarity", 0.85),
            )
            for s in sources
        ],
        confidence=confidence,
        latency_ms=latency_ms,
        ml_context=risk_context,
    )


def _semantic_search(question: str, top_k: int = 5) -> list[dict]:
    """Semantic search over patient documents (dev-mode stub).

    In production: calls MindsDB vector search with PubMedBERT embeddings.
    """
    scored = []
    q_lower = question.lower()
    for doc in _DEV_DOCS:
        overlap = sum(1 for w in q_lower.split() if w in doc["content"].lower())
        scored.append({**doc, "relevance": min(0.5 + overlap * 0.1, 0.99)})
    scored.sort(key=lambda d: d["relevance"], reverse=True)
    return scored[:top_k]


def _dev_mode_answer(question: str, sources: list[dict], risk_context: dict) -> str:
    """Generate a mock LLM answer for local development.

    This is purely for frontend testing — no real LLM is called.
    """
    if "cardiac" in question.lower() or "heart" in question.lower():
        return (
            "No documented cardiac events found in the patient's records. "
            "One ECG performed on 5 September 2023 was reported as normal sinus rhythm "
            "with no ST-segment changes. A cardiology referral note from November 2023 "
            "notes no arrhythmia detected on 24-hour Holter monitoring. "
            f"The patient's cardiovascular risk score is currently "
            f"{int(risk_context['cardiovascular'] * 100)}% (low-to-moderate) based on "
            "ML risk modelling of their lab history."
        )
    return (
        f"Based on {len(sources)} retrieved document(s), the answer to your question is: "
        "The patient's medical records have been reviewed and the relevant information "
        "is summarised from the source documents listed. "
        "(Dev mode — connect vLLM for real Qwen 72B inference.)"
    )


async def _vllm_query(
    question: str,
    sources: list[dict],
    risk_context: dict,
) -> tuple[str, float]:
    """Query Qwen 72B via vLLM OpenAI-compatible endpoint.

    Args:
        question: Clinical question from the doctor.
        sources: Retrieved document chunks with content.
        risk_context: ML risk scores for the patient.

    Returns:
        Tuple of (answer_text, confidence_score).
    """
    import httpx

    context_docs = "\n\n".join(
        f"[{i+1}] {s['title']} ({s['date']}, {s['source']}):\n{s.get('content', '')}"
        for i, s in enumerate(sources)
    )

    system_prompt = (
        "You are a clinical AI assistant helping a licensed doctor review a patient's medical records. "
        "Answer only based on the provided documents. Cite document numbers inline (e.g., [1]). "
        "If the information is not in the documents, say so clearly. "
        "NEVER diagnose or recommend treatment — only summarise factual information from records. "
        f"Patient ML risk context: Diabetes {int(risk_context['diabetes']*100)}%, "
        f"Cardiovascular {int(risk_context['cardiovascular']*100)}%, "
        f"CKD {int(risk_context['ckd']*100)}%."
    )

    payload = {
        "model": settings.vllm_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Documents:\n{context_docs}\n\nQuestion: {question}"},
        ],
        "temperature": 0.1,
        "max_tokens": 1024,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{settings.vllm_url}/v1/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            # Estimate confidence from logprob if available, else use fixed
            confidence = data.get("choices", [{}])[0].get("logprobs", {}).get("confidence", 0.88)
            return answer, confidence
        except httpx.RequestError as e:
            logger.error("vLLM connection error: %s", e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM inference server unavailable. Is vLLM running?",
            ) from e
