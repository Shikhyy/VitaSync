from __future__ import annotations

import logging

from celery import Celery

from app.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "vitasync",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.ingest_task", "app.tasks.monitor_task"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Celery beat schedule: run monitoring agent every 10 minutes
    beat_schedule={
        "monitor-all-patients": {
            "task": "app.tasks.monitor_task.run_monitoring_cycle",
            "schedule": 600.0,  # seconds (10 minutes)
        },
    },
)
