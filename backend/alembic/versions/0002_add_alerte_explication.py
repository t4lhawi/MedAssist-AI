"""add explication columns to alertes

Revision ID: 0002_add_alerte_explication
Revises: 0001_initial_post_refactor
Create Date: 2026-07-18

Adds two nullable columns to the ``alertes`` table to store the IA-generated
explanation for each alert:

* ``explication`` (TEXT) — markdown text produced by the RAG/LLM pipeline
* ``explication_cree_le`` (TIMESTAMP WITH TIMEZONE) — when it was generated

Both columns are nullable: alerts created before this migration have no
explanation, and alerts whose LLM call fails keep ``explication=NULL`` (the
front-end then shows an "indisponible" placeholder).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "0002_add_alerte_explication"
down_revision = "0001_initial_post_refactor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "alertes",
        sa.Column("explication", sa.Text(), nullable=True),
    )
    op.add_column(
        "alertes",
        sa.Column("explication_cree_le", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("alertes", "explication_cree_le")
    op.drop_column("alertes", "explication")
