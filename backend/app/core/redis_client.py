import redis
from ..config import settings

_redis_client = None

def get_redis_client():
    """Get or create Redis client singleton"""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client