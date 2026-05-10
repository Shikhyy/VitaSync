from __future__ import annotations

import logging
import time
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.ml.risk_predictor import RiskPredictor
from app.routers.auth import get_current_user
from app.routers.consent import get_active_consent
from app.schemas.query import QueryRequest, QueryResponse, QuerySource
from app.x402 import PAYMENT_RESPONSE_HEADER, require_x402_payment

logger = logging.getLogger(__name__)
router = APIRouter()

risk_predictor = RiskPredictor()


@router.post("/{patient_id}", response_model=QueryResponse)
async def query_patient_brain(
    patient_id: str,
    body: QueryRequest,
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
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

    consent = await get_active_consent(patient_id, current_user["id"], db)
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have an approved consent agreement to query this patient's medical brain. Please request consent first."
        )

    payment_response = await require_x402_payment(
        request=request,
        consent=consent,
        resource=str(request.url),
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

    consent.query_count = (consent.query_count or 0) + 1
    consent.total_earned = (consent.total_earned or 0.0) + float(consent.price_per_query or 0.0)
    await db.flush()

    if payment_response:
        response.headers[PAYMENT_RESPONSE_HEADER] = payment_response
        response.headers["X-PAYMENT-RESPONSE"] = payment_response

    return QueryResponse(
        query_id=str(uuid4()),
        answer=answer,
        sources=[
            QuerySource(
                title=f"Document {s.get('document_id', 'Unknown')}",
                date="Unknown",
                source="Extracted Data",
                relevance=s.get("similarity", 0.85),
            )
            for s in sources
        ],
        confidence=confidence,
        latency_ms=latency_ms,
        ml_context=risk_context,
    )
