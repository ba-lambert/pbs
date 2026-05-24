#!/usr/bin/env python3
"""
PBS Rwanda — GPS vehicle simulator.

Fetches a real road route from OSRM then replays it as live GPS pings
to the tracking ingest endpoint. Watch the bus move on the fleet map.

Usage:
    python scripts/simulate_trip.py \\
      --imei ABC123456 \\
      --osrm-url "https://router.project-osrm.org/route/v1/driving/30.0442993,-1.941918;29.9872683,-1.9697946?overview=full&geometries=geojson" \\
      --speed 60 \\
      --email admin@pbs.rw --password secret
"""

import argparse
import math
import time
from datetime import UTC, datetime

import requests

DEFAULT_API      = "http://localhost:8000"
DEFAULT_SPEED    = 60.0
DEFAULT_INTERVAL = 5


# ── geometry ──────────────────────────────────────────────────────────────────

def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def walk_route(coords, speed_kmh, interval_s):
    """Yield (lat, lon, total_km) at each interval step along the route."""
    dists = [0.0]
    for i in range(1, len(coords)):
        dists.append(dists[-1] + _haversine_km(
            coords[i-1][1], coords[i-1][0],
            coords[i][1],   coords[i][0],
        ))
    total_km = dists[-1]
    step_km  = speed_kmh * (interval_s / 3600.0)
    covered  = 0.0
    while covered <= total_km:
        lat, lon = coords[-1][1], coords[-1][0]
        for i in range(1, len(coords)):
            if dists[i] >= covered:
                seg = dists[i] - dists[i-1]
                f   = (covered - dists[i-1]) / seg if seg > 0 else 0.0
                lat = coords[i-1][1] + (coords[i][1] - coords[i-1][1]) * f
                lon = coords[i-1][0] + (coords[i][0] - coords[i-1][0]) * f
                break
        yield lat, lon, total_km
        covered += step_km


# ── OSRM ──────────────────────────────────────────────────────────────────────

def fetch_osrm_coords(url: str) -> list:
    print("Fetching route from OSRM…")
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    try:
        coords = data["routes"][0]["geometry"]["coordinates"]
    except (KeyError, IndexError):
        raise SystemExit(
            "OSRM response missing routes[0].geometry.coordinates\n"
            "Make sure the URL includes: ?overview=full&geometries=geojson"
        )
    print(f"  {len(coords)} waypoints received.")
    return coords  # [[lon, lat], ...]


# ── API ───────────────────────────────────────────────────────────────────────

def login(api_url, email, password):
    r = requests.post(
        f"{api_url}/api/v1/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def post_location(api_url, token, imei, lat, lon, speed):
    r = requests.post(
        f"{api_url}/api/v1/tracking/ingest",
        json={
            "imei":        imei,
            "latitude":    round(lat, 6),
            "longitude":   round(lon, 6),
            "speed_kmh":   speed,
            "recorded_at": datetime.now(UTC).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    r.raise_for_status()


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description="PBS Rwanda — GPS vehicle simulator")
    p.add_argument("--imei",     required=True, help="Bus GPS IMEI")
    p.add_argument("--osrm-url", required=True, metavar="URL",
                   help="OSRM route URL — must include ?overview=full&geometries=geojson")
    p.add_argument("--speed",    type=float, default=DEFAULT_SPEED,
                   help=f"Speed in km/h (default {DEFAULT_SPEED})")
    p.add_argument("--interval", type=float, default=DEFAULT_INTERVAL,
                   help=f"Seconds between pings (default {DEFAULT_INTERVAL})")
    p.add_argument("--email",    help="Operator email")
    p.add_argument("--password", help="Operator password")
    p.add_argument("--token",    help="JWT token (skip login)")
    p.add_argument("--api-url",  default=DEFAULT_API,
                   help=f"API base URL (default {DEFAULT_API})")
    args = p.parse_args()

    # Auth
    if args.token:
        token = args.token
    elif args.email and args.password:
        print(f"Logging in as {args.email}…")
        token = login(args.api_url, args.email, args.password)
        print("  OK\n")
    else:
        p.error("Provide --token OR both --email and --password")

    # Fetch route
    coords = fetch_osrm_coords(args.osrm_url)

    total_km = sum(
        _haversine_km(coords[i-1][1], coords[i-1][0], coords[i][1], coords[i][0])
        for i in range(1, len(coords))
    )
    eta_min = (total_km / args.speed) * 60

    print(f"\nRoute    : {total_km:.1f} km")
    print(f"Speed    : {args.speed} km/h  →  ~{eta_min:.0f} min")
    print(f"Interval : every {args.interval}s")
    print(f"IMEI     : {args.imei}")
    print(f"\nStarting — open the fleet map to watch the bus move.")
    print("Press Ctrl+C to stop.\n")

    tick = 0
    try:
        for lat, lon, total in walk_route(coords, args.speed, args.interval):
            pct = min(100.0, tick * args.interval * args.speed / 3600 / total * 100)
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            try:
                post_location(args.api_url, token, args.imei, lat, lon, args.speed)
                print(f"  [{bar}] {pct:5.1f}%  {lat:.5f}, {lon:.5f}")
            except requests.HTTPError as e:
                print(f"  ERROR {e.response.status_code}: {e.response.text}")
            except requests.RequestException as e:
                print(f"  ERROR: {e}")
            tick += 1
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nStopped.")
        return

    print("\nBus reached destination.")


if __name__ == "__main__":
    main()
