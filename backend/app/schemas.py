from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_pro: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserInDB(User):
    hashed_password: str

# Script Schemas
class ScriptBase(BaseModel):
    video_url: HttpUrl

class ScriptCreate(ScriptBase):
    pass

class ScriptUpdate(BaseModel):
    status: Optional[str] = None
    transcript_text: Optional[str] = None
    formatted_script: Optional[str] = None
    error_message: Optional[str] = None

class Script(ScriptBase):
    id: int
    user_id: Optional[int]
    video_title: Optional[str]
    video_duration: Optional[int]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ScriptWithContent(Script):
    transcript_text: Optional[str]
    formatted_script: Optional[str]
    error_message: Optional[str]

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Usage Schemas
class UserUsage(BaseModel):
    videos_processed_today: int
    total_videos_processed: int
    total_processing_time: float
    accuracy_rate: float = 98.0  # Mock value for now
    
    class Config:
        from_attributes = True

# Response Schemas
class ProcessingStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    message: str
    script_id: Optional[int] = None

class DashboardData(BaseModel):
    scripts_generated: int
    hours_processed: float
    accuracy_rate: float
    recent_scripts: List[Script]