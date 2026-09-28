"""agregar avatar_url a users

Revision ID: b4f8c2a1d9e3
Revises: 7a10e39dcd7c
Create Date: 2026-10-01 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b4f8c2a1d9e3"
down_revision: Union[str, None] = "7a10e39dcd7c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
