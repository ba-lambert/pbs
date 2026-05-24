from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.deps import enforce_company_scope, get_current_user, require_roles
from api.schemas import TripCreate
from models.entities import Booking, Bus, BusPark, District, Driver, Role, Route, Stop, Trip, User
from utils.bus_simulator import estimate_eta_minutes, interpolate_position

router = APIRouter()


def _trip_detail(trip: Trip, db: Session, include_passengers: bool = False) -> dict:
    bus = db.get(Bus, trip.bus_id)
    route = db.get(Route, trip.route_id)
    driver = db.get(Driver, trip.driver_id)

    paid_count = db.scalar(
        select(func.count(Booking.id))
        .where(Booking.trip_id == trip.id)
        .where(Booking.payment_status == "paid")
    ) or 0

    available_seats = max(0, (bus.capacity if bus else 0) - paid_count)

    data: dict = {
        "id": trip.id,
        "company_id": trip.company_id,
        "status": trip.status,
        "departure_at": trip.departure_at,
        "arrival_at": trip.arrival_at,
        "duration_minutes": trip.duration_minutes,
        "route_id": trip.route_id,
        "route_name": route.name if route else None,
        "bus_id": trip.bus_id,
        "bus_plate": bus.plate_number if bus else None,
        "bus_model": bus.model if bus else None,
        "bus_capacity": bus.capacity if bus else None,
        "driver_id": trip.driver_id,
        "driver_name": driver.full_name if driver else None,
        "driver_phone": driver.phone if driver else None,
        "passenger_count": paid_count,
        "available_seats": available_seats,
    }

    if include_passengers:
        bookings = db.execute(
            select(Booking, User, Stop, BusPark)
            .join(User, User.id == Booking.passenger_id)
            .outerjoin(Stop, Stop.id == Booking.origin_stop_id)
            .outerjoin(BusPark, BusPark.id == Booking.origin_park_id)
            .where(Booking.trip_id == trip.id)
            .where(Booking.payment_status == "paid")
        ).all()

        stops: dict[str, dict] = {}
        for booking, user, stop, park in bookings:
            key = f"stop_{stop.id}" if stop else (f"park_{park.id}" if park else "none")
            if key not in stops:
                board_name = stop.name if stop else (park.name if park else "No location")
                stops[key] = {"location_name": board_name, "passengers": []}
            dest_stop = db.get(Stop, booking.destination_stop_id) if booking.destination_stop_id else None
            dest_park = db.get(BusPark, booking.destination_park_id) if booking.destination_park_id else None
            dest_dist = db.get(District, booking.destination_district_id) if booking.destination_district_id else None
            dest_name = (dest_stop.name if dest_stop else None) or (dest_park.name if dest_park else None) or (dest_dist.name if dest_dist else "Unknown")
            stops[key]["passengers"].append({
                "booking_id": booking.id,
                "seat_number": booking.seat_number,
                "full_name": user.full_name,
                "passenger_email": booking.passenger_email,
                "profile_image_url": user.profile_image_url,
                "destination": dest_name,
                "fare_rwf": booking.fare_rwf,
            })
        data["boarding_stops"] = list(stops.values())

    return data


@router.post("", dependencies=[Depends(require_roles(Role.COMPANY_OPERATOR))])
def create_trip(payload: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    enforce_company_scope(current_user, payload.company_id)
    bus = db.get(Bus, payload.bus_id)
    driver = db.get(Driver, payload.driver_id)
    route = db.get(Route, payload.route_id)
    if not bus or not driver or not route:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid bus, driver or route")
    if driver.bus_id != payload.bus_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Driver is not assigned to this bus")
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
def list_available_trips(route_id: int | None = None, db: Session = Depends(get_db)):
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


@router.get("/driver/my-trips", dependencies=[Depends(require_roles(Role.DRIVER))])
def driver_my_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """All trips assigned to the logged-in driver (past, present, future)."""
    driver = db.scalar(select(Driver).where(Driver.user_id == current_user.id))
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found")
    trips = db.scalars(
        select(Trip)
        .where(Trip.driver_id == driver.id)
        .order_by(Trip.departure_at.desc())
    ).all()
    return [_trip_detail(t, db) for t in trips]


@router.get("/driver/active", dependencies=[Depends(require_roles(Role.DRIVER))])
def driver_active_trip(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
    return _trip_detail(trip, db)


@router.get("/{trip_id}/passengers", dependencies=[Depends(require_roles(Role.DRIVER, Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def trip_passengers(trip_id: int, db: Session = Depends(get_db)):
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return _trip_detail(trip, db, include_passengers=True)


@router.get("/{trip_id}/bus-proximity")
def bus_proximity_to_stop(
    trip_id: int,
    stop_id: int | None = None,
    park_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Passenger polls this: returns ETA minutes for bus to reach their pickup."""
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    route = db.get(Route, trip.route_id)
    if not route:
        return {"eta_minutes": None, "status": trip.status}

    now = datetime.now(UTC)
    pos = interpolate_position(route.geometry, trip.departure_at, trip.arrival_at, trip.duration_minutes, now)
    if not pos:
        return {"eta_minutes": None, "status": trip.status, "message": "Bus not yet in motion"}

    bus_lat, bus_lon = pos

    pickup_lat, pickup_lon = None, None
    if stop_id:
        row = db.execute(
            select(func.ST_Y(func.ST_Centroid(Stop.geometry)), func.ST_X(func.ST_Centroid(Stop.geometry))).where(Stop.id == stop_id)
        ).first()
        if row:
            pickup_lat, pickup_lon = float(row[0]), float(row[1])
    elif park_id:
        row = db.execute(
            select(func.ST_Y(func.ST_Centroid(BusPark.geometry)), func.ST_X(func.ST_Centroid(BusPark.geometry))).where(BusPark.id == park_id)
        ).first()
        if row:
            pickup_lat, pickup_lon = float(row[0]), float(row[1])

    if pickup_lat is None:
        return {"eta_minutes": None, "bus_lat": bus_lat, "bus_lon": bus_lon, "status": trip.status}

    eta = estimate_eta_minutes(bus_lat, bus_lon, pickup_lat, pickup_lon)
    return {
        "eta_minutes": round(eta, 1),
        "approaching": eta <= 10,
        "bus_lat": bus_lat,
        "bus_lon": bus_lon,
        "status": trip.status,
    }


@router.get("", dependencies=[Depends(get_current_user)])
def list_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Trip)
    if current_user.role != Role.SUPER_ADMIN:
        query = query.where(Trip.company_id == current_user.company_id)
    items = db.scalars(query.order_by(Trip.departure_at.desc())).all()
    return [_trip_detail(t, db) for t in items]


@router.put("/{trip_id}", dependencies=[Depends(require_roles(Role.COMPANY_OPERATOR))])
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
    if driver.bus_id != payload.bus_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Driver is not assigned to this bus")
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


@router.delete("/{trip_id}", dependencies=[Depends(require_roles(Role.COMPANY_OPERATOR))])
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(Trip, trip_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    enforce_company_scope(current_user, item.company_id)
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
