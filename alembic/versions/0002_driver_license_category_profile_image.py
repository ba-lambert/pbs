"""add driver license category and profile image url

Revision ID: 0002_driver_profile
Revises: 0001_initial_schema
Create Date: 2026-05-19 00:00:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0002_driver_profile"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("drivers", sa.Column("license_category", sa.String(length=20), nullable=True))
    op.add_column("drivers", sa.Column("profile_image_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("drivers", "profile_image_url")
    op.drop_column("drivers", "license_category")
