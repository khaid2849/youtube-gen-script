from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .config import settings
from .database import engine, Base
from .api.endpoints import transcription, scripts, users

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if os.path.exists(settings.GENERATED_SCRIPTS_PATH):
    app.mount("/scripts", StaticFiles(directory=settings.GENERATED_SCRIPTS_PATH), name="scripts")

# Include routers
app.include_router(
    users.router,
    prefix=f"{settings.API_V1_STR}/users",
    tags=["users"]
)

app.include_router(
    transcription.router,
    prefix=f"{settings.API_V1_STR}/transcribe",
    tags=["transcription"]
)

app.include_router(
    scripts.router,
    prefix=f"{settings.API_V1_STR}/scripts",
    tags=["scripts"]
)

@app.get("/")
def root():
    return {
        "message": "YouTube Script Generator API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}