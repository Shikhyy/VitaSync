from __future__ import annotations

import logging

from fastapi import HTTPException, status
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize the OpenAI client targeting our local vLLM instance
vllm_client = AsyncOpenAI(
    base_url=settings.vllm_url + "/v1",
    api_key="vitasync-local",
)


async def generate(prompt: str, max_tokens: int = 512, temperature: float = 0.1) -> str:
    """Generate a response using Qwen via the configured vLLM endpoint."""
    try:
        response = await vllm_client.chat.completions.create(
            model=settings.vllm_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error("vLLM connection failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Qwen inference via vLLM is unavailable",
        ) from e
