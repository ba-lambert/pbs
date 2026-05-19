from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.deps import get_current_user, require_roles
from api.schemas import BookingCreate
from models.entities import Booking, BusPark, District, FareConfig, Role, Stop, Trip, User
from utils.fare import calculate_linear_fare
from utils.geo import haversine_km

router = APIRouter()


def _get_point_coords(
    db: Session,
    stop_id: int | None,
    park_id: int | None,
    district_id: int | None,
) -> tuple[float, float]:
    if stop_id:
        row = db.execute(
            select(func.ST_Y(func.ST_Centroid(Stop.geometry)), func.ST_X(func.ST_Centroid(Stop.geometry))).where(Stop.id == stop_id)
        ).first()
    elif park_id:
        row = db.execute(
            select(func.ST_Y(func.ST_Centroid(BusPark.geometry)), func.ST_X(func.ST_Centroid(BusPark.geometry))).where(BusPark.id == park_id)
        ).first()
    elif district_id:
        row = db.execute(
            select(func.ST_Y(func.ST_Centroid(BusPark.geometry)), func.ST_X(func.ST_Centroid(BusPark.geometry)))
            .join(District, District.id == BusPark.district_id)
            .where(District.id == district_id)
            .limit(1)
        ).first()
    else:
        row = None
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Location point not found")
    return float(row[0]), float(row[1])


@router.post("", dependencies=[Depends(require_roles(Role.PASSENGER, Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def create_booking(payload: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.get(Trip, payload.trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    origin_lat, origin_lon = _get_point_coords(db, payload.origin_stop_id, payload.origin_park_id, None)
    destination_lat, destination_lon = _get_point_coords(
        db, payload.destination_stop_id, payload.destination_park_id, payload.destination_district_id
    )
    distance_km = haversine_km(origin_lat, origin_lon, destination_lat, destination_lon)
    fare_cfg = db.scalar(select(FareConfig).order_by(FareConfig.id.asc()))
    base = fare_cfg.base_rwf_per_km if fare_cfg else 50.0
    fare = calculate_linear_fare(distance_km, base)
    booking = Booking(
        passenger_id=current_user.id,
        trip_id=payload.trip_id,
        origin_stop_id=payload.origin_stop_id,
        origin_park_id=payload.origin_park_id,
        destination_stop_id=payload.destination_stop_id,
        destination_park_id=payload.destination_park_id,
        destination_district_id=payload.destination_district_id,
        distance_km=distance_km,
        fare_rwf=fare,
        status="booked",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return {"id": booking.id, "distance_km": booking.distance_km, "fare_rwf": booking.fare_rwf}


@router.get("", dependencies=[Depends(get_current_user)])
def list_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Booking)
    if current_user.role == Role.PASSENGER:
        query = query.where(Booking.passenger_id == current_user.id)
    items = db.scalars(query.order_by(Booking.id.desc())).all()
    return [
        {
            "id": item.id,
            "trip_id": item.trip_id,
            "passenger_id": item.passenger_id,
            "distance_km": item.distance_km,
            "fare_rwf": item.fare_rwf,
            "status": item.status,
        }
        for item in items
    ]

