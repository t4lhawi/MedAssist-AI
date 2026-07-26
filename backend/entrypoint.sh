#!/bin/sh
# ════════════════════════════════════════════════════════════
#  MedAssist AI – Entrypoint backend
#  Attend Postgres, applique les migrations Alembic, seed l'admin,
#  puis démarre Uvicorn.
# ════════════════════════════════════════════════════════════
set -e

# Petit utilitaire : imprime un libellé.
log() { echo "[entrypoint] $*"; }

# 1) Attendre que Postgres soit joignable.
log "Attente de Postgres (${POSTGRES_HOST:-postgres}:${POSTGRES_PORT:-5432})..."
python - <<'PY'
import os, time, socket, sys
host = os.environ.get("POSTGRES_HOST", "postgres")
port = int(os.environ.get("POSTGRES_PORT", "5432"))
deadline = time.time() + 60
while time.time() < deadline:
    try:
        with socket.create_connection((host, port), timeout=2):
            print("[entrypoint] Postgres joignable.")
            sys.exit(0)
    except OSError:
        time.sleep(2)
print("[entrypoint] Postgres indisponible après 60s.", file=sys.stderr)
sys.exit(1)
PY

# 2) Migrations Alembic (idempotent — Alembic stamp si déjà à jour).
log "Application des migrations Alembic..."
alembic upgrade head || {
  log "Échec Alembic upgrade — fallback sur create_all."
  python -c "from app.database import engine, Base; from app import models; Base.metadata.create_all(bind=engine)"
}

# 3) Seed users (idempotent : sort tôt si les comptes existent déjà).
log "Création des utilisateurs de départ (si absents)..."
python seed_roles.py

# 4) Démarrage de l'API.
log "Démarrage d'Uvicorn sur 0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
