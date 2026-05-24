# Tiered fare: longer trips pay less per km (Rwanda bus pricing model)
# Multiplier is applied to (distance × base_rwf_per_km)
_TIERS: list[tuple[float, float]] = [
    (2.0,  1.00),   # 0–2 km:   full price
    (5.0,  0.75),   # 2–5 km:   ×0.75
    (10.0, 0.60),   # 5–10 km:  ×0.60
    (15.0, 0.40),   # 10–15 km: ×0.40
    (float("inf"), 0.25),  # 15 km+:  ×0.25
]


MIN_FARE_RWF = 2500.0  # no booking cheaper than this


def calculate_fare(distance_km: float, base_rwf_per_km: float) -> float:
    d = max(distance_km, 0)
    for threshold, multiplier in _TIERS:
        if d <= threshold:
            return max(MIN_FARE_RWF, round(d * base_rwf_per_km * multiplier, 2))
    return max(MIN_FARE_RWF, round(d * base_rwf_per_km * 0.25, 2))


# kept for backward compat
def calculate_linear_fare(distance_km: float, base_rwf_per_km: float) -> float:
    return calculate_fare(distance_km, base_rwf_per_km)
