from __future__ import annotations

import logging
from typing import TypedDict

from langgraph.graph import StateGraph, END
from app.ml.semantic_search import MedicalSemanticSearch
from app.ml.risk_predictor import RiskPredictor
from app.llm import vllm_client

logger = logging.getLogger(__name__)

semantic_search = MedicalSemanticSearch()
risk_predictor = RiskPredictor()

class QueryState(TypedDict):
    patient_id: str
    question: str
    context_docs: list[dict]
    ml_context: dict
    llm_draft: str
    confidence: float
    final_answer: str
    search_iterations: int


async def semantic_search_node(state: QueryState) -> QueryState:
    """Step 1: Retrieve context from pgvector."""
    logger.info("Executing semantic_search_node")
    docs = await semantic_search.search(state["patient_id"], state["question"], top_k=5)
    state["context_docs"] = docs
    state["search_iterations"] += 1
    return state


async def ml_context_node(state: QueryState) -> QueryState:
    """Step 2: Get patient's ML risk scores."""
    logger.info("Executing ml_context_node")
    risk = risk_predictor.get_risk_summary(state["patient_id"])
    state["ml_context"] = risk
    return state


async def llm_reasoning_node(state: QueryState) -> QueryState:
    """Step 3: Generate answer using vLLM + Qwen 72B."""
    logger.info("Executing llm_reasoning_node")
    
    context_str = "\n".join([
        f"Doc {d['document_id']} (sim: {d['similarity']:.2f}): {d['text']}" 
        for d in state["context_docs"]
    ])
    
    prompt = f"""You are a clinical information assistant. You provide information from patient records but do not make diagnoses, prescribe treatments, or replace professional medical judgement. Always cite source documents.

    Answer the question based ONLY on the provided context. Cite the document IDs in your answer (e.g. [Doc doc-001]).
    
    Patient ML Risk Context:
    {state['ml_context']}
    
    Retrieved Records:
    {context_str}
    
    Question: {state['question']}
    Answer:"""
    
    answer = await vllm_client.generate(prompt)
    
    state["llm_draft"] = answer
    state["confidence"] = 0.9 if len(state["context_docs"]) > 0 else 0.4
    return state


async def citation_check_node(state: QueryState) -> QueryState:
    """Step 4: Verify citations."""
    logger.info("Executing citation_check_node")
    # Simple check: does the draft contain the word 'Doc'?
    if "Doc" not in state["llm_draft"] and state["confidence"] > 0.5:
        # Penalize confidence if missing citations
        state["confidence"] -= 0.2
    return state


async def format_response_node(state: QueryState) -> QueryState:
    """Step 5: Final output formatting."""
    logger.info("Executing format_response_node")
    state["final_answer"] = state["llm_draft"]
    return state


def build_query_graph():
    """Build and compile the LangGraph state machine."""
    workflow = StateGraph(QueryState)

    workflow.add_node("semantic_search_step", semantic_search_node)
    workflow.add_node("ml_context_step", ml_context_node)
    workflow.add_node("llm_reasoning_step", llm_reasoning_node)
    workflow.add_node("citation_check_step", citation_check_node)
    workflow.add_node("format_response_step", format_response_node)

    workflow.set_entry_point("semantic_search_step")
    workflow.add_edge("semantic_search_step", "ml_context_step")
    workflow.add_edge("ml_context_step", "llm_reasoning_step")
    workflow.add_edge("llm_reasoning_step", "citation_check_step")

    # Conditional edge: if confidence < 0.6 and we haven't searched too much, search again
    def check_confidence(state: QueryState) -> str:
        if state["confidence"] < 0.6 and state["search_iterations"] < 2:
            logger.info("Confidence low (%.2f), running search again", state["confidence"])
            return "semantic_search"
        return "format_response"

    workflow.add_conditional_edges(
        "citation_check_step",
        check_confidence,
        {
            "semantic_search": "semantic_search_step",
            "format_response": "format_response_step"
        }
    )

    workflow.add_edge("format_response_step", END)
    
    return workflow.compile()

# Global compiled graph instance
query_graph = build_query_graph()
