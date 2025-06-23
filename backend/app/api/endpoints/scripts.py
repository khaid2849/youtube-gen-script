from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import os
import json
import pandas as pd
from datetime import datetime
import io
import zipfile

from ...database import get_db
from ...models import Script, User, UserUsage
from ...schemas import (
    Script as ScriptSchema, 
    ScriptWithContent, 
    DashboardData,
    ScriptListResponse,
    ExportRequest,
    ScriptStatus
)
from ...dependencies import get_current_active_user
from ...core.formatter import ScriptFormatter

router = APIRouter()

@router.get("/", response_model=ScriptListResponse)
def get_scripts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[ScriptStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get paginated list of user's scripts with filtering and sorting"""
    
    # Base query
    query = db.query(Script).filter(Script.user_id == current_user.id)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                Script.video_title.ilike(f"%{search}%"),
                Script.video_url.ilike(f"%{search}%")
            )
        )
    
    if status:
        query = query.filter(Script.status == status)
    
    if start_date:
        query = query.filter(Script.created_at >= start_date)
    
    if end_date:
        query = query.filter(Script.created_at <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply sorting
    if hasattr(Script, sort_by):
        order_column = getattr(Script, sort_by)
        if sort_order == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
    
    # Apply pagination
    scripts = query.offset(skip).limit(limit).all()
    
    # Calculate pages
    pages = (total + limit - 1) // limit
    current_page = (skip // limit) + 1
    
    return ScriptListResponse(
        scripts=scripts,
        total=total,
        page=current_page,
        pages=pages
    )

@router.get("/all", response_model=List[ScriptSchema])
def get_all_scripts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all scripts for the current user (no pagination)"""
    scripts = db.query(Script).filter(
        Script.user_id == current_user.id
    ).order_by(Script.created_at.desc()).all()
    
    return scripts

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get enhanced dashboard data for logged in user"""
    
    # Get user's scripts
    scripts = db.query(Script).filter(
        Script.user_id == current_user.id,
        Script.status == 'completed'
    ).all()
    
    # Calculate statistics
    total_scripts = len(scripts)
    total_duration = sum(s.video_duration or 0 for s in scripts)
    hours_processed = total_duration / 3600.0
    
    # Calculate time saved (assuming manual transcription takes 4x the video duration)
    time_saved_hours = hours_processed * 3
    
    # Get storage used (mock calculation based on scripts)
    storage_used_gb = total_scripts * 0.01  # Assume 10MB per script average
    
    # Get recent scripts
    recent_scripts = db.query(Script).filter(
        Script.user_id == current_user.id
    ).order_by(Script.created_at.desc()).limit(5).all()
    
    # Update user usage stats
    usage = db.query(UserUsage).filter(UserUsage.user_id == current_user.id).first()
    if usage:
        usage.total_processing_time = hours_processed
    
    return DashboardData(
        scripts_generated=total_scripts,
        hours_processed=round(hours_processed, 1),
        accuracy_rate=98.0,
        recent_scripts=recent_scripts,
        storage_used_gb=round(storage_used_gb, 2),
        time_saved_hours=round(time_saved_hours, 1)
    )

@router.post("/export")
def export_scripts(
    export_request: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export scripts in various formats"""
    
    # Build query
    query = db.query(Script).filter(Script.user_id == current_user.id)
    
    # Filter by script IDs if provided
    if export_request.script_ids:
        query = query.filter(Script.id.in_(export_request.script_ids))
    
    # Filter by date range if provided
    if export_request.date_range:
        if export_request.date_range.get("start_date"):
            query = query.filter(Script.created_at >= export_request.date_range["start_date"])
        if export_request.date_range.get("end_date"):
            query = query.filter(Script.created_at <= export_request.date_range["end_date"])
    
    scripts = query.all()
    
    if not scripts:
        raise HTTPException(status_code=404, detail="No scripts found for export")
    
    # Export based on format
    if export_request.format == "json":
        return export_as_json(scripts, current_user)
    elif export_request.format == "csv":
        return export_as_csv(scripts, current_user)
    elif export_request.format == "excel":
        return export_as_excel(scripts, current_user)
    elif export_request.format == "txt":
        return export_as_txt_zip(scripts, current_user)
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

def export_as_json(scripts: List[Script], user: User):
    """Export scripts as JSON"""
    data = {
        "export_date": datetime.now().isoformat(),
        "user": user.username,
        "total_scripts": len(scripts),
        "scripts": []
    }
    
    for script in scripts:
        script_data = {
            "id": script.id,
            "video_title": script.video_title,
            "video_url": script.video_url,
            "video_duration": script.video_duration,
            "status": script.status,
            "created_at": script.created_at.isoformat(),
            "completed_at": script.completed_at.isoformat() if script.completed_at else None,
            "transcript_text": script.transcript_text,
            "formatted_script": script.formatted_script
        }
        data["scripts"].append(script_data)
    
    # Create JSON file
    json_str = json.dumps(data, indent=2, ensure_ascii=False)
    output = io.BytesIO(json_str.encode('utf-8'))
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=scripts_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )

def export_as_csv(scripts: List[Script], user: User):
    """Export scripts as CSV"""
    data = []
    for script in scripts:
        data.append({
            "ID": script.id,
            "Video Title": script.video_title or "Untitled",
            "Video URL": script.video_url,
            "Duration (seconds)": script.video_duration or 0,
            "Status": script.status,
            "Created At": script.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "Completed At": script.completed_at.strftime("%Y-%m-%d %H:%M:%S") if script.completed_at else "",
            "Transcript Preview": (script.transcript_text or "")[:200] + "..." if script.transcript_text and len(script.transcript_text) > 200 else script.transcript_text or ""
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    df.to_csv(output, index=False, encoding='utf-8')
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=scripts_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )

def export_as_excel(scripts: List[Script], user: User):
    """Export scripts as Excel file with multiple sheets"""
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Summary sheet
        summary_data = {
            "Metric": ["Total Scripts", "Total Duration (hours)", "Completed Scripts", "Failed Scripts", "Average Duration (minutes)"],
            "Value": [
                len(scripts),
                round(sum(s.video_duration or 0 for s in scripts) / 3600, 2),
                len([s for s in scripts if s.status == "completed"]),
                len([s for s in scripts if s.status == "failed"]),
                round(sum(s.video_duration or 0 for s in scripts) / len(scripts) / 60, 2) if scripts else 0
            ]
        }
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        # Scripts list sheet
        scripts_data = []
        for script in scripts:
            scripts_data.append({
                "ID": script.id,
                "Video Title": script.video_title or "Untitled",
                "Video URL": script.video_url,
                "Duration (seconds)": script.video_duration or 0,
                "Duration (formatted)": format_duration(script.video_duration or 0),
                "Status": script.status,
                "Created At": script.created_at,
                "Completed At": script.completed_at or ""
            })
        
        scripts_df = pd.DataFrame(scripts_data)
        scripts_df.to_excel(writer, sheet_name='Scripts', index=False)
        
        # Transcripts sheet (first 10 for size management)
        transcript_data = []
        for script in scripts[:10]:
            if script.formatted_script:
                transcript_data.append({
                    "Video Title": script.video_title or "Untitled",
                    "Transcript": script.formatted_script
                })
        
        if transcript_data:
            transcript_df = pd.DataFrame(transcript_data)
            transcript_df.to_excel(writer, sheet_name='Transcripts (First 10)', index=False)
        
        # Auto-adjust columns width
        for sheet in writer.sheets.values():
            for column in sheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                sheet.column_dimensions[column_letter].width = adjusted_width
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=scripts_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        }
    )

def export_as_txt_zip(scripts: List[Script], user: User):
    """Export all scripts as individual TXT files in a ZIP archive"""
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add summary file
        summary = f"Scripts Export Summary\n"
        summary += f"="*50 + "\n"
        summary += f"User: {user.username}\n"
        summary += f"Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        summary += f"Total Scripts: {len(scripts)}\n"
        summary += f"="*50 + "\n\n"
        
        for idx, script in enumerate(scripts, 1):
            summary += f"{idx}. {script.video_title or 'Untitled'} - {script.created_at.strftime('%Y-%m-%d')}\n"
        
        zip_file.writestr("00_summary.txt", summary)
        
        # Add individual script files
        for script in scripts:
            if script.formatted_script:
                filename = f"{script.id}_{sanitize_filename(script.video_title or 'untitled')}.txt"
                content = f"Title: {script.video_title or 'Untitled'}\n"
                content += f"URL: {script.video_url}\n"
                content += f"Duration: {format_duration(script.video_duration or 0)}\n"
                content += f"Created: {script.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
                content += f"="*80 + "\n\n"
                content += script.formatted_script
                
                zip_file.writestr(filename, content)
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=scripts_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
        }
    )

@router.get("/{script_id}", response_model=ScriptWithContent)
def get_script(
    script_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific script with content"""
    
    script = db.query(Script).filter(
        Script.id == script_id,
        Script.user_id == current_user.id
    ).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    return script

@router.get("/{script_id}/download")
def download_script(
    script_id: int,
    format: str = "txt",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Download a single script file"""
    
    script = db.query(Script).filter(
        Script.id == script_id,
        Script.user_id == current_user.id
    ).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    formatter = ScriptFormatter()
    
    # Generate file in requested format
    if format == "txt":
        content = generate_txt_content(script)
        media_type = "text/plain"
        ext = "txt"
    elif format == "json":
        content = generate_json_content(script)
        media_type = "application/json"
        ext = "json"
    elif format == "pdf":
        # PDF generation would require additional library like reportlab
        raise HTTPException(status_code=501, detail="PDF export not yet implemented")
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")
    
    output = io.BytesIO(content.encode('utf-8'))
    output.seek(0)
    
    filename = f"{script.id}_{sanitize_filename(script.video_title or 'untitled')}.{ext}"
    
    return StreamingResponse(
        output,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.delete("/{script_id}")
def delete_script(
    script_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a script"""
    
    script = db.query(Script).filter(
        Script.id == script_id,
        Script.user_id == current_user.id
    ).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Delete file if exists
    if script.file_path and os.path.exists(script.file_path):
        try:
            os.remove(script.file_path)
        except:
            pass
    
    # Delete database record
    db.delete(script)
    db.commit()
    
    return {"message": "Script deleted successfully"}

@router.post("/{script_id}/regenerate")
def regenerate_script(
    script_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Regenerate a failed script"""
    
    script = db.query(Script).filter(
        Script.id == script_id,
        Script.user_id == current_user.id,
        Script.status == "failed"
    ).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found or cannot be regenerated")
    
    # Reset script status
    script.status = "pending"
    script.error_message = None
    db.commit()
    
    # Re-queue for processing
    from ...workers.tasks import process_youtube_video
    task = process_youtube_video.delay(
        script_id=script.id,
        video_url=script.video_url,
        user_id=current_user.id
    )
    
    return {
        "message": "Script queued for regeneration",
        "task_id": task.id
    }

# Helper functions
def format_duration(seconds: int) -> str:
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

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe file system usage"""
    import re
    # Remove invalid characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Replace spaces with underscores
    filename = filename.replace(' ', '_')
    # Limit length
    return filename[:50]

def generate_txt_content(script: Script) -> str:
    """Generate TXT content for a script"""
    content = f"{'='*80}\n"
    content += f"YouTube Script: {script.video_title or 'Untitled'}\n"
    content += f"URL: {script.video_url}\n"
    content += f"Duration: {format_duration(script.video_duration or 0)}\n"
    content += f"Generated: {script.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
    content += f"{'='*80}\n\n"
    content += script.formatted_script or script.transcript_text or "No transcript available"
    return content

def generate_json_content(script: Script) -> str:
    """Generate JSON content for a script"""
    data = {
        "id": script.id,
        "video_info": {
            "title": script.video_title,
            "url": script.video_url,
            "duration": script.video_duration
        },
        "metadata": {
            "created_at": script.created_at.isoformat(),
            "completed_at": script.completed_at.isoformat() if script.completed_at else None,
            "status": script.status
        },
        "transcript": {
            "text": script.transcript_text,
            "formatted": script.formatted_script
        }
    }
    return json.dumps(data, indent=2, ensure_ascii=False)