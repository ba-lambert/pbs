from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.core.ws import ws_manager
from api.deps import get_current_user, require_roles
from api.schemas import GpsIngestRequest
from models.entities import Bus, BusLocation, Company, Driver, Role, Route, Stop, Trip, User
from utils.bus_simulator import interpolate_position
from utils.geo import haversine_km

router = APIRouter()


@router.post("/ingest", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
async def ingest_location(payload: GpsIngestRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bus = db.scalar(select(Bus).where(Bus.gps_imei == payload.imei))
    if not bus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus IMEI not found")
    if current_user.role != Role.SUPER_ADMIN and bus.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company scope violation")
    location = BusLocation(
        bus_id=bus.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        speed_kmh=payload.speed_kmh,
        recorded_at=payload.recorded_at,
    )
    db.add(location)
    db.commit()
    await ws_manager.broadcast_bus(
        bus.id,
        {
            "bus_id": bus.id,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "speed_kmh": payload.speed_kmh,
            "recorded_at": payload.recorded_at.isoformat(),
        },
    )
    return {"status": "ok", "bus_id": bus.id}


@router.websocket("/ws/buses/{bus_id}")
async def bus_updates(websocket: WebSocket, bus_id: int):
    await ws_manager.connect(websocket, bus_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, bus_id)


@router.get("/buses/{bus_id}/latest", dependencies=[Depends(get_current_user)])
def latest_location(bus_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bus = db.get(Bus, bus_id)
    if not bus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus not found")
    if current_user.role != Role.SUPER_ADMIN and bus.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company scope violation")
    latest = db.scalar(select(BusLocation).where(BusLocation.bus_id == bus_id).order_by(BusLocation.recorded_at.desc()))
    if not latest:
        return {"bus_id": bus_id, "location": None}
    return {
        "bus_id": bus_id,
        "latitude": latest.latitude,
        "longitude": latest.longitude,
        "speed_kmh": latest.speed_kmh,
        "recorded_at": latest.recorded_at,
    }


@router.get("/buses/{bus_id}/distance-to-stop/{stop_id}", dependencies=[Depends(get_current_user)])
def distance_to_stop(bus_id: int, stop_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bus = db.get(Bus, bus_id)
    if not bus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus not found")
    if current_user.role != Role.SUPER_ADMIN and bus.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company scope violation")
    latest = db.scalar(select(BusLocation).where(BusLocation.bus_id == bus_id).order_by(BusLocation.recorded_at.desc()))
    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No location for bus")
    stop_row = db.execute(
        select(func.ST_Y(func.ST_Centroid(Stop.geometry)), func.ST_X(func.ST_Centroid(Stop.geometry))).where(Stop.id == stop_id)
    ).first()
    if not stop_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found")
    distance_km = haversine_km(latest.latitude, latest.longitude, float(stop_row[0]), float(stop_row[1]))
    eta_minutes = None
    if latest.speed_kmh and latest.speed_kmh > 0:
        eta_minutes = round((distance_km / latest.speed_kmh) * 60, 2)
    return {"bus_id": bus_id, "stop_id": stop_id, "distance_km": round(distance_km, 2), "eta_minutes": eta_minutes}


@router.get("/fleet", dependencies=[Depends(get_current_user)])
def fleet_positions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns simulated real-time positions for all active buses.
    Admin sees all; company_operator sees their company only.
    Simulation: interpolates position along route geometry based on trip progress.
    Falls back to last known BusLocation if no active trip.
    """
    now = datetime.now(UTC)

    bus_query = select(Bus).where(Bus.is_active == True)
    if current_user.role != Role.SUPER_ADMIN:
        bus_query = bus_query.where(Bus.company_id == current_user.company_id)
    buses = db.scalars(bus_query).all()

    company_cache: dict[int, str] = {}

    def company_name(cid: int) -> str:
        if cid not in company_cache:
            c = db.get(Company, cid)
            company_cache[cid] = c.name if c else f"Company {cid}"
        return company_cache[cid]

    result = []
    for bus in buses:
        # Find the most relevant trip: in-progress or about to depart within 2h
        active_trip = db.scalar(
            select(Trip)
            .where(Trip.bus_id == bus.id)
            .where(Trip.departure_at >= now - timedelta(hours=2))
            .where(Trip.departure_at <= now + timedelta(hours=24))
            .where(Trip.status.in_(["scheduled", "boarding", "in_progress"]))
            .order_by(Trip.departure_at.asc())
        )

        lat, lon, simulated = None, None, False
        route_name, trip_id, driver_name = None, None, None

        if active_trip:
            route = db.get(Route, active_trip.route_id)
            driver = db.get(Driver, active_trip.driver_id)
            route_name = route.name if route else None
            trip_id = active_trip.id
            driver_name = driver.full_name if driver else None

            if route and route.geometry:
                pos = interpolate_position(
                    route.geometry,
                    active_trip.departure_at,
                    active_trip.arrival_at,
                    active_trip.duration_minutes,
                    now,
                )
                if pos:
                    lat, lon, simulated = pos[0], pos[1], True

        if lat is None:
            # Fall back to last known real GPS location
            latest = db.scalar(
                select(BusLocation).where(BusLocation.bus_id == bus.id).order_by(BusLocation.recorded_at.desc())
            )
            if latest:
                lat, lon = latest.latitude, latest.longitude

        result.append({
            "bus_id": bus.id,
            "plate_number": bus.plate_number,
            "model": bus.model,
            "company_id": bus.company_id,
            "company_name": company_name(bus.company_id),
            "trip_id": trip_id,
            "route_name": route_name,
            "driver_name": driver_name,
            "latitude": lat,
            "longitude": lon,
            "simulated": simulated,
            "has_active_trip": active_trip is not None,
        })

    return result
