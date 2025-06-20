from celery import Task
from .celery_app import celery_app
import os
import time
import traceback
import json
from datetime import datetime

@celery_app.task(bind=True, name='process_youtube_video')
def process_youtube_video(self, script_id: int, video_url: str, user_id: int = None):
    """Main task to process YouTube video"""
    
    # Import here to avoid circular imports
    from ..database import SessionLocal
    from ..models import Script
    from ..core.youtube_downloader import YouTubeDownloader
    from ..core.transcriber import WhisperTranscriber
    from ..core.formatter import ScriptFormatter
    from ..core.redis_client import get_redis_client
    
    db = SessionLocal()
    downloader = YouTubeDownloader()
    transcriber = WhisperTranscriber()
    formatter = ScriptFormatter()
    audio_path = None
    redis_client = get_redis_client()
    
    # Store task progress in Redis
    def update_task_status(progress, status, extra_data=None):
        task_data = {
            'task_id': self.request.id,
            'script_id': script_id,
            'progress': progress,
            'status': status,
            'state': 'PROGRESS' if progress < 100 else 'SUCCESS',
            'timestamp': datetime.utcnow().isoformat()
        }
        if extra_data:
            task_data.update(extra_data)
        
        # Store in Redis with task ID as key
        redis_client.set(
            f"task_result:{self.request.id}", 
            json.dumps(task_data), 
            ex=3600  # Expire in 1 hour
        )
        
        # Also update Celery state
        self.update_state(
            state='PROGRESS' if progress < 100 else 'SUCCESS',
            meta={'current': progress, 'total': 100, 'status': status}
        )
    
    try:
        print(f"Starting to process video: {video_url}")
        
        # Update task state - Extracting info
        update_task_status(10, 'Extracting video information...')
        
        # Get script record
        script = db.query(Script).filter(Script.id == script_id).first()
        if not script:
            raise Exception("Script record not found")
        
        # Update status to processing
        script.status = 'processing'
        db.commit()
        
        # Step 1: Extract video info and download audio
        update_task_status(20, 'Downloading audio...')
        
        print(f"Downloading audio from: {video_url}")
        audio_path, video_info = downloader.download_audio(video_url)
        print(f"Audio downloaded to: {audio_path}")
        
        # Update script with video info
        script.video_title = video_info['title']
        script.video_duration = video_info['duration']
        db.commit()
        
        # Step 2: Transcribe audio
        update_task_status(50, 'Transcribing audio... This may take a few minutes...')
        
        print(f"Starting transcription of audio file: {audio_path}")
        transcript_data = transcriber.transcribe_audio(audio_path)
        print(f"Transcription completed. Found {len(transcript_data['segments'])} segments")
        
        # Step 3: Format and save script
        update_task_status(80, 'Formatting script...')
        
        formatted_script = transcriber.format_transcript(
            transcript_data['segments'], 
            format_type='timestamps'
        )
        
        file_path = formatter.save_script(
            video_info=video_info,
            transcript_data=transcript_data,
            format_type='txt',
            script_id=script_id
        )
        print(f"Script saved to: {file_path}")
        
        # Update script record
        script.transcript_text = transcript_data['text']
        script.formatted_script = formatted_script
        script.file_path = file_path
        script.status = 'completed'
        script.completed_at = datetime.utcnow()
        db.commit()
        
        # Cleanup
        if audio_path and os.path.exists(audio_path):
            downloader.cleanup_audio(audio_path)
            print(f"Cleaned up audio file: {audio_path}")
        
        # Final update with success
        update_task_status(100, 'Script generated successfully!', {
            'file_path': file_path,
            'completed': True
        })
        
        print(f"Successfully processed video: {video_url}")
        
        # Return result (even though we're storing in Redis)
        return {
            'script_id': script_id,
            'status': 'completed',
            'file_path': file_path
        }
        
    except Exception as e:
        # Log error
        error_msg = f"Error processing video: {str(e)}"
        error_trace = traceback.format_exc()
        print(f"ERROR: {error_msg}")
        print(f"Traceback: {error_trace}")
        
        # Update script record with error
        try:
            if 'script' in locals() and script:
                script.status = 'failed'
                script.error_message = str(e)
                db.commit()
        except Exception as db_error:
            print(f"Failed to update database: {str(db_error)}")
            db.rollback()
        
        # Store error in Redis
        error_data = {
            'task_id': self.request.id,
            'script_id': script_id,
            'progress': 0,
            'status': f'Failed: {str(e)}',
            'state': 'FAILURE',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
        redis_client.set(
            f"task_result:{self.request.id}", 
            json.dumps(error_data), 
            ex=3600
        )
        
        # Cleanup
        if audio_path and os.path.exists(audio_path):
            try:
                downloader.cleanup_audio(audio_path)
            except:
                pass
        
        # Update task state
        self.update_state(
            state='FAILURE',
            meta={
                'current': 0, 
                'total': 100, 
                'status': f'Failed: {str(e)}',
                'exc_type': type(e).__name__,
                'exc_message': str(e)
            }
        )
        
        raise
        
    finally:
        db.close()