import whisper
import os
from typing import Dict, List
from ..config import settings

class WhisperTranscriber:
    def __init__(self):
        self.model = None
        self.model_name = settings.WHISPER_MODEL
    
    def load_model(self):
        """Load Whisper model if not already loaded"""
        if self.model is None:
            print(f"Loading Whisper model: {self.model_name}")
            self.model = whisper.load_model(self.model_name)
    
    def transcribe_audio(self, audio_path: str, language: str = None) -> Dict:
        """Transcribe audio file and return segments with timestamps"""
        try:
            self.load_model()
            
            # Transcribe with word timestamps
            result = self.model.transcribe(
                audio_path,
                language=language,
                word_timestamps=True,
                verbose=False
            )
            
            # Format segments with timestamps
            segments = []
            for segment in result['segments']:
                segments.append({
                    'start': segment['start'],
                    'end': segment['end'],
                    'text': segment['text'].strip()
                })
            
            return {
                'text': result['text'],
                'segments': segments,
                'language': result['language'],
                'duration': result.get('duration', 0)
            }
            
        except Exception as e:
            raise Exception(f"Transcription failed: {str(e)}")
    
    def format_transcript(self, segments: List[Dict], format_type: str = 'timestamps') -> str:
        """Format transcript segments into readable text"""
        if format_type == 'timestamps':
            lines = []
            for segment in segments:
                start_time = self._seconds_to_timestamp(segment['start'])
                end_time = self._seconds_to_timestamp(segment['end'])
                text = segment['text']
                lines.append(f"[{start_time} - {end_time}]: {text}")
            return '\n\n'.join(lines)
        
        elif format_type == 'plain':
            return ' '.join([seg['text'] for seg in segments])
        
        else:
            raise ValueError(f"Unknown format type: {format_type}")
    
    def _seconds_to_timestamp(self, seconds: float) -> str:
        """Convert seconds to HH:MM:SS or MM:SS format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"