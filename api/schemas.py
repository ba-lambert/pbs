from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from models.entities import Role


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str | None = None
    must_change_password: bool = False
    user_id: int | None = None
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)
    role: Role
    company_id: int | None = None


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class PaymentIntentCreate(BaseModel):
    trip_id: int
    origin_type: str
    origin_id: int
    destination_type: str
    destination_id: int


class CompanyCreate(BaseModel):
    name: str
    province_id: int


class CompanyDistrictAssign(BaseModel):
    district_ids: list[int]


class DistrictRead(BaseModel):
    id: int
    name: str
    province_id: int

    model_config = {"from_attributes": True}


class ProvinceRead(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class GeometryEntityCreate(BaseModel):
    name: str
    district_id: int
    geometry_wkt: str


class GeometryEntityUpdate(BaseModel):
    name: str
    district_id: int
    geometry_wkt: str


class GeometryEntityRead(BaseModel):
    id: int
    name: str
    district_id: int
    geometry_wkt: str


class RouteCreate(BaseModel):
    name: str
    company_id: int
    geometry_wkt: str
    stop_ids: list[int] = []
    park_ids: list[int] = []


class RouteRead(BaseModel):
    id: int
    name: str
    company_id: int
    geometry_wkt: str


class BusCreate(BaseModel):
    company_id: int
    plate_number: str
    model: str
    capacity: int
    gps_imei: str


class DriverCreate(BaseModel):
    company_id: int
    email: str | None = None
    full_name: str
    gender: str | None = None
    bus_id: int | None = None
    district_id: int | None = None
    license_number: str
    license_category: str | None = None
    phone: str
    profile_image_url: str | None = None


class BusDistrictAssign(BaseModel):
    district_ids: list[int]


class TripCreate(BaseModel):
    company_id: int
    route_id: int
    bus_id: int
    driver_id: int
    departure_at: datetime
    arrival_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0)
    park_ids: list[int] = []


class BookingCreate(BaseModel):
    trip_id: int
    origin_stop_id: int | None = None
    origin_park_id: int | None = None
    destination_stop_id: int | None = None
    destination_park_id: int | None = None
    destination_district_id: int | None = None
    payment_intent_id: str | None = None
    passenger_email: str | None = None
    guest_name: str | None = None
    guest_phone: str | None = None


class FareConfigUpdate(BaseModel):
    base_rwf_per_km: float = Field(gt=0)


class GpsIngestRequest(BaseModel):
    imei: str
    latitude: float
    longitude: float
    speed_kmh: float | None = None
    recorded_at: datetime


class PlannerRequest(BaseModel):
    origin_type: str
    origin_id: int
    destination_type: str
    destination_id: int


class SimulateRequest(BaseModel):
    imei: str = Field(..., description="GPS IMEI of the bus to simulate")
    origin_lat: float = Field(..., description="Boarding point latitude")
    origin_lon: float = Field(..., description="Boarding point longitude")
    dest_lat: float = Field(..., description="Destination latitude")
    dest_lon: float = Field(..., description="Destination longitude")
    speed_kmh: float = Field(60.0, description="Simulated speed in km/h")
    interval_s: float = Field(5.0, description="Seconds between GPS pings")
