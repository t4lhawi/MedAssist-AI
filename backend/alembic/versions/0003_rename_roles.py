"""Rename user roles to the new canonical RBAC vocabulary.

Revision ID: 0003_rename_roles
Revises: 0002_add_alerte_explication
Create Date: 2026-07-25

This migration aligns the ``utilisateurs.role`` column with the new
RBAC system:

    admin             -> admin              (no change)
    Admin             -> admin              (case-normalized)
    technicien        -> hospital_staff
    Technicien        -> hospital_staff
    soignant          -> hospital_staff
    Soignant          -> hospital_staff
    patient           -> visitor
    Patient           -> visitor
    visiteur          -> visitor
    Visiteur          -> visitor
    visitor           -> visitor            (already canonical)
    anything else     -> visitor            (safe fallback)

It is idempotent — re-running it is a no-op because the WHERE clauses
filter on the *old* values. The ``default`` of the column is also
updated to ``visitor`` so any future ``INSERT`` without an explicit
role lands on the most restrictive role.

The migration preserves all existing users: we never delete rows, we
only ``UPDATE`` the ``role`` column in place.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "0003_rename_roles"
down_revision = "0002_add_alerte_explication"
branch_labels = None
depends_on = None


# Source -> target mapping for UPDATE statements.
ROLE_MAP: dict[str, str] = {
    "admin": "admin",
    "Admin": "admin",
    "ADMIN": "admin",
    "technicien": "hospital_staff",
    "Technicien": "hospital_staff",
    "TECHNICIEN": "hospital_staff",
    "soignant": "hospital_staff",
    "Soignant": "hospital_staff",
    "SOIGNANT": "hospital_staff",
    "patient": "visitor",
    "Patient": "visitor",
    "PATIENT": "visitor",
    "visiteur": "visitor",
    "Visiteur": "visitor",
    "VISITEUR": "visitor",
    "visitor": "visitor",
    "Visitor": "visitor",
    "VISITOR": "visitor",
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "utilisateurs" not in inspector.get_table_names():
        # Fresh DB without the prior migrations — the column will be
        # created by the bootstrap ``Base.metadata.create_all`` call
        # in ``app.main`` with the new default; nothing to do.
        return

    # 1) Translate every legacy value to the new canonical form.
    #    We do this with a single CASE statement so the table is only
    #    scanned once, regardless of how many distinct legacy values
    #    happen to be present.
    whens = " ".join(
        f"WHEN role = :old_{i} THEN :new_{i}"
        for i, _ in enumerate(ROLE_MAP)
    )
    params = {}
    case_parts = []
    for i, (old, new) in enumerate(ROLE_MAP.items()):
        params[f"old_{i}"] = old
        params[f"new_{i}"] = new
        case_parts.append(f"WHEN role = :old_{i} THEN :new_{i}")
    # Anything we don't explicitly know about (NULL, garbage, …) is
    # clamped to ``visitor`` — the safest possible default.
    sql = sa.text(
        "UPDATE utilisateurs "
        f"SET role = CASE {' '.join(case_parts)} ELSE 'visitor' END "
        "WHERE role IS NOT NULL "
        "  AND role NOT IN ('admin', 'hospital_staff', 'visitor')"
    )
    bind.execute(sql, params)

    # 2) Also fix any NULL roles to the default.
    bind.execute(
        sa.text("UPDATE utilisateurs SET role = 'visitor' WHERE role IS NULL")
    )

    # 3) Update the column default so future INSERTs without an
    #    explicit role land on the most restrictive role.
    #    ``server_default`` is the safe one to change at the DB level;
    #    the SQLAlchemy ORM default is set in app/models.py and is
    #    read at class-definition time.
    op.alter_column(
        "utilisateurs",
        "role",
        existing_type=sa.String(length=30),
        server_default="visitor",
    )


def downgrade() -> None:
    bind = op.get_bind()
    # Best-effort downgrade: collapse the new vocabulary back onto the
    # most likely legacy equivalent. There is no perfect inverse
    # (visitor / patient / visiteur all collapse to ``soignant``),
    # but that's only relevant for someone who explicitly rolled back
    # the migration.
    sql = sa.text(
        "UPDATE utilisateurs SET role = "
        "  CASE role "
        "    WHEN 'admin' THEN 'admin' "
        "    WHEN 'hospital_staff' THEN 'soignant' "
        "    WHEN 'visitor' THEN 'soignant' "
        "    ELSE 'soignant' "
        "  END"
    )
    bind.execute(sql)
    op.alter_column(
        "utilisateurs",
        "role",
        existing_type=sa.String(length=30),
        server_default="soignant",
    )
