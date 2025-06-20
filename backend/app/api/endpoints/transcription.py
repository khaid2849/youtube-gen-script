import json

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, date

from ...database import get_db
from ...models import Script, User, UserUsage
from ...schemas import ScriptCreate, ProcessingStatus
from ...dependencies import get_optional_current_user
from ...workers.tasks import process_youtube_video
from ...core.youtube_downloader import YouTubeDownloader
from ...core.redis_client import get_redis_client

router = APIRouter()

@router.post("/", response_model=ProcessingStatus)
async def create_transcription(
    script_data: ScriptCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Start transcription process for a YouTube video"""
    
    # Check user limits if logged in
    if current_user:
        usage = db.query(UserUsage).filter(UserUsage.user_id == current_user.id).first()
        
        # Reset daily count if needed
        if usage.last_reset_date.date() < date.today():
            usage.videos_processed_today = 0
            usage.last_reset_date = datetime.utcnow()
            db.commit()
        
        # Check limits
        if not current_user.is_pro and usage.videos_processed_today >= 500000:
            raise HTTPException(
                status_code=429,
                detail="Daily limit reached. Upgrade to Pro for unlimited videos."
            )
    
    # Validate YouTube URL
    downloader = YouTubeDownloader()
    try:
        video_info = downloader.extract_video_info(str(script_data.video_url))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid YouTube URL or video not accessible: {str(e)}"
        )
    
    # Create script record
    db_script = Script(
        user_id=current_user.id if current_user else None,
        video_url=str(script_data.video_url),
        video_title=video_info.get('title'),
        status='pending'
    )
    db.add(db_script)
    db.commit()
    db.refresh(db_script)
    
    # Update user usage if logged in
    if current_user:
        usage.videos_processed_today += 1
        usage.total_videos_processed += 1
        db.commit()
    
    # Start async processing
    task = process_youtube_video.delay(
        script_id=db_script.id,
        video_url=str(script_data.video_url),
        user_id=current_user.id if current_user else None
    )
    
    return ProcessingStatus(
        task_id=task.id,
        status="processing",
        progress=0,
        message="Video processing started"
    )

@router.get("/status/{task_id}", response_model=ProcessingStatus)
def get_transcription_status(task_id: str, db: Session = Depends(get_db)):
    """Get the status of a transcription task"""
    
    redis_client = get_redis_client()
    
    # First, try to get result from Redis
    task_result_str = redis_client.get(f"task_result:{task_id}")
    
    if task_result_str:
        # We have a result in Redis
        task_result = json.loads(task_result_str)
        print(f"Task {task_id} result from Redis: {task_result}")
        
        return ProcessingStatus(
            task_id=task_id,
            status='completed' if task_result.get('state') == 'SUCCESS' else 
                    'failed' if task_result.get('state') == 'FAILURE' else 'processing',
            progress=task_result.get('progress', 0),
            message=task_result.get('status', 'Processing...'),
            script_id=task_result.get('script_id')
        )
    
    # Fallback to checking task data
    task_data_str = redis_client.get(f"task:{task_id}")
    if task_data_str:
        task_data = json.loads(task_data_str)
        script_id = task_data.get('script_id')
    else:
        script_id = None
    
    # Check Celery task state
    task = process_youtube_video.AsyncResult(task_id)
    
    print(f"Task {task_id} Celery state: {task.state}, script_id: {script_id}")
    
    if task.state == 'PENDING':
        response = {
            'task_id': task_id,
            'status': 'pending',
            'progress': 0,
            'message': 'Task is waiting to be processed',
            'script_id': script_id
        }
    elif task.state == 'PROGRESS':
        meta = task.info or {}
        response = {
            'task_id': task_id,
            'status': 'processing',
            'progress': meta.get('current', 0),
            'message': meta.get('status', 'Processing...'),
            'script_id': script_id
        }
    elif task.state == 'SUCCESS':
        # Even on success, prefer our Redis data
        response = {
            'task_id': task_id,
            'status': 'completed',
            'progress': 100,
            'message': 'Script generated successfully',
            'script_id': script_id
        }
    else:  # FAILURE
        response = {
            'task_id': task_id,
            'status': 'failed',
            'progress': 0,
            'message': str(task.info) if task.info else 'Task failed',
            'script_id': script_id
        }
    
    return ProcessingStatus(**response)