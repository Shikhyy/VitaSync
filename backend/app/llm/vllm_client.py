from __future__ import annotations

import logging
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize the OpenAI client targeting our local vLLM instance
vllm_client = AsyncOpenAI(
    base_url=settings.vllm_url + "/v1",
    api_key="vitasync-local",  # Mock key for local vLLM
)


async def generate(prompt: str, max_tokens: int = 512, temperature: float = 0.1) -> str:
    """Generate a response using Qwen 72B via vLLM.
    
    If in DEV_MODE, returns a mock response instantly.
    """
    if settings.dev_mode:
        return (
            "[DEV MODE] Based on the retrieved records, the patient has a history of "
            "Type 2 Diabetes Mellitus diagnosed in 2021. Their latest HbA1c is 7.2%, "
            "and they are currently taking Metformin 500mg twice daily. "
            "The risk prediction model suggests a moderate risk factor. "
            "Please start the vLLM container for real inference."
        )

    try:
        response = await vllm_client.chat.completions.create(
            model="Qwen/Qwen2.5-72B-Instruct",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error("vLLM connection failed: %s", e)
        return f"Error contacting vLLM service: {e}"
