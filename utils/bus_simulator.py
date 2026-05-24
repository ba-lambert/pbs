"""
Simulates bus GPS position along a route LINESTRING based on trip timing.
Rwanda-specific: uses WGS84, defaults to Kigali region coords.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone


def _parse_linestring(wkt_or_geojson: str) -> list[tuple[float, float]]:
    """Returns list of (lon, lat) pairs from WKT LINESTRING or GeoJSON string."""
    s = wkt_or_geojson.strip()
    # GeoJSON geometry string from PostGIS
    if s.startswith("{") or s.startswith("["):
        try:
            geo = json.loads(s)
            if isinstance(geo, dict) and geo.get("type") == "LineString":
                return [(c[0], c[1]) for c in geo["coordinates"]]
        except Exception:
            pass
    # WKT: LINESTRING(30.06 -1.94, 30.07 -1.95, ...)
    if "LINESTRING" in s.upper():
        inner = s[s.index("(") + 1 : s.rindex(")")]
        pairs = []
        for part in inner.split(","):
            parts = part.strip().split()
            if len(parts) >= 2:
                pairs.append((float(parts[0]), float(parts[1])))
        return pairs
    return []


def _segment_lengths(coords: list[tuple[float, float]]) -> list[float]:
    """Haversine distances between consecutive coords (in km)."""
    R = 6371.0
    lengths = []
    for i in range(len(coords) - 1):
        lon1, lat1 = math.radians(coords[i][0]), math.radians(coords[i][1])
        lon2, lat2 = math.radians(coords[i + 1][0]), math.radians(coords[i + 1][1])
        dlat, dlon = lat2 - lat1, lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        lengths.append(2 * R * math.asin(math.sqrt(a)))
    return lengths


def interpolate_position(
    geometry: str,
    departure_at: datetime,
    arrival_at: datetime | None,
    duration_minutes: int | None,
    now: datetime | None = None,
) -> tuple[float, float] | None:
    """
    Returns (lat, lon) for the simulated bus position at `now` along the route.
    Returns None if the trip hasn't started yet or has completed.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    if departure_at.tzinfo is None:
        departure_at = departure_at.replace(tzinfo=timezone.utc)

    if arrival_at is not None:
        if arrival_at.tzinfo is None:
            arrival_at = arrival_at.replace(tzinfo=timezone.utc)
        end = arrival_at
    elif duration_minutes:
        from datetime import timedelta
        end = departure_at + timedelta(minutes=duration_minutes)
    else:
        from datetime import timedelta
        end = departure_at + timedelta(hours=2)

    if now < departure_at or now > end:
        return None

    elapsed = (now - departure_at).total_seconds()
    total = (end - departure_at).total_seconds()
    progress = min(1.0, max(0.0, elapsed / total))

    coords = _parse_linestring(geometry)
    if not coords:
        return None

    if len(coords) == 1:
        return coords[0][1], coords[0][0]

    lengths = _segment_lengths(coords)
    total_len = sum(lengths)
    if total_len == 0:
        return coords[0][1], coords[0][0]

    target = progress * total_len
    accumulated = 0.0
    for i, seg_len in enumerate(lengths):
        if accumulated + seg_len >= target or i == len(lengths) - 1:
            t = (target - accumulated) / seg_len if seg_len > 0 else 0
            t = max(0.0, min(1.0, t))
            lon = coords[i][0] + t * (coords[i + 1][0] - coords[i][0])
            lat = coords[i][1] + t * (coords[i + 1][1] - coords[i][1])
            return lat, lon
        accumulated += seg_len

    return coords[-1][1], coords[-1][0]


def estimate_eta_minutes(
    bus_lat: float,
    bus_lon: float,
    stop_lat: float,
    stop_lon: float,
    speed_kmh: float = 30.0,
) -> float:
    """Rough ETA in minutes from bus to stop using haversine + average Rwanda city speed."""
    R = 6371.0
    lat1, lon1 = math.radians(bus_lat), math.radians(bus_lon)
    lat2, lon2 = math.radians(stop_lat), math.radians(stop_lon)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    dist_km = 2 * R * math.asin(math.sqrt(a))
    return (dist_km / speed_kmh) * 60
