from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.deps import enforce_company_scope, get_current_user, optional_current_user, require_roles
from api.schemas import TripCreate
from models.entities import Booking, Bus, Driver, Role, Route, Stop, Trip, User

router = APIRouter()


@router.post("", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def create_trip(payload: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    enforce_company_scope(current_user, payload.company_id)
    bus = db.get(Bus, payload.bus_id)
    driver = db.get(Driver, payload.driver_id)
    route = db.get(Route, payload.route_id)
    if not bus or not driver or not route:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid bus, driver or route")
    if len({bus.company_id, driver.company_id, route.company_id, payload.company_id}) != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip entities must belong to same company")
    arrival_at = payload.arrival_at
    if arrival_at is None and payload.duration_minutes is not None:
        arrival_at = payload.departure_at + timedelta(minutes=payload.duration_minutes)
    duration_minutes = payload.duration_minutes
    if duration_minutes is None and arrival_at is not None:
        duration_minutes = int((arrival_at - payload.departure_at).total_seconds() // 60)
    item = Trip(
        company_id=payload.company_id,
        route_id=payload.route_id,
        bus_id=payload.bus_id,
        driver_id=payload.driver_id,
        departure_at=payload.departure_at,
        arrival_at=arrival_at,
        duration_minutes=duration_minutes,
        status="scheduled",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@router.get("/available")
def list_available_trips(
    route_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Public endpoint — returns upcoming trips with seat availability."""
    now = datetime.now(UTC)
    query = (
        select(Trip, Bus, Route)
        .join(Bus, Bus.id == Trip.bus_id)
        .join(Route, Route.id == Trip.route_id)
        .where(Trip.departure_at >= now)
        .where(Trip.status.in_(["scheduled", "boarding"]))
    )
    if route_id:
        query = query.where(Trip.route_id == route_id)
    rows = db.execute(query.order_by(Trip.departure_at.asc())).all()
    result = []
    for trip, bus, route in rows:
        booked = db.scalar(
            select(func.count(Booking.id))
            .where(Booking.trip_id == trip.id)
            .where(Booking.payment_status == "paid")
        ) or 0
        result.append({
            "id": trip.id,
            "route_id": trip.route_id,
            "route_name": route.name,
            "bus_id": trip.bus_id,
            "bus_capacity": bus.capacity,
            "bus_model": bus.model,
            "bus_plate": bus.plate_number,
            "driver_id": trip.driver_id,
            "departure_at": trip.departure_at,
            "arrival_at": trip.arrival_at,
            "duration_minutes": trip.duration_minutes,
            "status": trip.status,
            "available_seats": max(0, bus.capacity - booked),
        })
    return result


@router.get("/driver/active", dependencies=[Depends(require_roles(Role.DRIVER))])
def driver_active_trip(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the driver's current or next upcoming trip."""
    driver = db.scalar(select(Driver).where(Driver.user_id == current_user.id))
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found")
    now = datetime.now(UTC)
    trip = db.scalar(
        select(Trip)
        .where(Trip.driver_id == driver.id)
        .where(Trip.departure_at >= now - timedelta(hours=2))
        .where(Trip.departure_at <= now + timedelta(hours=24))
        .where(Trip.status.in_(["scheduled", "boarding", "in_progress"]))
        .order_by(Trip.departure_at.asc())
    )
    if not trip:
        return None
    bus = db.get(Bus, trip.bus_id)
    route = db.get(Route, trip.route_id)
    booked = db.scalar(
        select(func.count(Booking.id))
        .where(Booking.trip_id == trip.id)
        .where(Booking.payment_status == "paid")
    ) or 0
    return {
        "id": trip.id,
        "route_id": trip.route_id,
        "route_name": route.name if route else None,
        "route_geometry": route.geometry if route else None,
        "bus_id": trip.bus_id,
        "bus_capacity": bus.capacity if bus else None,
        "bus_model": bus.model if bus else None,
        "bus_plate": bus.plate_number if bus else None,
        "departure_at": trip.departure_at,
        "arrival_at": trip.arrival_at,
        "duration_minutes": trip.duration_minutes,
        "status": trip.status,
        "passenger_count": booked,
    }


@router.get("/{trip_id}/passengers", dependencies=[Depends(require_roles(Role.DRIVER))])
def trip_passengers_by_stop(trip_id: int, db: Session = Depends(get_db)):
    """Returns passengers grouped by boarding stop for driver view."""
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    bookings = db.execute(
        select(Booking, User, Stop)
        .join(User, User.id == Booking.passenger_id)
        .outerjoin(Stop, Stop.id == Booking.origin_stop_id)
        .where(Booking.trip_id == trip_id)
        .where(Booking.payment_status == "paid")
    ).all()

    stops: dict[int | None, dict] = {}
    for booking, user, stop in bookings:
        key = stop.id if stop else None
        if key not in stops:
            stops[key] = {
                "stop_id": stop.id if stop else None,
                "stop_name": stop.name if stop else "No stop",
                "passengers": [],
            }
        stops[key]["passengers"].append({
            "booking_id": booking.id,
            "full_name": user.full_name,
            "phone": None,
            "profile_image_url": user.profile_image_url,
        })
    return list(stops.values())


@router.get("", dependencies=[Depends(get_current_user)])
def list_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Trip)
    if current_user.role != Role.SUPER_ADMIN:
        query = query.where(Trip.company_id == current_user.company_id)
    items = db.scalars(query.order_by(Trip.departure_at.desc())).all()
    return [
        {
            "id": item.id,
            "company_id": item.company_id,
            "route_id": item.route_id,
            "bus_id": item.bus_id,
            "driver_id": item.driver_id,
            "departure_at": item.departure_at,
            "arrival_at": item.arrival_at,
            "duration_minutes": item.duration_minutes,
            "status": item.status,
        }
        for item in items
    ]


@router.put("/{trip_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def update_trip(trip_id: int, payload: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(Trip, trip_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    enforce_company_scope(current_user, item.company_id)
    bus = db.get(Bus, payload.bus_id)
    driver = db.get(Driver, payload.driver_id)
    route = db.get(Route, payload.route_id)
    if not bus or not driver or not route:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid bus, driver or route")
    if len({bus.company_id, driver.company_id, route.company_id, payload.company_id}) != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trip entities must belong to same company")
    arrival_at = payload.arrival_at
    if arrival_at is None and payload.duration_minutes is not None:
        arrival_at = payload.departure_at + timedelta(minutes=payload.duration_minutes)
    duration_minutes = payload.duration_minutes
    if duration_minutes is None and arrival_at is not None:
        duration_minutes = int((arrival_at - payload.departure_at).total_seconds() // 60)
    item.company_id = payload.company_id
    item.route_id = payload.route_id
    item.bus_id = payload.bus_id
    item.driver_id = payload.driver_id
    item.departure_at = payload.departure_at
    item.arrival_at = arrival_at
    item.duration_minutes = duration_minutes
    db.commit()
    return {"status": "updated"}


@router.delete("/{trip_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(Trip, trip_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    enforce_company_scope(current_user, item.company_id)
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
