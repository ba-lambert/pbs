from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.deps import get_current_user, require_roles
from api.schemas import FareConfigUpdate
from models.entities import FareConfig, Role, User

router = APIRouter()


@router.get("", dependencies=[Depends(get_current_user)])
def get_fare_config(db: Session = Depends(get_db)):
    item = db.scalar(select(FareConfig).order_by(FareConfig.id.asc()))
    if not item:
        item = FareConfig(base_rwf_per_km=50)
        db.add(item)
        db.commit()
        db.refresh(item)
    return {"id": item.id, "base_rwf_per_km": item.base_rwf_per_km}


@router.put("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN))])
def update_fare_config(payload: FareConfigUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.scalar(select(FareConfig).order_by(FareConfig.id.asc()))
    if not item:
        item = FareConfig(base_rwf_per_km=payload.base_rwf_per_km, updated_by_user_id=current_user.id)
        db.add(item)
    else:
        item.base_rwf_per_km = payload.base_rwf_per_km
        item.updated_by_user_id = current_user.id
    db.commit()
    db.refresh(item)
    return {"id": item.id, "base_rwf_per_km": item.base_rwf_per_km}

