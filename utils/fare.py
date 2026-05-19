def calculate_linear_fare(distance_km: float, base_rwf_per_km: float) -> float:
    return round(max(distance_km, 0) * base_rwf_per_km, 2)

