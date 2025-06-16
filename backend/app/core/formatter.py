import json
import pandas as pd
from typing import List, Dict
import os
from datetime import datetime
from ..config import settings

class ScriptFormatter:
    def __init__(self):
        self.supported_formats = ['txt', 'json', 'excel']
    
    def save_script(self, 
                   video_info: Dict,
                   transcript_data: Dict,
                   format_type: str = 'txt',
                   script_id: int = None) -> str:
        """Save formatted script to file and return file path"""
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        video_id = video_info.get('video_id', 'unknown')
        filename = f"script_{video_id}_{timestamp}.{format_type}"
        file_path = os.path.join(settings.GENERATED_SCRIPTS_PATH, filename)
        
        if format_type == 'txt':
            self._save_as_txt(file_path, video_info, transcript_data)
        elif format_type == 'json':
            self._save_as_json(file_path, video_info, transcript_data)
        elif format_type == 'excel':
            self._save_as_excel(file_path, video_info, transcript_data)
        else:
            raise ValueError(f"Unsupported format: {format_type}")
        
        return file_path
    
    def _save_as_txt(self, file_path: str, video_info: Dict, transcript_data: Dict):
        """Save script as formatted text file"""
        with open(file_path, 'w', encoding='utf-8') as f:
            # Header
            f.write("=" * 80 + "\n")
            f.write(f"YouTube Script: {video_info['title']}\n")
            f.write(f"Channel: {video_info['channel']}\n")
            f.write(f"Duration: {self._format_duration(video_info['duration'])}\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n\n")
            
            # Transcript with timestamps
            for segment in transcript_data['segments']:
                start_time = self._seconds_to_timestamp(segment['start'])
                end_time = self._seconds_to_timestamp(segment['end'])
                text = segment['text']
                f.write(f"[{start_time} - {end_time}]: {text}\n\n")
    
    def _save_as_json(self, file_path: str, video_info: Dict, transcript_data: Dict):
        """Save script as JSON file"""
        data = {
            'video_info': video_info,
            'generated_at': datetime.now().isoformat(),
            'transcript': {
                'full_text': transcript_data['text'],
                'language': transcript_data['language'],
                'segments': transcript_data['segments']
            }
        }
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def _save_as_excel(self, file_path: str, video_info: Dict, transcript_data: Dict):
        """Save script as Excel file"""
        # Create DataFrame from segments
        df_data = []
        for segment in transcript_data['segments']:
            df_data.append({
                'Start Time': self._seconds_to_timestamp(segment['start']),
                'End Time': self._seconds_to_timestamp(segment['end']),
                'Start (seconds)': segment['start'],
                'End (seconds)': segment['end'],
                'Text': segment['text']
            })
        
        df = pd.DataFrame(df_data)
        
        # Create Excel writer
        with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
            # Write transcript data
            df.to_excel(writer, sheet_name='Transcript', index=False)
            
            # Write video info
            info_df = pd.DataFrame([video_info])
            info_df.to_excel(writer, sheet_name='Video Info', index=False)
            
            # Auto-adjust column widths
            for sheet_name in writer.sheets:
                worksheet = writer.sheets[sheet_name]
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
    
    def _seconds_to_timestamp(self, seconds: float) -> str:
        """Convert seconds to timestamp format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"
    
    def _format_duration(self, seconds: int) -> str:
        """Format duration in human-readable format"""
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m {secs}s"
        elif minutes > 0:
            return f"{minutes}m {secs}s"
        else:
            return f"{secs}s"