"""add user auth flags and booking payment fields

Revision ID: 0007_user_auth_booking_payment
Revises: 0006_driver_name_gender_bus
Create Date: 2026-05-21 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0007_user_auth_booking_payment"
down_revision = "0006_driver_name_gender_bus"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("password_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("profile_image_url", sa.String(length=500), nullable=True))
    op.add_column("bookings", sa.Column("payment_intent_id", sa.String(length=255), nullable=True))
    op.add_column("bookings", sa.Column("payment_status", sa.String(length=40), nullable=False, server_default="pending"))
    op.create_index("ix_bookings_payment_intent_id", "bookings", ["payment_intent_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_bookings_payment_intent_id", table_name="bookings")
    op.drop_column("bookings", "payment_status")
    op.drop_column("bookings", "payment_intent_id")
    op.drop_column("users", "profile_image_url")
    op.drop_column("users", "password_expires_at")
    op.drop_column("users", "must_change_password")
