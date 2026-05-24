import asyncio
import logging
import secrets
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.core.email import send_driver_welcome
from api.core.security import hash_password
from api.deps import enforce_company_scope, get_current_user, require_roles
from api.schemas import BusCreate, BusDistrictAssign, DriverCreate
from models.entities import Bus, BusDistrict, Driver, Role, User

logger = logging.getLogger(__name__)

router = APIRouter()
UPLOAD_DIR = Path("uploads/drivers")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def _parse_driver_payload(
    request: Request,
    company_id: int | None,
    email: str | None,
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
            "email": email,
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


def _check_bus_driver_limit(db: Session, bus_id: int, exclude_driver_id: int | None = None) -> None:
    query = select(Driver).where(Driver.bus_id == bus_id)
    if exclude_driver_id:
        query = query.where(Driver.id != exclude_driver_id)
    count = len(db.scalars(query).all())
    if count >= 3:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A bus can have at most 3 drivers assigned")


@router.post("/drivers", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_OPERATOR))])
async def create_driver(
    request: Request,
    company_id: int | None = Form(default=None),
    email: str | None = Form(default=None),
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
        email=email,
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

    if db.scalar(select(Driver).where(Driver.phone == payload.phone)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already registered to another driver")
    if db.scalar(select(Driver).where(Driver.license_number == payload.license_number)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License number already registered to another driver")
    if payload.email and db.scalar(select(Driver).where(Driver.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered to another driver")
    if payload.bus_id:
        _check_bus_driver_limit(db, payload.bus_id)

    image_url = payload.profile_image_url
    if profile_image:
        image_url = _save_driver_image(profile_image)

    driver_user_id = None
    default_password = None
    if payload.email:
        if db.scalar(select(User).where(User.email == payload.email)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered as a user account")
        chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        default_password = "".join(secrets.choice(chars) for _ in range(8))
        driver_user = User(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(default_password),
            role=Role.DRIVER,
            company_id=payload.company_id,
            is_active=True,
            must_change_password=True,
        )
        db.add(driver_user)
        db.flush()
        driver_user_id = driver_user.id

    item = Driver(
        company_id=payload.company_id,
        user_id=driver_user_id,
        email=payload.email,
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

    if default_password and payload.email:
        asyncio.create_task(
            send_driver_welcome(payload.email, payload.full_name, default_password)
        )

    return {"id": item.id, "user_id": driver_user_id}


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
            "email": i.email,
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


@router.put("/drivers/{driver_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_OPERATOR))])
async def update_driver(
    driver_id: int,
    request: Request,
    company_id: int | None = Form(default=None),
    email: str | None = Form(default=None),
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
        email=email,
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

    if payload.phone != item.phone and db.scalar(select(Driver).where(Driver.phone == payload.phone)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already registered to another driver")
    if payload.license_number != item.license_number and db.scalar(select(Driver).where(Driver.license_number == payload.license_number)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License number already registered to another driver")
    if payload.email and payload.email != item.email and db.scalar(select(Driver).where(Driver.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered to another driver")
    if payload.bus_id and payload.bus_id != item.bus_id:
        _check_bus_driver_limit(db, payload.bus_id, exclude_driver_id=driver_id)

    item.company_id = payload.company_id
    item.email = payload.email
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


@router.delete("/drivers/{driver_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_OPERATOR))])
def delete_driver(driver_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(Driver, driver_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found")
    enforce_company_scope(current_user, item.company_id)
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
