from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.schemas import PlannerRequest
from models.entities import BusPark, District, FareConfig, Route, Stop
from utils.fare import calculate_linear_fare
from utils.geo import haversine_km

router = APIRouter()


def _resolve_location(db: Session, location_type: str, location_id: int) -> tuple[float, float]:
    if location_type == "stop":
        row = db.execute(
            select(func.ST_Y(func.ST_Centroid(Stop.geometry)), func.ST_X(func.ST_Centroid(Stop.geometry))).where(Stop.id == location_id)
        ).first()
    elif location_type == "park":
        row = db.execute(
            select(func.ST_Y(func.ST_Centroid(BusPark.geometry)), func.ST_X(func.ST_Centroid(BusPark.geometry))).where(BusPark.id == location_id)
        ).first()
    elif location_type == "district":
        row = db.execute(
            select(func.ST_Y(func.ST_Centroid(BusPark.geometry)), func.ST_X(func.ST_Centroid(BusPark.geometry)))
            .join(District, District.id == BusPark.district_id)
            .where(District.id == location_id)
            .limit(1)
        ).first()
    else:
        row = None
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid {location_type} location")
    return float(row[0]), float(row[1])


@router.post("/plan")
def plan_trip(payload: PlannerRequest, db: Session = Depends(get_db)):
    origin_lat, origin_lon = _resolve_location(db, payload.origin_type, payload.origin_id)
    destination_lat, destination_lon = _resolve_location(db, payload.destination_type, payload.destination_id)
    distance_km = haversine_km(origin_lat, origin_lon, destination_lat, destination_lon)
    fare_cfg = db.scalar(select(FareConfig).order_by(FareConfig.id.asc()))
    base = fare_cfg.base_rwf_per_km if fare_cfg else 50.0
    estimated_fare = calculate_linear_fare(distance_km, base)
    routes = db.scalars(select(Route).limit(5)).all()
    return {
        "origin": {"type": payload.origin_type, "id": payload.origin_id},
        "destination": {"type": payload.destination_type, "id": payload.destination_id},
        "distance_km": round(distance_km, 2),
        "estimated_fare_rwf": estimated_fare,
        "candidate_routes": [{"id": route.id, "name": route.name, "company_id": route.company_id} for route in routes],
    }

