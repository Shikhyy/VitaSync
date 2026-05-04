from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    In development: set via .env file.
    In production: set via Docker Compose environment block or Kubernetes secrets.
    """

    # Database
    database_url: str = "postgresql+asyncpg://vitasync:password@localhost:5432/vitasync"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # MindsDB
    mindsdb_url: str = "http://localhost:47334"

    # MinIO
    minio_url: str = "localhost:9000"
    minio_access_key: str = "vitasync"
    minio_secret_key: str = "password123"
    minio_bucket: str = "vitasync-documents"

    # vLLM (Qwen 72B on AMD MI300X)
    vllm_url: str = "http://localhost:8001"
    vllm_model: str = "Qwen/Qwen2.5-72B-Instruct"

    # Auth
    secret_key: str = "change-me-in-production-use-at-least-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # Dev mode — stubs out ML inference for local Mac development
    dev_mode: bool = True

    # Monitoring
    alert_threshold: float = 0.65  # ML score above which LLM is invoked

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
