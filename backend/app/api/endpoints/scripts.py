from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from ...database import get_db
from ...models import Script, User
from ...schemas import Script as ScriptSchema, ScriptWithContent, DashboardData
from ...dependencies import get_current_active_user, get_optional_current_user
from ...config import settings

router = APIRouter()

@router.get("/", response_model=List[ScriptSchema])
def get_scripts(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Get list of scripts (user's scripts if logged in, recent public scripts otherwise)"""
    
    if current_user:
        scripts = db.query(Script).filter(
            Script.user_id == current_user.id
        ).order_by(Script.created_at.desc()).offset(skip).limit(limit).all()
    else:
        # Show recent completed scripts for non-logged in users
        scripts = db.query(Script).filter(
            Script.status == 'completed',
            Script.user_id == None
        ).order_by(Script.created_at.desc()).offset(skip).limit(limit).all()
    
    return scripts

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get dashboard data for logged in user"""
    
    # Get user's scripts
    scripts = db.query(Script).filter(
        Script.user_id == current_user.id,
        Script.status == 'completed'
    ).all()
    
    # Calculate statistics
    total_scripts = len(scripts)
    total_duration = sum(s.video_duration or 0 for s in scripts)
    hours_processed = total_duration / 3600.0
    
    # Get recent scripts
    recent_scripts = db.query(Script).filter(
        Script.user_id == current_user.id
    ).order_by(Script.created_at.desc()).limit(5).all()
    
    return DashboardData(
        scripts_generated=total_scripts,
        hours_processed=round(hours_processed, 1),
        accuracy_rate=98.0,  # Mock value
        recent_scripts=recent_scripts
    )

@router.get("/{script_id}", response_model=ScriptWithContent)
def get_script(
    script_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Get a specific script with content"""
    
    script = db.query(Script).filter(Script.id == script_id).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Check access permissions
    if script.user_id and (not current_user or script.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Ensure all fields are included
    return {
        "id": script.id,
        "user_id": script.user_id,
        "video_url": script.video_url,
        "video_title": script.video_title,
        "video_duration": script.video_duration,
        "transcript_text": script.transcript_text,
        "formatted_script": script.formatted_script,
        "file_path": script.file_path,
        "status": script.status,
        "error_message": script.error_message,
        "created_at": script.created_at,
        "completed_at": script.completed_at
    }

@router.get("/{script_id}/download")
def download_script(
    script_id: int,
    format: str = "txt",
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Download a script file"""
    
    script = db.query(Script).filter(Script.id == script_id).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Check access permissions
    if script.user_id and (not current_user or script.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not script.file_path or not os.path.exists(script.file_path):
        raise HTTPException(status_code=404, detail="Script file not found")
    
    # For now, return the txt file. In future, we can convert to other formats
    return FileResponse(
        script.file_path,
        media_type='text/plain',
        filename=os.path.basename(script.file_path)
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