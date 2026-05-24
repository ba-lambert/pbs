"""add passenger_email and seat_number to bookings

Revision ID: 0009_booking_email_seat
Revises: 0008_driver_email_phone_unique
Create Date: 2026-05-24 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_booking_email_seat"
down_revision = "0008_driver_email_phone_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("passenger_email", sa.String(255), nullable=True))
    op.add_column("bookings", sa.Column("seat_number", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "seat_number")
    op.drop_column("bookings", "passenger_email")
