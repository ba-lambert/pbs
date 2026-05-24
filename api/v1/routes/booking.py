import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.core.config import settings
from api.core.database import get_db
from api.core.email import send_email
from api.deps import get_current_user, optional_current_user
from api.schemas import BookingCreate
from models.entities import Booking, Bus, BusPark, District, Driver, FareConfig, Role, Route, Stop, Trip, User
from utils.fare import calculate_linear_fare
from utils.geo import haversine_km
from utils.ticket_pdf import generate_ticket_pdf

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


def _resolve_location_name(db: Session, stop_id: int | None, park_id: int | None, district_id: int | None) -> str:
    if stop_id:
        s = db.get(Stop, stop_id)
        return s.name if s else "Unknown stop"
    if park_id:
        p = db.get(BusPark, park_id)
        return p.name if p else "Unknown park"
    if district_id:
        d = db.get(District, district_id)
        return d.name if d else "Unknown district"
    return "Unknown"


async def _send_ticket_email(
    to: str,
    passenger_name: str,
    booking_id: int,
    seat_number: int | None,
    route_name: str,
    bus_plate: str,
    departure_at,
    origin_name: str,
    destination_name: str,
    fare_rwf: float,
    distance_km: float,
) -> None:
    pdf_bytes = generate_ticket_pdf(
        booking_id=booking_id,
        passenger_name=passenger_name,
        passenger_email=to,
        seat_number=seat_number,
        route_name=route_name,
        bus_plate=bus_plate,
        departure_at=departure_at,
        origin_name=origin_name,
        destination_name=destination_name,
        fare_rwf=fare_rwf,
        distance_km=distance_km,
    )

    import base64
    import smtplib
    from email.mime.application import MIMEApplication
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    from api.core.config import settings

    def _send() -> None:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = f"Your PBS Ticket — {route_name} on {departure_at.strftime('%d %b %Y')}"
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
        msg["To"] = to

        html = f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#166534;">Your PBS E-Ticket is Ready!</h2>
          <p style="color:#374151;">Hi {passenger_name}, your booking <strong>PBS-{booking_id:06d}</strong> is confirmed.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Route</td><td style="font-weight:600;">{route_name}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Bus</td><td style="font-weight:600;">{bus_plate}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Departure</td><td style="font-weight:600;">{departure_at.strftime('%d %b %Y at %H:%M')}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Boarding at</td><td style="font-weight:600;">{origin_name}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Alighting at</td><td style="font-weight:600;">{destination_name}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Fare</td><td style="font-weight:700;color:#166534;">{int(fare_rwf):,} RWF</td></tr>
            {'<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Seat</td><td style="font-weight:600;">' + str(seat_number) + '</td></tr>' if seat_number else ''}
          </table>
          <p style="font-size:12px;color:#9ca3af;">Your PDF ticket is attached. Present it when boarding.</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))

        attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
        attachment.add_header("Content-Disposition", "attachment", filename=f"PBS-Ticket-{booking_id:06d}.pdf")
        msg.attach(attachment)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password.replace(" ", ""))
            server.sendmail(settings.smtp_user, to, msg.as_string())

    await asyncio.to_thread(_send)


@router.post("")
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(optional_current_user),
):
    trip = db.get(Trip, payload.trip_id)
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    # Guest validation: must supply name + email if not logged in
    if not current_user:
        if not payload.passenger_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required for guest bookings")
        if not payload.guest_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required for guest bookings")

    bus = db.get(Bus, trip.bus_id)
    if not bus:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bus not found for this trip")

    paid_count = db.scalar(
        select(func.count(Booking.id))
        .where(Booking.trip_id == payload.trip_id)
        .where(Booking.payment_status == "paid")
    ) or 0
    if paid_count >= bus.capacity:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This bus is full — no seats available")
    seat_number = paid_count + 1

    # Location & fare — optional; skip geo if locations not provided
    has_origin = any([payload.origin_stop_id, payload.origin_park_id])
    has_dest = any([payload.destination_stop_id, payload.destination_park_id, payload.destination_district_id])
    fare_cfg = db.scalar(select(FareConfig).order_by(FareConfig.id.asc()))
    base = fare_cfg.base_rwf_per_km if fare_cfg else 50.0

    if has_origin and has_dest:
        origin_lat, origin_lon = _get_point_coords(db, payload.origin_stop_id, payload.origin_park_id, None)
        destination_lat, destination_lon = _get_point_coords(
            db, payload.destination_stop_id, payload.destination_park_id, payload.destination_district_id
        )
        distance_km = haversine_km(origin_lat, origin_lon, destination_lat, destination_lon)
        fare = calculate_linear_fare(distance_km, base)
    else:
        distance_km = 0.0
        fare = base * 5  # flat minimum fare when no route info

    # Stripe payment verification
    payment_status = "pending"
    if payload.payment_intent_id and settings.stripe_secret_key:
        import stripe as _stripe
        _stripe.api_key = settings.stripe_secret_key
        intent = _stripe.PaymentIntent.retrieve(payload.payment_intent_id)
        if intent.status == "succeeded":
            payment_status = "paid"
        else:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Payment not completed")
    elif payload.payment_intent_id:
        payment_status = "paid"

    passenger_name = current_user.full_name if current_user else (payload.guest_name or "Guest")
    passenger_email = payload.passenger_email or (current_user.email if current_user else None)

    booking = Booking(
        passenger_id=current_user.id if current_user else None,
        guest_name=payload.guest_name if not current_user else None,
        trip_id=payload.trip_id,
        passenger_email=passenger_email,
        seat_number=seat_number if payment_status == "paid" else None,
        origin_stop_id=payload.origin_stop_id,
        origin_park_id=payload.origin_park_id,
        destination_stop_id=payload.destination_stop_id,
        destination_park_id=payload.destination_park_id,
        destination_district_id=payload.destination_district_id,
        distance_km=distance_km,
        fare_rwf=fare,
        status="booked",
        payment_intent_id=payload.payment_intent_id,
        payment_status=payment_status,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    if payment_status == "paid" and passenger_email:
        route = db.get(Route, trip.route_id)
        origin_name = _resolve_location_name(db, payload.origin_stop_id, payload.origin_park_id, None)
        dest_name = _resolve_location_name(db, payload.destination_stop_id, payload.destination_park_id, payload.destination_district_id)
        asyncio.create_task(
            _send_ticket_email(
                to=passenger_email,
                passenger_name=passenger_name,
                booking_id=booking.id,
                seat_number=seat_number,
                route_name=route.name if route else "Unknown route",
                bus_plate=bus.plate_number,
                departure_at=trip.departure_at,
                origin_name=origin_name,
                destination_name=dest_name,
                fare_rwf=fare,
                distance_km=distance_km,
            )
        )

    remaining_seats = max(0, bus.capacity - (paid_count + (1 if payment_status == "paid" else 0)))
    return {
        "id": booking.id,
        "distance_km": booking.distance_km,
        "fare_rwf": booking.fare_rwf,
        "payment_status": payment_status,
        "seat_number": booking.seat_number,
        "remaining_seats": remaining_seats,
    }


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
            "seat_number": item.seat_number,
            "distance_km": item.distance_km,
            "fare_rwf": item.fare_rwf,
            "status": item.status,
            "payment_status": item.payment_status,
        }
        for item in items
    ]
