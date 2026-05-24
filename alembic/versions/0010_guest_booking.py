"""guest booking: nullable passenger_id, add guest_name

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = '0010_guest_booking'
down_revision = '0009_booking_email_seat'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('bookings', 'passenger_id', nullable=True)
    op.add_column('bookings', sa.Column('guest_name', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('bookings', 'guest_name')
    op.alter_column('bookings', 'passenger_id', nullable=False)
