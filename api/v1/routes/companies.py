from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.deps import enforce_company_scope, get_current_user, require_roles
from api.schemas import CompanyCreate, CompanyDistrictAssign
from models.entities import Company, CompanyDistrict, District, Province, Role, User

router = APIRouter()


@router.post("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN))])
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(Company).where(Company.name == payload.name))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company exists")
    province = db.get(Province, payload.province_id)
    if not province:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid province")
    item = Company(name=payload.name, province_id=payload.province_id, is_active=True)
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "name": item.name, "province_id": item.province_id}


@router.get("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def list_companies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == Role.SUPER_ADMIN:
        companies = db.scalars(select(Company).order_by(Company.id.asc())).all()
    else:
        companies = db.scalars(select(Company).where(Company.id == current_user.company_id)).all()
    return [{"id": c.id, "name": c.name, "province_id": c.province_id, "is_active": c.is_active} for c in companies]


@router.put("/{company_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN))])
def update_company(company_id: int, payload: CompanyCreate, db: Session = Depends(get_db)):
    item = db.get(Company, company_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    province = db.get(Province, payload.province_id)
    if not province:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid province")
    item.name = payload.name
    item.province_id = payload.province_id
    db.commit()
    return {"id": item.id, "name": item.name, "province_id": item.province_id}


@router.delete("/{company_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN))])
def delete_company(company_id: int, db: Session = Depends(get_db)):
    item = db.get(Company, company_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}


@router.put("/{company_id}/districts", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN))])
def assign_company_districts(
    company_id: int,
    payload: CompanyDistrictAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enforce_company_scope(current_user, company_id)
    districts = db.scalars(select(District).where(District.id.in_(payload.district_ids))).all()
    if len(districts) != len(set(payload.district_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid district IDs")
    db.execute(delete(CompanyDistrict).where(CompanyDistrict.company_id == company_id))
    db.add_all([CompanyDistrict(company_id=company_id, district_id=district_id) for district_id in payload.district_ids])
    db.commit()
    return {"company_id": company_id, "district_ids": payload.district_ids}


@router.get("/{company_id}/districts", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def list_company_districts(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enforce_company_scope(current_user, company_id)
    rows = db.execute(
        select(District.id, District.name, District.province_id)
        .join(CompanyDistrict, CompanyDistrict.district_id == District.id)
        .where(CompanyDistrict.company_id == company_id)
        .order_by(District.name.asc())
    ).all()
    return [{"id": row[0], "name": row[1], "province_id": row[2]} for row in rows]
