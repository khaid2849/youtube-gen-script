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
        if not current_user.is_pro and usage.videos_processed_today >= 5:
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
def get_transcription_status(task_id: str):
    """Get the status of a transcription task"""
    
    task = process_youtube_video.AsyncResult(task_id)
    
    if task.state == 'PENDING':
        response = {
            'task_id': task_id,
            'status': 'pending',
            'progress': 0,
            'message': 'Task is waiting to be processed'
        }
    elif task.state == 'PROGRESS':
        response = {
            'task_id': task_id,
            'status': 'processing',
            'progress': task.info.get('current', 0),
            'message': task.info.get('status', '')
        }
    elif task.state == 'SUCCESS':
        response = {
            'task_id': task_id,
            'status': 'completed',
            'progress': 100,
            'message': 'Script generated successfully',
            'script_id': task.info.get('script_id')
        }
    else:  # FAILURE
        response = {
            'task_id': task_id,
            'status': 'failed',
            'progress': 0,
            'message': str(task.info)
        }
    
    return ProcessingStatus(**response)