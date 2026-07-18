"""salle topic refactor: introduce esp32_devices + topic_salle, backfill legacy capteurs.

Revision ID: 0001_initial_post_refactor
Revises:
Create Date: 2026-07-15

This is the first Alembic migration for the MedAssist backend. It brings
the schema in line with the new "salle as source of truth" model:

* Creates ``esp32_devices`` (ip UNIQUE, salle, note, actif, derniere_mesure_le)
* Adds ``mesures.topic_salle`` (salle segment from the MQTT topic) + index
* Makes ``mesures.esp32_id`` nullable (was NOT NULL on legacy FK to capteurs)
* Adds ``alertes.esp32_id`` (nullable) and ``alertes.type``
* Backfills the legacy ``capteurs`` table: one ``esp32_devices`` row per
  old ``capteur`` with ``ip='legacy-<id>'`` and ``note='migrated:<type>'``,
  then re-points ``mesures.esp32_id`` at the new device.
* Drops the legacy ``capteurs`` table and ``mesures.capteur_id`` column.

All steps are idempotent — re-running on a partially-migrated DB is a
no-op for the structural parts and ``ON CONFLICT DO NOTHING`` for the
backfill.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "0001_initial_post_refactor"
down_revision = None
branch_labels = None
depends_on = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _index_exists(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in {c["name"] for c in inspector.get_columns(table_name)}


def upgrade() -> None:
    # 1. Create esp32_devices (idempotent — skip if present).
    if not _table_exists("esp32_devices"):
        op.create_table(
            "esp32_devices",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("ip", sa.String(length=45), nullable=False, unique=True, index=True),
            sa.Column("salle", sa.String(length=100), nullable=False, index=True),
            sa.Column("note", sa.String(length=200), nullable=True),
            sa.Column("actif", sa.Boolean(), nullable=True, server_default=sa.true()),
            sa.Column("cree_le", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("derniere_mesure_le", sa.DateTime(timezone=True), nullable=True),
        )

    # 2. Add mesures.topic_salle + index.
    if _table_exists("mesures") and not _column_exists("mesures", "topic_salle"):
        op.add_column("mesures", sa.Column("topic_salle", sa.String(length=100), nullable=True))
    if _table_exists("mesures") and not _index_exists("mesures", "ix_mesures_topic_salle"):
        op.create_index("ix_mesures_topic_salle", "mesures", ["topic_salle"])

    # 3. mesures.esp32_id → nullable.
    if _table_exists("mesures") and _column_exists("mesures", "esp32_id"):
        # Was NOT NULL on legacy schema. ``alter_column`` with ``nullable=True``
        # is a no-op if the column is already nullable.
        op.alter_column("mesures", "esp32_id", existing_type=sa.Integer(), nullable=True)

    # 4. mesures.type — required by the post-refactor pipeline.
    if _table_exists("mesures") and not _column_exists("mesures", "type"):
        op.add_column(
            "mesures",
            sa.Column("type", sa.String(length=30), nullable=True),
        )
        # Backfill type from the joined capteur.type for legacy rows so
        # threshold checks have something to act on after the migration.
        if _table_exists("capteurs") and _column_exists("mesures", "capteur_id"):
            op.execute(
                "UPDATE mesures AS m "
                "SET type = c.type "
                "FROM capteurs AS c "
                "WHERE m.capteur_id = c.id AND m.type IS NULL"
            )
        # Now enforce NOT NULL.
        op.alter_column("mesures", "type", existing_type=sa.String(length=30), nullable=False)
    if _table_exists("mesures") and not _index_exists("mesures", "ix_mesures_type"):
        op.create_index("ix_mesures_type", "mesures", ["type"])
    if _table_exists("mesures") and not _index_exists("mesures", "ix_mesures_esp32_type_ts"):
        op.create_index("ix_mesures_esp32_type_ts", "mesures", ["esp32_id", "type", "timestamp"])

    # 5. alertes.esp32_id + alertes.type (idempotent).
    if _table_exists("alertes") and not _column_exists("alertes", "esp32_id"):
        op.add_column("alertes", sa.Column("esp32_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_alertes_esp32_devices", "alertes", "esp32_devices",
            ["esp32_id"], ["id"],
        )
    if _table_exists("alertes") and not _index_exists("alertes", "ix_alertes_esp32_id"):
        op.create_index("ix_alertes_esp32_id", "alertes", ["esp32_id"])
    if _table_exists("alertes") and not _column_exists("alertes", "type"):
        op.add_column("alertes", sa.Column("type", sa.String(length=30), nullable=True))

    # 6. Backfill legacy ``capteurs`` rows into ``esp32_devices`` as
    #    ``legacy-<id>``. The ``note`` is a sentinel we use to find the
    #    matching device when re-pointing mesures in the next step.
    if _table_exists("capteurs"):
        # SELECT every old capteur that hasn't been migrated yet.
        rows = op.get_bind().execute(
            sa.text(
                "SELECT id, nom, type, emplacement, actif, cree_le "
                "FROM capteurs"
            )
        ).fetchall()
        for r in rows:
            ip = f"legacy-{r.id}"
            note = f"migrated:{r.type}"
            salle = r.emplacement or f"salle-{r.id}"
            op.execute(
                sa.text(
                    "INSERT INTO esp32_devices (ip, salle, note, actif, cree_le) "
                    "VALUES (:ip, :salle, :note, :actif, :cree_le) "
                    "ON CONFLICT (ip) DO NOTHING"
                ).bindparams(
                    ip=ip, salle=salle, note=note,
                    actif=r.actif, cree_le=r.cree_le,
                )
            )

    # 7. Re-point legacy mesures.esp32_id at the new legacy-<id> device.
    if _table_exists("mesures") and _column_exists("mesures", "capteur_id"):
        op.execute(
            sa.text(
                "UPDATE mesures AS m "
                "SET esp32_id = d.id "
                "FROM esp32_devices AS d "
                "WHERE d.ip = 'legacy-' || m.capteur_id::text "
                "  AND m.esp32_id IS NULL "
                "  AND m.capteur_id IS NOT NULL"
            )
        )

    # 8. Drop the legacy capteur_id column + capteurs table.
    if _table_exists("mesures") and _column_exists("mesures", "capteur_id"):
        op.drop_column("mesures", "capteur_id")
    # Drop FK from alertes.capteur_id before dropping capteurs.
    if _table_exists("alertes") and _column_exists("alertes", "capteur_id"):
        try:
            op.drop_constraint("alertes_capteur_id_fkey", "alertes", type_="foreignkey")
        except Exception:
            pass  # constraint may not exist in some DB states
        op.drop_column("alertes", "capteur_id")
    if _table_exists("capteurs"):
        op.drop_table("capteurs")


def downgrade() -> None:
    # Reverse what's reversible. Note: the backfill data is lost on
    # downgrade (we don't re-create legacy capteurs rows).
    if _table_exists("mesures") and not _column_exists("mesures", "capteur_id"):
        op.add_column("mesures", sa.Column("capteur_id", sa.Integer(), nullable=True))
    if not _table_exists("capteurs"):
        op.create_table(
            "capteurs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("nom", sa.String(length=120), nullable=False),
            sa.Column("type", sa.String(length=30), nullable=False),
            sa.Column("emplacement", sa.String(length=120)),
            sa.Column("actif", sa.Boolean(), server_default=sa.true()),
            sa.Column("cree_le", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    if _index_exists("mesures", "ix_mesures_esp32_type_ts"):
        op.drop_index("ix_mesures_esp32_type_ts", table_name="mesures")
    if _index_exists("mesures", "ix_mesures_type"):
        op.drop_index("ix_mesures_type", table_name="mesures")
    if _index_exists("mesures", "ix_mesures_topic_salle"):
        op.drop_index("ix_mesures_topic_salle", table_name="mesures")
    if _table_exists("mesures") and _column_exists("mesures", "topic_salle"):
        op.drop_column("mesures", "topic_salle")
    if _table_exists("mesures") and _column_exists("mesures", "type"):
        op.drop_column("mesures", "type")
    if _table_exists("mesures") and _column_exists("mesures", "esp32_id"):
        op.alter_column("mesures", "esp32_id", existing_type=sa.Integer(), nullable=False)

    if _table_exists("alertes") and _column_exists("alertes", "type"):
        op.drop_column("alertes", "type")
    if _table_exists("alertes") and _index_exists("alertes", "ix_alertes_esp32_id"):
        op.drop_index("ix_alertes_esp32_id", table_name="alertes")
    if _table_exists("alertes") and _column_exists("alertes", "esp32_id"):
        op.drop_constraint("fk_alertes_esp32_devices", "alertes", type_="foreignkey")
        op.drop_column("alertes", "esp32_id")

    # Do NOT drop esp32_devices in downgrade — the admin may have created
    # real entries through the UI. They are simply orphaned rows after the
    # downgrade and can be cleaned up manually.
