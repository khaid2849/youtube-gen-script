# backend/app/config.py
from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory
backend_dir = Path(__file__).parent.parent
dotenv_path = backend_dir / ".env"
load_dotenv(dotenv_path)

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "YouTube Script Generator"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API
    API_V1_STR: str = "/api/v1"
    
    # Database - Now os.getenv will work
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/scriptgen")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Celery
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
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

settings = Settings()

# Create directories if they don't exist
os.makedirs(settings.TEMP_AUDIO_PATH, exist_ok=True)
os.makedirs(settings.GENERATED_SCRIPTS_PATH, exist_ok=True)