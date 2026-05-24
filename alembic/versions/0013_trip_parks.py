"""trip: add trip_parks table

Revision ID: 0013_trip_parks
Revises: 0012_guest_phone
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = '0013_trip_parks'
down_revision = '0012_guest_phone'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'trip_parks',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('trip_id', sa.Integer, sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('park_id', sa.Integer, sa.ForeignKey('bus_parks.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.UniqueConstraint('trip_id', 'park_id', name='uq_trip_park'),
    )


def downgrade():
    op.drop_table('trip_parks')
