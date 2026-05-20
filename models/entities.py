import enum
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class Role(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    COMPANY_ADMIN = "company_admin"
    COMPANY_OPERATOR = "company_operator"
    DRIVER = "driver"
    PASSENGER = "passenger"


class Province(Base):
    __tablename__ = "provinces"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    districts: Mapped[list["District"]] = relationship(back_populates="province")


class District(Base):
    __tablename__ = "districts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    province_id: Mapped[int] = mapped_column(ForeignKey("provinces.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    province: Mapped["Province"] = relationship(back_populates="districts")


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(140), unique=True, index=True)
    province_id: Mapped[int | None] = mapped_column(ForeignKey("provinces.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CompanyDistrict(Base):
    __tablename__ = "company_districts"
    __table_args__ = (UniqueConstraint("company_id", "district_id", name="uq_company_district"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id", ondelete="CASCADE"), index=True)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="role_enum", values_callable=lambda enum_cls: [item.value for item in enum_cls]),
        index=True,
    )
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Bus(Base):
    __tablename__ = "buses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    plate_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    model: Mapped[str] = mapped_column(String(120), default="Unknown")
    capacity: Mapped[int] = mapped_column(Integer)
    gps_imei: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Driver(Base):
    __tablename__ = "drivers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    district_id: Mapped[int | None] = mapped_column(ForeignKey("districts.id", ondelete="SET NULL"), nullable=True, index=True)
    bus_id: Mapped[int | None] = mapped_column(ForeignKey("buses.id", ondelete="SET NULL"), nullable=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    license_number: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    license_category: Mapped[str | None] = mapped_column(String(20), nullable=True)
    phone: Mapped[str] = mapped_column(String(32))
    profile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class BusDistrict(Base):
    __tablename__ = "bus_districts"
    __table_args__ = (UniqueConstraint("bus_id", "district_id", name="uq_bus_district"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bus_id: Mapped[int] = mapped_column(ForeignKey("buses.id", ondelete="CASCADE"), index=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id", ondelete="CASCADE"), index=True)


class BusPark(Base):
    __tablename__ = "bus_parks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(140), index=True)
    geometry: Mapped[str] = mapped_column(Geometry(geometry_type="POLYGON", srid=4326))


class Stop(Base):
    __tablename__ = "stops"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(140), index=True)
    geometry: Mapped[str] = mapped_column(Geometry(geometry_type="POLYGON", srid=4326))


class Route(Base):
    __tablename__ = "routes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    geometry: Mapped[str] = mapped_column(Geometry(geometry_type="LINESTRING", srid=4326))


class RouteStop(Base):
    __tablename__ = "route_stops"
    __table_args__ = (UniqueConstraint("route_id", "stop_id", name="uq_route_stop"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id", ondelete="CASCADE"), index=True)
    stop_id: Mapped[int] = mapped_column(ForeignKey("stops.id", ondelete="CASCADE"), index=True)
    order_index: Mapped[int] = mapped_column(Integer)


class RoutePark(Base):
    __tablename__ = "route_parks"
    __table_args__ = (UniqueConstraint("route_id", "park_id", name="uq_route_park"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id", ondelete="CASCADE"), index=True)
    park_id: Mapped[int] = mapped_column(ForeignKey("bus_parks.id", ondelete="CASCADE"), index=True)
    order_index: Mapped[int] = mapped_column(Integer)


class Trip(Base):
    __tablename__ = "trips"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id", ondelete="CASCADE"), index=True)
    bus_id: Mapped[int] = mapped_column(ForeignKey("buses.id", ondelete="CASCADE"), index=True)
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"), index=True)
    departure_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    arrival_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="scheduled")


class FareConfig(Base):
    __tablename__ = "fare_configs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    base_rwf_per_km: Mapped[float] = mapped_column(Float, default=50.0)
    updated_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    passenger_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    origin_stop_id: Mapped[int | None] = mapped_column(ForeignKey("stops.id", ondelete="SET NULL"), nullable=True)
    origin_park_id: Mapped[int | None] = mapped_column(ForeignKey("bus_parks.id", ondelete="SET NULL"), nullable=True)
    destination_stop_id: Mapped[int | None] = mapped_column(ForeignKey("stops.id", ondelete="SET NULL"), nullable=True)
    destination_park_id: Mapped[int | None] = mapped_column(ForeignKey("bus_parks.id", ondelete="SET NULL"), nullable=True)
    destination_district_id: Mapped[int | None] = mapped_column(ForeignKey("districts.id", ondelete="SET NULL"), nullable=True)
    distance_km: Mapped[float] = mapped_column(Float)
    fare_rwf: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(40), default="booked")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BusLocation(Base):
    __tablename__ = "bus_locations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bus_id: Mapped[int] = mapped_column(ForeignKey("buses.id", ondelete="CASCADE"), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    speed_kmh: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(Text, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
