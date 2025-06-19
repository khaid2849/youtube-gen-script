from celery import Task
from .celery_app import celery_app
import os
import time
import traceback

@celery_app.task(bind=True, name='process_youtube_video')
def process_youtube_video(self, script_id: int, video_url: str, user_id: int = None):
    """Main task to process YouTube video"""
    
    # Import here to avoid circular imports
    from ..database import SessionLocal
    from ..models import Script
    from ..core.youtube_downloader import YouTubeDownloader
    from ..core.transcriber import WhisperTranscriber
    from ..core.formatter import ScriptFormatter
    from datetime import datetime
    
    db = SessionLocal()
    downloader = YouTubeDownloader()
    transcriber = WhisperTranscriber()
    formatter = ScriptFormatter()
    audio_path = None
    
    try:
        print(f"Starting to process video: {video_url}")
        
        # Update task state - Extracting info
        self.update_state(
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
        self.update_state(
            state='PROGRESS',
            meta={'current': 20, 'total': 100, 'status': 'Downloading audio...'}
        )
        
        print(f"Downloading audio from: {video_url}")
        audio_path, video_info = downloader.download_audio(video_url)
        print(f"Audio downloaded to: {audio_path}")
        
        # Update script with video info
        script.video_title = video_info['title']
        script.video_duration = video_info['duration']
        db.commit()
        
        # Step 2: Transcribe audio
        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Transcribing audio... This may take a few minutes...'}
        )
        
        print(f"Starting transcription of audio file: {audio_path}")
        transcript_data = transcriber.transcribe_audio(audio_path)
        print(f"Transcription completed. Found {len(transcript_data['segments'])} segments")
        
        # Step 3: Format and save script
        self.update_state(
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
        
        # Final update
        self.update_state(
            state='SUCCESS',
            meta={'current': 100, 'total': 100, 'status': 'Script generated successfully!'}
        )
        
        print(f"Successfully processed video: {video_url}")
        
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


# Test task for verification
@celery_app.task(name='test_task')
def test_task(x, y):
    """Simple test task"""
    print(f"Test task called with {x} and {y}")
    return x + y