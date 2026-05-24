"""booking: add guest_phone

Revision ID: 0012_guest_phone
Revises: 0011_booking_fractions
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = '0012_guest_phone'
down_revision = '0011_booking_fractions'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('bookings', sa.Column('guest_phone', sa.String(40), nullable=True))


def downgrade():
    op.drop_column('bookings', 'guest_phone')
