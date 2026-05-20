from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.deps import enforce_company_scope, get_current_user, require_roles
from api.schemas import BusCreate, BusDistrictAssign, DriverCreate
from models.entities import Bus, BusDistrict, Driver, Role, User

router = APIRouter()
UPLOAD_DIR = Path("uploads/drivers")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def _parse_driver_payload(
    request: Request,
    company_id: int | None,
    full_name: str | None,
    gender: str | None,
    bus_id: int | None,
    district_id: int | None,
    license_number: str | None,
    license_category: str | None,
    phone: str | None,
    profile_image_url: str | None,
) -> DriverCreate:
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        return DriverCreate.model_validate(await request.json())
    return DriverCreate.model_validate(
        {
            "company_id": company_id,
            "full_name": full_name,
            "gender": gender,
            "bus_id": bus_id,
            "district_id": district_id,
            "license_number": license_number,
            "license_category": license_category,
            "phone": phone,
            "profile_image_url": profile_image_url,
        }
    )


def _save_driver_image(file: UploadFile) -> str:
    suffix = Path(file.filename or "").suffix.lower() or ".bin"
    filename = f"{uuid4().hex}{suffix}"
    destination = UPLOAD_DIR / filename
    data = file.file.read()
    destination.write_bytes(data)
    return f"/uploads/drivers/{filename}"


@router.post("/buses", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def create_bus(payload: BusCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    enforce_company_scope(current_user, payload.company_id)
    item = Bus(
        company_id=payload.company_id,
        plate_number=payload.plate_number,
        model=payload.model,
        capacity=payload.capacity,
        gps_imei=payload.gps_imei,
        is_active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@router.get("/buses", dependencies=[Depends(get_current_user)])
def list_buses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Bus)
    if current_user.role != Role.SUPER_ADMIN:
        query = query.where(Bus.company_id == current_user.company_id)
    items = db.scalars(query.order_by(Bus.id.desc())).all()
    return [
        {"id": i.id, "company_id": i.company_id, "plate_number": i.plate_number, "model": i.model, "capacity": i.capacity, "gps_imei": i.gps_imei}
        for i in items
    ]


@router.put("/buses/{bus_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def update_bus(bus_id: int, payload: BusCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(Bus, bus_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus not found")
    enforce_company_scope(current_user, item.company_id)
    item.company_id = payload.company_id
    item.plate_number = payload.plate_number
    item.model = payload.model
    item.capacity = payload.capacity
    item.gps_imei = payload.gps_imei
    db.commit()
    return {"status": "updated"}


@router.delete("/buses/{bus_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def delete_bus(bus_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(Bus, bus_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus not found")
    enforce_company_scope(current_user, item.company_id)
    db.delete(item)
    db.commit()
    return {"status": "deleted"}


@router.put("/buses/{bus_id}/districts", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def assign_bus_districts(
    bus_id: int,
    payload: BusDistrictAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bus = db.get(Bus, bus_id)
    if not bus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus not found")
    enforce_company_scope(current_user, bus.company_id)
    db.execute(delete(BusDistrict).where(BusDistrict.bus_id == bus_id))
    db.add_all([BusDistrict(bus_id=bus_id, district_id=district_id) for district_id in payload.district_ids])
    db.commit()
    return {"bus_id": bus_id, "district_ids": payload.district_ids}


@router.post("/drivers", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
async def create_driver(
    request: Request,
    company_id: int | None = Form(default=None),
    full_name: str | None = Form(default=None),
    gender: str | None = Form(default=None),
    bus_id: int | None = Form(default=None),
    district_id: int | None = Form(default=None),
    license_number: str | None = Form(default=None),
    license_category: str | None = Form(default=None),
    phone: str | None = Form(default=None),
    profile_image_url: str | None = Form(default=None),
    profile_image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = await _parse_driver_payload(
        request=request,
        company_id=company_id,
        full_name=full_name,
        gender=gender,
        bus_id=bus_id,
        district_id=district_id,
        license_number=license_number,
        license_category=license_category,
        phone=phone,
        profile_image_url=profile_image_url,
    )
    enforce_company_scope(current_user, payload.company_id)
    image_url = payload.profile_image_url
    if profile_image:
        image_url = _save_driver_image(profile_image)
    item = Driver(
        company_id=payload.company_id,
        full_name=payload.full_name,
        gender=payload.gender,
        bus_id=payload.bus_id,
        district_id=payload.district_id,
        license_number=payload.license_number,
        license_category=payload.license_category,
        phone=payload.phone,
        profile_image_url=image_url,
        is_active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@router.get("/drivers", dependencies=[Depends(get_current_user)])
def list_drivers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Driver)
    if current_user.role != Role.SUPER_ADMIN:
        query = query.where(Driver.company_id == current_user.company_id)
    items = db.scalars(query.order_by(Driver.id.desc())).all()
    return [
        {
            "id": i.id,
            "company_id": i.company_id,
            "full_name": i.full_name,
            "gender": i.gender,
            "bus_id": i.bus_id,
            "license_number": i.license_number,
            "district_id": i.district_id,
            "license_category": i.license_category,
            "phone": i.phone,
            "profile_image_url": i.profile_image_url,
        }
        for i in items
    ]


@router.put("/drivers/{driver_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
async def update_driver(
    driver_id: int,
    request: Request,
    company_id: int | None = Form(default=None),
    full_name: str | None = Form(default=None),
    gender: str | None = Form(default=None),
    bus_id: int | None = Form(default=None),
    district_id: int | None = Form(default=None),
    license_number: str | None = Form(default=None),
    license_category: str | None = Form(default=None),
    phone: str | None = Form(default=None),
    profile_image_url: str | None = Form(default=None),
    profile_image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = await _parse_driver_payload(
        request=request,
        company_id=company_id,
        full_name=full_name,
        gender=gender,
        bus_id=bus_id,
        district_id=district_id,
        license_number=license_number,
        license_category=license_category,
        phone=phone,
        profile_image_url=profile_image_url,
    )
    item = db.get(Driver, driver_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    enforce_company_scope(current_user, item.company_id)
    item.company_id = payload.company_id
    item.full_name = payload.full_name
    item.gender = payload.gender
    item.bus_id = payload.bus_id
    item.district_id = payload.district_id
    item.license_number = payload.license_number
    item.license_category = payload.license_category
    item.phone = payload.phone
    item.profile_image_url = payload.profile_image_url
    if profile_image:
        item.profile_image_url = _save_driver_image(profile_image)
    db.commit()
    return {"status": "updated"}


@router.delete("/drivers/{driver_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def delete_driver(driver_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(Driver, driver_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    enforce_company_scope(current_user, item.company_id)
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
