from celery import Celery
from ..config import settings

celery_app = Celery(
    'youtube_script_generator',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['app.workers.tasks']
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    result_expires=3600,  # Results expire after 1 hour
    task_track_started=True,
    task_time_limit=3600,  # Hard time limit of 1 hour
    task_soft_time_limit=3000,  # Soft time limit of 50 minutes
)