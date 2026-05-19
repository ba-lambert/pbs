from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.core.security import hash_password
from api.deps import enforce_company_scope, get_current_user, require_roles
from api.schemas import UserCreate
from models.entities import Role, User

router = APIRouter()


@router.post("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN))])
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    enforce_company_scope(current_user, payload.company_id)
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        company_id=payload.company_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role, "company_id": user.company_id}


@router.get("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(User)
    if current_user.role != Role.SUPER_ADMIN:
        query = query.where(User.company_id == current_user.company_id)
    users = db.scalars(query.order_by(User.id.desc())).all()
    return [
        {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "company_id": user.company_id}
        for user in users
    ]

