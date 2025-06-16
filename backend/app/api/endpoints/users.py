from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from ...database import get_db
from ...models import User, UserUsage
from ...schemas import UserCreate, User as UserSchema, Token, UserUsage as UsageSchema
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

@router.get("/usage", response_model=UsageSchema)
def get_user_usage(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    usage = db.query(UserUsage).filter(UserUsage.user_id == current_user.id).first()
    if not usage:
        # Create usage record if it doesn't exist
        usage = UserUsage(user_id=current_user.id)
        db.add(usage)
        db.commit()
        db.refresh(usage)
    
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