"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-18 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
                CREATE TYPE role_enum AS ENUM ('super_admin', 'company_admin', 'company_operator', 'driver', 'passenger');
            END IF;
        END $$;
        """
    )
    role_enum = postgresql.ENUM(
        "super_admin",
        "company_admin",
        "company_operator",
        "driver",
        "passenger",
        name="role_enum",
        create_type=False,
    )

    op.create_table(
        "provinces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
    )
    op.create_table(
        "districts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("province_id", sa.Integer(), sa.ForeignKey("provinces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
    )
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=140), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_table(
        "company_districts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("company_id", "district_id", name="uq_company_district"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_table(
        "buses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plate_number", sa.String(length=32), nullable=False, unique=True),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("gps_imei", sa.String(length=100), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_table(
        "drivers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("license_number", sa.String(length=80), nullable=False, unique=True),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_table(
        "bus_districts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bus_id", sa.Integer(), sa.ForeignKey("buses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("bus_id", "district_id", name="uq_bus_district"),
    )
    op.create_table(
        "bus_parks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=140), nullable=False),
        sa.Column("geometry", Geometry(geometry_type="POLYGON", srid=4326), nullable=False),
    )
    op.create_table(
        "stops",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=140), nullable=False),
        sa.Column("geometry", Geometry(geometry_type="POLYGON", srid=4326), nullable=False),
    )
    op.create_table(
        "routes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("geometry", Geometry(geometry_type="LINESTRING", srid=4326), nullable=False),
    )
    op.create_table(
        "route_stops",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("route_id", sa.Integer(), sa.ForeignKey("routes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stop_id", sa.Integer(), sa.ForeignKey("stops.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.UniqueConstraint("route_id", "stop_id", name="uq_route_stop"),
    )
    op.create_table(
        "route_parks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("route_id", sa.Integer(), sa.ForeignKey("routes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("park_id", sa.Integer(), sa.ForeignKey("bus_parks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.UniqueConstraint("route_id", "park_id", name="uq_route_park"),
    )
    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("route_id", sa.Integer(), sa.ForeignKey("routes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bus_id", sa.Integer(), sa.ForeignKey("buses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("departure_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="scheduled"),
    )
    op.create_table(
        "fare_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("base_rwf_per_km", sa.Float(), nullable=False, server_default="50"),
        sa.Column("updated_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("passenger_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("origin_stop_id", sa.Integer(), sa.ForeignKey("stops.id", ondelete="SET NULL"), nullable=True),
        sa.Column("origin_park_id", sa.Integer(), sa.ForeignKey("bus_parks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("destination_stop_id", sa.Integer(), sa.ForeignKey("stops.id", ondelete="SET NULL"), nullable=True),
        sa.Column("destination_park_id", sa.Integer(), sa.ForeignKey("bus_parks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("destination_district_id", sa.Integer(), sa.ForeignKey("districts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("distance_km", sa.Float(), nullable=False),
        sa.Column("fare_rwf", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="booked"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_table(
        "bus_locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bus_id", sa.Integer(), sa.ForeignKey("buses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("speed_kmh", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.Text(), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_table("bus_locations")
    op.drop_table("bookings")
    op.drop_table("fare_configs")
    op.drop_table("trips")
    op.drop_table("route_parks")
    op.drop_table("route_stops")
    op.drop_table("routes")
    op.drop_table("stops")
    op.drop_table("bus_parks")
    op.drop_table("bus_districts")
    op.drop_table("drivers")
    op.drop_table("buses")
    op.drop_table("users")
    op.drop_table("company_districts")
    op.drop_table("companies")
    op.drop_table("districts")
    op.drop_table("provinces")
    op.execute("DROP TYPE IF EXISTS role_enum")
