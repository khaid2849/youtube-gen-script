from celery import current_task
from .celery_app import celery_app
from ..core.youtube_downloader import YouTubeDownloader
from ..core.transcriber import WhisperTranscriber
from ..core.formatter import ScriptFormatter
from ..database import SessionLocal
from ..models import Script
from datetime import datetime
import traceback

@celery_app.task(bind=True)
def process_youtube_video(self, script_id: int, video_url: str, user_id: int = None):
    """Main task to process YouTube video"""
    db = SessionLocal()
    downloader = YouTubeDownloader()
    transcriber = WhisperTranscriber()
    formatter = ScriptFormatter()
    audio_path = None
    
    try:
        # Update task state
        current_task.update_state(
            state='PROGRESS',
            meta={'current': 10, 'total': 100, 'status': 'Extracting video information...'}
        )
        
        # Get script record
        script = db.query(Script).filter(Script.id == script_id).first()
        if not script:
            raise Exception("Script record not found")
        
        # Update status to processing
        script.status = 'processing'
        db.commit()
        
        # Step 1: Extract video info and download audio
        current_task.update_state(
            state='PROGRESS',
            meta={'current': 20, 'total': 100, 'status': 'Downloading audio...'}
        )
        
        audio_path, video_info = downloader.download_audio(video_url)
        
        # Update script with video info
        script.video_title = video_info['title']
        script.video_duration = video_info['duration']
        db.commit()
        
        # Step 2: Transcribe audio
        current_task.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Transcribing audio...'}
        )
        
        transcript_data = transcriber.transcribe_audio(audio_path)
        
        # Step 3: Format and save script
        current_task.update_state(
            state='PROGRESS',
            meta={'current': 80, 'total': 100, 'status': 'Formatting script...'}
        )
        
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
        
        # Update script record
        script.transcript_text = transcript_data['text']
        script.formatted_script = formatted_script
        script.file_path = file_path
        script.status = 'completed'
        script.completed_at = datetime.utcnow()
        db.commit()
        
        # Cleanup
        downloader.cleanup_audio(audio_path)
        
        # Final update
        current_task.update_state(
            state='SUCCESS',
            meta={'current': 100, 'total': 100, 'status': 'Script generated successfully!'}
        )
        
        return {
            'script_id': script_id,
            'status': 'completed',
            'file_path': file_path
        }
        
    except Exception as e:
        # Log error
        error_msg = f"Error processing video: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        
        # Update script record with error
        if script:
            script.status = 'failed'
            script.error_message = str(e)
            db.commit()
        
        # Cleanup
        if audio_path:
            downloader.cleanup_audio(audio_path)
        
        # Update task state
        current_task.update_state(
            state='FAILURE',
            meta={'current': 0, 'total': 100, 'status': f'Failed: {str(e)}'}
        )
        
        raise
        
    finally:
        db.close()