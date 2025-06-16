import yt_dlp
import os
from typing import Dict, Optional
from ..config import settings

class YouTubeDownloader:
    def __init__(self):
        self.ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'outtmpl': os.path.join(settings.TEMP_AUDIO_PATH, '%(id)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
    
    def extract_video_info(self, url: str) -> Dict:
        """Extract video metadata without downloading"""
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                return {
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration', 0),
                    'channel': info.get('channel', 'Unknown'),
                    'video_id': info.get('id', ''),
                    'thumbnail': info.get('thumbnail', ''),
                }
            except Exception as e:
                raise Exception(f"Failed to extract video info: {str(e)}")
    
    def download_audio(self, url: str) -> tuple[str, Dict]:
        """Download audio from YouTube video and return file path with metadata"""
        try:
            # First get video info
            info = self.extract_video_info(url)
            
            # Check duration limit
            if info['duration'] > settings.MAX_VIDEO_DURATION:
                raise Exception(f"Video duration exceeds limit of {settings.MAX_VIDEO_DURATION/3600} hours")
            
            # Download audio
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                ydl.download([url])
                audio_path = os.path.join(settings.TEMP_AUDIO_PATH, f"{info['video_id']}.wav")
                
                if not os.path.exists(audio_path):
                    raise Exception("Audio download failed")
                
                return audio_path, info
                
        except Exception as e:
            raise Exception(f"Failed to download audio: {str(e)}")
    
    def cleanup_audio(self, file_path: str):
        """Remove temporary audio file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Failed to cleanup audio file: {str(e)}")