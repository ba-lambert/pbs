"""add trip arrival and duration

Revision ID: 0005_trip_timing_fields
Revises: 0004_fleet_model_place
Create Date: 2026-05-19 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_trip_timing_fields"
down_revision = "0004_fleet_model_place"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trips", sa.Column("arrival_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("trips", sa.Column("duration_minutes", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("trips", "duration_minutes")
    op.drop_column("trips", "arrival_at")
