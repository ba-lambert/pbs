"""add email to drivers and unique constraints on phone and email

Revision ID: 0008_driver_email_phone_unique
Revises: 0007_user_auth_booking_payment
Create Date: 2026-05-24 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_driver_email_phone_unique"
down_revision = "0007_user_auth_booking_payment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("drivers", sa.Column("email", sa.String(255), nullable=True))
    op.create_unique_constraint("uq_driver_email", "drivers", ["email"])
    op.create_unique_constraint("uq_driver_phone", "drivers", ["phone"])


def downgrade() -> None:
    op.drop_constraint("uq_driver_phone", "drivers", type_="unique")
    op.drop_constraint("uq_driver_email", "drivers", type_="unique")
    op.drop_column("drivers", "email")
