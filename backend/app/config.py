from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "YouTube Script Generator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/scriptgen"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File Paths
    TEMP_AUDIO_PATH: str = "./temp_audio"
    GENERATED_SCRIPTS_PATH: str = "./generated_scripts"
    
    # Whisper Model
    WHISPER_MODEL: str = "base"  # tiny, base, small, medium, large
    
    # Limits
    MAX_VIDEO_DURATION: int = 3600  # 1 hour in seconds
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Create directories if they don't exist
os.makedirs(settings.TEMP_AUDIO_PATH, exist_ok=True)
os.makedirs(settings.GENERATED_SCRIPTS_PATH, exist_ok=True)