from __future__ import annotations

import logging

from app.config import settings

logger = logging.getLogger(__name__)


class MedicalSemanticSearch:
    """RAG Semantic Search using PubMedBERT and pgvector.

    In dev mode: returns no persisted records unless a vector store is configured.
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
            return await self._keyword_search(patient_id, query, top_k)
        try:
            return await self._vector_search(patient_id, query, top_k)
        except Exception as e:
            logger.warning("Vector search unavailable; using persisted keyword search: %s", e)
            return await self._keyword_search(patient_id, query, top_k)

    async def _keyword_search(self, patient_id: str, query: str, top_k: int) -> list[dict]:
        """Return grounded chunks from persisted uploads without synthetic fallback data."""
        import re
        import uuid

        from sqlalchemy import select

        from app.db.session import AsyncSessionLocal
        from app.models.models import DocumentChunk

        terms = [term.lower() for term in re.findall(r"[a-zA-Z0-9]{3,}", query)][:12]
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(DocumentChunk)
                .where(DocumentChunk.patient_id == uuid.UUID(patient_id))
                .order_by(DocumentChunk.created_at.desc())
                .limit(50)
            )
            chunks = result.all()

        ranked: list[dict] = []
        for chunk in chunks:
            text_lower = chunk.chunk_text.lower()
            hits = sum(1 for term in terms if term in text_lower)
            similarity = hits / max(len(terms), 1)
            if similarity > 0 or not terms:
                ranked.append({
                    "text": chunk.chunk_text,
                    "document_id": str(chunk.document_id),
                    "similarity": max(similarity, 0.05),
                })

        ranked.sort(key=lambda item: item["similarity"], reverse=True)
        return ranked[:top_k]

    async def _vector_search(self, patient_id: str, query: str, top_k: int) -> list[dict]:
        """Execute pgvector similarity search against the database."""
        from app.db.session import AsyncSessionLocal
        from sqlalchemy import text

        # Encode the query string to a 768D vector
        query_embedding = self._embedder.encode([query])[0].tolist()

        # Build raw SQL for pgvector cosine distance search (<=>)
        sql = text("""
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
