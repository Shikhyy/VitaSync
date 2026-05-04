from fastapi import APIRouter

router = APIRouter()


@router.get("/", summary="Healthcheck")
async def health() -> dict:
    """API liveness probe. Returns 200 when the API is running."""
    return {"status": "ok", "service": "vitasync-api"}
