"""add driver full_name gender bus_id

Revision ID: 0006_driver_name_gender_bus
Revises: 0005_trip_timing_fields
Create Date: 2026-05-20 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_driver_name_gender_bus"
down_revision = "0005_trip_timing_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("drivers", sa.Column("full_name", sa.String(length=200), nullable=False, server_default=""))
    op.add_column("drivers", sa.Column("gender", sa.String(length=20), nullable=True))
    op.add_column("drivers", sa.Column("bus_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_drivers_bus_id_buses",
        "drivers",
        "buses",
        ["bus_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_drivers_bus_id", "drivers", ["bus_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_drivers_bus_id", table_name="drivers")
    op.drop_constraint("fk_drivers_bus_id_buses", "drivers", type_="foreignkey")
    op.drop_column("drivers", "bus_id")
    op.drop_column("drivers", "gender")
    op.drop_column("drivers", "full_name")
