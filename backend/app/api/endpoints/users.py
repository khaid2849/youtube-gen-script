from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, date, datetime

from ...database import get_db
from ...models import User, UserUsage
from ...schemas import (
    UserCreate, 
    User as UserSchema, 
    Token, 
    UserUsage as UsageSchema,
    UserProfileUpdate
)
from ...dependencies import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_active_user
)
from ...config import settings

router = APIRouter()

@router.post("/register", response_model=UserSchema)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(
        (User.email == user.email) | (User.username == user.username)
    ).first()
    
    if db_user:
        if db_user.email == user.email:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create user usage record
    usage = UserUsage(user_id=db_user.id)
    db.add(usage)
    db.commit()
    
    return db_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2PasswordRequestForm uses username field, but we'll accept email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/profile", response_model=UserSchema)
def update_profile(
    profile_update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update user profile information"""
    
    # Check if username is being changed and if it's already taken
    if profile_update.username and profile_update.username != current_user.username:
        existing_user = db.query(User).filter(User.username == profile_update.username).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
    
    # Check if email is being changed and if it's already taken
    if profile_update.email and profile_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == profile_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
    
    # Update fields
    update_data = profile_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.get("/usage", response_model=UsageSchema)
def get_user_usage(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    usage = db.query(UserUsage).filter(UserUsage.user_id == current_user.id).first()
    if not usage:
        # Create usage record if it doesn't exist
        usage = UserUsage(user_id=current_user.id)
        db.add(usage)
        db.commit()
        db.refresh(usage)
    
    # Reset daily count if needed
    if usage.last_reset_date.date() < date.today():
        usage.videos_processed_today = 0
        usage.last_reset_date = datetime.utcnow()
        db.commit()
    
    # Calculate storage used (mock calculation)
    from ...models import Script
    scripts_count = db.query(Script).filter(Script.user_id == current_user.id).count()
    usage.storage_used_gb = scripts_count * 0.01  # 10MB per script average
    
    return usage

@router.post("/upgrade-to-pro")
def upgrade_to_pro(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    if current_user.is_pro:
        raise HTTPException(
            status_code=400,
            detail="User is already a Pro member"
        )
    
    # In a real application, this would integrate with payment processing
    # For now, we'll just upgrade the user
    current_user.is_pro = True
    db.commit()
    
    return {"message": "Successfully upgraded to Pro!", "is_pro": True}

@router.post("/change-password")
def change_password(
    current_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Change user password"""
    
    # Verify current password
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.delete("/account")
def delete_account(
    password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete user account"""
    
    # Verify password
    if not verify_password(password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Password is incorrect"
        )
    
    # Delete user's scripts
    from ...models import Script
    db.query(Script).filter(Script.user_id == current_user.id).delete()
    
    # Delete user usage
    db.query(UserUsage).filter(UserUsage.user_id == current_user.id).delete()
    
    # Delete user
    db.delete(current_user)
    db.commit()
    
    return {"message": "Account deleted successfully"}

@router.get("/stats")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed user statistics"""
    from ...models import Script
    from sqlalchemy import func
    
    # Get various statistics
    total_scripts = db.query(Script).filter(Script.user_id == current_user.id).count()
    
    completed_scripts = db.query(Script).filter(
        Script.user_id == current_user.id,
        Script.status == "completed"
    ).count()
    
    total_duration = db.query(func.sum(Script.video_duration)).filter(
        Script.user_id == current_user.id,
        Script.status == "completed"
    ).scalar() or 0
    
    # Get scripts by month for the last 6 months
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    monthly_stats = db.query(
        func.date_trunc('month', Script.created_at).label('month'),
        func.count(Script.id).label('count')
    ).filter(
        Script.user_id == current_user.id,
        Script.created_at >= six_months_ago
    ).group_by('month').order_by('month').all()
    
    # Format monthly stats
    monthly_data = [
        {
            "month": stat.month.strftime("%B %Y"),
            "count": stat.count
        }
        for stat in monthly_stats
    ]
    
    return {
        "total_scripts": total_scripts,
        "completed_scripts": completed_scripts,
        "total_duration_hours": round(total_duration / 3600, 2),
        "success_rate": round((completed_scripts / total_scripts * 100) if total_scripts > 0 else 0, 2),
        "monthly_stats": monthly_data,
        "member_since": current_user.created_at.strftime("%B %d, %Y"),
        "account_type": "Pro" if current_user.is_pro else "Free"
    }