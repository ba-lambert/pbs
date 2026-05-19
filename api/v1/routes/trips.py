from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import timedelta

from api.core.database import get_db
from api.deps import enforce_company_scope, get_current_user, require_roles
from api.schemas import TripCreate
from models.entities import Bus, Driver, Role, Route, Trip, User

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
