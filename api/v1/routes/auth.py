from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.config import settings
from api.core.database import get_db
from api.core.security import create_token, verify_password
from api.deps import validate_refresh_token
from api.schemas import LoginRequest, RefreshRequest, TokenResponse
from models.entities import RefreshToken, User

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    access = create_token(
        subject=user.email,
        expires_minutes=settings.access_token_minutes,
        token_type="access",
        extra={"uid": user.id, "role": user.role.value, "company_id": user.company_id},
    )
    refresh = create_token(
        subject=user.email,
        expires_minutes=settings.refresh_token_minutes,
        token_type="refresh",
        extra={"uid": user.id},
    )
    refresh_entity = RefreshToken(
        user_id=user.id,
        token=refresh,
        expires_at=datetime.now(UTC) + timedelta(minutes=settings.refresh_token_minutes),
        revoked=False,
    )
    db.add(refresh_entity)
    db.commit()
    return TokenResponse(access_token=access, refresh_token=refresh, role=user.role.value)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    refresh_entity = validate_refresh_token(db, payload.refresh_token)
    user = db.get(User, refresh_entity.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    refresh_entity.revoked = True
    new_access = create_token(
        subject=user.email,
        expires_minutes=settings.access_token_minutes,
        token_type="access",
        extra={"uid": user.id, "role": user.role.value, "company_id": user.company_id},
    )
    new_refresh = create_token(
        subject=user.email,
        expires_minutes=settings.refresh_token_minutes,
        token_type="refresh",
        extra={"uid": user.id},
    )
    db.add(
        RefreshToken(
            user_id=user.id,
            token=new_refresh,
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.refresh_token_minutes),
            revoked=False,
        )
    )
    db.commit()
    return TokenResponse(access_token=new_access, refresh_token=new_refresh, role=user.role.value)
