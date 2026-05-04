from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, ingest, query, consent, monitor, health, prescribe

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models once at startup."""
    logger.info("VitaSync API starting — loading ML models")
    # Models are loaded lazily via their singleton classes.
    # In production on AMD MI300X: vLLM server must be running first.
    yield
    logger.info("VitaSync API shutting down")


app = FastAPI(
    title="VitaSync API",
    version="1.0.0",
    description=(
        "Open-source, on-premise AI health intelligence platform. "
        "All inference runs locally on AMD MI300X via ROCm + vLLM."
    ),
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────
app.include_router(auth.router,    prefix="/auth",    tags=["auth"])
app.include_router(ingest.router,  prefix="/ingest",  tags=["ingestion"])
app.include_router(query.router,   prefix="/query",   tags=["query"])
app.include_router(prescribe.router, prefix="/prescribe", tags=["prescribe"])
app.include_router(consent.router, prefix="/consent", tags=["consent"])
app.include_router(monitor.router, prefix="/monitor", tags=["monitoring"])
app.include_router(health.router,  prefix="/health",  tags=["health"])
