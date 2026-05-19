"""add bus model and driver district

Revision ID: 0004_fleet_model_place
Revises: 0003_company_province
Create Date: 2026-05-19 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_fleet_model_place"
down_revision = "0003_company_province"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("buses", sa.Column("model", sa.String(length=120), nullable=False, server_default="Unknown"))
    op.add_column("drivers", sa.Column("district_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_drivers_district_id_districts",
        "drivers",
        "districts",
        ["district_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_drivers_district_id", "drivers", ["district_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_drivers_district_id", table_name="drivers")
    op.drop_constraint("fk_drivers_district_id_districts", "drivers", type_="foreignkey")
    op.drop_column("drivers", "district_id")
    op.drop_column("buses", "model")
