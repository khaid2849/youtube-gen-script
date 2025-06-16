from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_pro = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    scripts = relationship("Script", back_populates="user")
    usage = relationship("UserUsage", back_populates="user", uselist=False)

class Script(Base):
    __tablename__ = "scripts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    video_url = Column(String, nullable=False)
    video_title = Column(String)
    video_duration = Column(Integer)  # in seconds
    transcript_text = Column(Text)
    formatted_script = Column(Text)
    file_path = Column(String)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", back_populates="scripts")

class UserUsage(Base):
    __tablename__ = "user_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    videos_processed_today = Column(Integer, default=0)
    total_videos_processed = Column(Integer, default=0)
    total_processing_time = Column(Float, default=0.0)  # in hours
    last_reset_date = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="usage")