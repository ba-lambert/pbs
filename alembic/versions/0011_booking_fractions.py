"""booking: add board_fraction and alight_fraction for segment seat tracking

Revision ID: 0011_booking_fractions
Revises: 0010_guest_booking
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = '0011_booking_fractions'
down_revision = '0010_guest_booking'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('bookings', sa.Column('board_fraction',  sa.Float(), nullable=True))
    op.add_column('bookings', sa.Column('alight_fraction', sa.Float(), nullable=True))


def downgrade():
    op.drop_column('bookings', 'alight_fraction')
    op.drop_column('bookings', 'board_fraction')
