from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.config import settings
from api.core.database import get_db
from api.core.security import create_token, hash_password, verify_password
from api.deps import get_current_user, validate_refresh_token
from api.schemas import ChangePasswordRequest, LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from models.entities import RefreshToken, Role, User

router = APIRouter()


def _issue_tokens(db: Session, user: User) -> TokenResponse:
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
    db.add(RefreshToken(
        user_id=user.id,
        token=refresh,
        expires_at=datetime.now(UTC) + timedelta(minutes=settings.refresh_token_minutes),
        revoked=False,
    ))
    db.commit()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        role=user.role.value,
        must_change_password=user.must_change_password,
        user_id=user.id,
        full_name=user.full_name,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    if user.must_change_password and user.password_expires_at and user.password_expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Temporary password expired. Contact your administrator to reset it.",
        )
    return _issue_tokens(db, user)


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=Role.PASSENGER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _issue_tokens(db, user)


@router.put("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    current_user.password_expires_at = None
    for t in db.scalars(select(RefreshToken).where(RefreshToken.user_id == current_user.id, RefreshToken.revoked.is_(False))).all():
        t.revoked = True
    db.commit()
    return {"status": "password updated"}


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
    db.add(RefreshToken(
        user_id=user.id,
        token=new_refresh,
        expires_at=datetime.now(UTC) + timedelta(minutes=settings.refresh_token_minutes),
        revoked=False,
    ))
    db.commit()
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        role=user.role.value,
        must_change_password=user.must_change_password,
        user_id=user.id,
        full_name=user.full_name,
    )
