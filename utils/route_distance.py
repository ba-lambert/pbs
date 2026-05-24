"""
PostGIS-based road distance along a route LineString.

Uses ST_LineLocatePoint to project origin/destination onto the route,
then ST_Length(ST_LineSubstring(…)::geography) to measure road distance.
Falls back to haversine if geometry is unavailable.
"""
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from utils.geo import haversine_km


def _point_wkt(lat: float, lon: float) -> str:
    return f"ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326)"


def route_fractions_and_distance(
    db: Session,
    route_id: int,
    from_lat: float,
    from_lon: float,
    to_lat: float,
    to_lon: float,
) -> tuple[float, float, float]:
    """
    Returns (board_fraction, alight_fraction, distance_km) along the route.
    Fractions are 0–1 representing position along the LineString.
    Falls back to haversine if PostGIS call fails.
    """
    try:
        row = db.execute(
            text("""
                SELECT
                    ST_LineLocatePoint(r.geometry, ST_SetSRID(ST_MakePoint(:from_lon, :from_lat), 4326)) AS board_frac,
                    ST_LineLocatePoint(r.geometry, ST_SetSRID(ST_MakePoint(:to_lon,   :to_lat  ), 4326)) AS alight_frac,
                    ST_Length(
                        ST_LineSubstring(
                            r.geometry,
                            LEAST(
                                ST_LineLocatePoint(r.geometry, ST_SetSRID(ST_MakePoint(:from_lon, :from_lat), 4326)),
                                ST_LineLocatePoint(r.geometry, ST_SetSRID(ST_MakePoint(:to_lon,   :to_lat  ), 4326))
                            ),
                            GREATEST(
                                ST_LineLocatePoint(r.geometry, ST_SetSRID(ST_MakePoint(:from_lon, :from_lat), 4326)),
                                ST_LineLocatePoint(r.geometry, ST_SetSRID(ST_MakePoint(:to_lon,   :to_lat  ), 4326))
                            )
                        )::geography
                    ) / 1000.0 AS distance_km
                FROM routes r
                WHERE r.id = :route_id
            """),
            {"route_id": route_id, "from_lat": from_lat, "from_lon": from_lon, "to_lat": to_lat, "to_lon": to_lon},
        ).first()

        if row is None or row.board_frac is None:
            raise ValueError("no geometry")

        board_frac  = float(row.board_frac)
        alight_frac = float(row.alight_frac)
        distance_km = float(row.distance_km) if row.distance_km else haversine_km(from_lat, from_lon, to_lat, to_lon)
        return board_frac, alight_frac, distance_km

    except Exception:
        # fallback: assume linear route, estimate fractions by haversine ratio
        dist = haversine_km(from_lat, from_lon, to_lat, to_lon)
        return 0.0, 1.0, dist


def segment_seats_taken(
    db: Session,
    trip_id: int,
    board_frac: float,
    alight_frac: float,
) -> int:
    """
    Count paid bookings whose route segment overlaps with (board_frac, alight_frac).
    Two segments overlap when they share any portion of the route.
    """
    from models.entities import Booking

    lo = min(board_frac, alight_frac)
    hi = max(board_frac, alight_frac)

    count = db.execute(
        text("""
            SELECT COUNT(*) FROM bookings
            WHERE trip_id = :trip_id
              AND payment_status = 'paid'
              AND board_fraction IS NOT NULL
              AND alight_fraction IS NOT NULL
              AND board_fraction  < :hi
              AND alight_fraction > :lo
        """),
        {"trip_id": trip_id, "lo": lo, "hi": hi},
    ).scalar() or 0
    return int(count)
