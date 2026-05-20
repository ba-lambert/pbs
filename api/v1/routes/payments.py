from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import stripe

from api.core.config import settings
from api.core.database import get_db
from api.deps import require_roles
from api.schemas import PaymentIntentCreate
from api.v1.routes.planner import _resolve_location
from models.entities import Booking, Bus, FareConfig, Role, Trip
from utils.fare import calculate_linear_fare
from utils.geo import haversine_km

router = APIRouter()


def _get_stripe():
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Stripe not configured")
    stripe.api_key = settings.stripe_secret_key
    return stripe


@router.post("/intent", dependencies=[Depends(require_roles(Role.PASSENGER))])
def create_payment_intent(
    payload: PaymentIntentCreate,
    db: Session = Depends(get_db),
):
    s = _get_stripe()
    trip = db.get(Trip, payload.trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    bus = db.get(Bus, trip.bus_id)
    booked = db.scalar(
        select(func.count(Booking.id))
        .where(Booking.trip_id == trip.id)
        .where(Booking.payment_status == "paid")
    ) or 0
    if bus and booked >= bus.capacity:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No seats available")

    origin_lat, origin_lon = _resolve_location(db, payload.origin_type, payload.origin_id)
    dest_lat, dest_lon = _resolve_location(db, payload.destination_type, payload.destination_id)
    distance_km = haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
    fare_cfg = db.scalar(select(FareConfig).order_by(FareConfig.id.asc()))
    base = fare_cfg.base_rwf_per_km if fare_cfg else 50.0
    fare_rwf = calculate_linear_fare(distance_km, base)

    amount_cents = max(50, int(fare_rwf))
    intent = s.PaymentIntent.create(
        amount=amount_cents,
        currency="rwf",
        metadata={
            "trip_id": trip.id,
            "origin_type": payload.origin_type,
            "origin_id": payload.origin_id,
            "destination_type": payload.destination_type,
            "destination_id": payload.destination_id,
        },
    )
    return {
        "client_secret": intent.client_secret,
        "payment_intent_id": intent.id,
        "fare_rwf": fare_rwf,
        "distance_km": round(distance_km, 2),
    }
