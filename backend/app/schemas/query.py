from __future__ import annotations

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=2000, description="Clinical question to ask")


class QuerySource(BaseModel):
    title: str
    date: str
    source: str
    relevance: float = Field(..., ge=0.0, le=1.0)


class QueryResponse(BaseModel):
    query_id: str
    answer: str
    sources: list[QuerySource]
    confidence: float = Field(..., ge=0.0, le=1.0)
    latency_ms: int
    ml_context: dict
