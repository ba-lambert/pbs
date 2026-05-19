"""add company province reference

Revision ID: 0003_company_province
Revises: 0002_driver_profile
Create Date: 2026-05-19 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_company_province"
down_revision = "0002_driver_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("province_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_companies_province_id_provinces",
        "companies",
        "provinces",
        ["province_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_companies_province_id", "companies", ["province_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_companies_province_id", table_name="companies")
    op.drop_constraint("fk_companies_province_id_provinces", "companies", type_="foreignkey")
    op.drop_column("companies", "province_id")
