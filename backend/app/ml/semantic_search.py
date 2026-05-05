from __future__ import annotations

import logging

from app.config import settings

logger = logging.getLogger(__name__)


class MedicalSemanticSearch:
    """RAG Semantic Search using PubMedBERT and pgvector.

    In dev mode: performs simple keyword search over mock data.
    In production: uses sentence-transformers to encode queries and
    queries the document_chunks pgvector table.
    """

    def __init__(self) -> None:
        self._embedder = None
        if not settings.dev_mode:
            self._load_model()

    def _load_model(self) -> None:
        """Load sentence-transformers model.

        Model: pritamdeka/S-PubMedBert-MS-MARCO
        Optimised for medical semantic search.
        """
        try:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer(
                "pritamdeka/S-PubMedBert-MS-MARCO",
                device="cpu",  # Use CPU or CUDA/ROCm
            )
            logger.info("Semantic Search model loaded")
        except Exception as e:
            logger.error("Failed to load Semantic Search model: %s", e)

    async def search(self, patient_id: str, query: str, top_k: int = 5) -> list[dict]:
        """Search patient's records for chunks semantically related to the query.

        Args:
            patient_id: Patient UUID to restrict search.
            query: Clinical query string.
            top_k: Number of results to return.

        Returns:
            List of dictionaries with 'text', 'document_id', and 'similarity'.
        """
        if settings.dev_mode or self._embedder is None:
            return await self._mock_search(query)
        return await self._vector_search(patient_id, query, top_k)

    async def _mock_search(self, query: str) -> list[dict]:
        """Return hardcoded mock results for local development."""
        query_lower = query.lower()
        if "diabetes" in query_lower or "hba1c" in query_lower:
            return [{
                "text": "Patient diagnosed with Type 2 Diabetes Mellitus in 2021. Latest HbA1c is 7.2%. Prescribed Metformin 500mg BD.",
                "document_id": "doc-001",
                "similarity": 0.92
            }]
        elif "blood pressure" in query_lower or "bp" in query_lower:
            return [{
                "text": "History of hypertension, well controlled. Average BP is 128/82. On Lisinopril 10mg OD.",
                "document_id": "doc-002",
                "similarity": 0.88
            }]
        else:
            return [{
                "text": "General health check unremarkable. No active complaints.",
                "document_id": "doc-003",
                "similarity": 0.45
            }]

    async def _vector_search(self, patient_id: str, query: str, top_k: int) -> list[dict]:
        """Execute pgvector similarity search against the database."""
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text

        # Encode the query string to a 768D vector
        query_embedding = self._embedder.encode([query])[0].tolist()

        # Build raw SQL for pgvector cosine distance search (<=>)
        sql = text(f"""
            SELECT document_id, chunk_text, 1 - (embedding <=> :embedding) AS similarity
            FROM document_chunks
            WHERE patient_id = :patient_id
            ORDER BY embedding <=> :embedding
            LIMIT :top_k
        """)

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                sql,
                {
                    "embedding": str(query_embedding),
                    "patient_id": patient_id,
                    "top_k": top_k
                }
            )
            rows = result.fetchall()

        return [
            {
                "text": row.chunk_text,
                "document_id": str(row.document_id),
                "similarity": float(row.similarity)
            }
            for row in rows
        ]
