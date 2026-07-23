import os
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from .mqtt_client import MqttIngestClient
from .routers import auth, capteurs, mesures, alertes, documents, chat
from .routers import admin_esp32, realtime
from . import models
from . import crud
from . import realtime as realtime_mod

logger = logging.getLogger(__name__)


# ── Background sweeper : purge les alertes > 24h ──────────────────
# ``get_alertes`` filtre déjà les entrées trop vieilles côté lecture,
# mais on supprime physiquement les lignes pour éviter que la table
# grossisse sans borne. Le sweeper tourne sur sa propre tâche asyncio
# avec un sleep long (1h) pour ne rien coûter.
_SWEEPER_INTERVAL_SECONDS: int = 3600


async def _alertes_sweeper() -> None:
    while True:
        try:
            await asyncio.sleep(_SWEEPER_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            return
        try:
            # Session jetable — l'opération est un DELETE unique, pas
            # besoin d'un generator ``get_db``.
            db = SessionLocal()
            try:
                deleted = crud.purge_old_alertes(db)
                if deleted:
                    logger.info("Sweeper: %d alerte(s) > 24h supprimée(s)", deleted)
            finally:
                db.close()
        except Exception:
            logger.exception("Sweeper: échec du cycle de purge alertes")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crée les tables au démarrage (idempotent). The Alembic migration is
    # the source of truth for the schema; this is a safety net so a fresh
    # DB without ``alembic upgrade head`` still boots.
    Base.metadata.create_all(bind=engine)

    # Capture the running event loop BEFORE starting the MQTT thread,
    # so the ingester can safely ``call_soon_threadsafe`` into our
    # WebSocket subscribers' queues.
    realtime_mod.set_event_loop(asyncio.get_running_loop())

    # Démarre le subscriber MQTT sur un thread en arrière-plan.
    mqtt_client = MqttIngestClient()
    mqtt_client.start()
    app.state.mqtt = mqtt_client

    # Démarre le sweeper d'alertes sur la boucle asyncio (pas un thread
    # séparé, on n'a pas besoin d'I/O bloquant).
    sweeper_task = asyncio.create_task(_alertes_sweeper())
    try:
        yield
    finally:
        sweeper_task.cancel()
        mqtt_client.stop()


app = FastAPI(
    title="MedAssist AI",
    description="Plateforme intelligente de surveillance hospitalière basée sur l'IA",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – autoriser le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure tous les routers
app.include_router(auth.router)
app.include_router(capteurs.router)        # legacy — points to esp32_devices
app.include_router(mesures.router)
app.include_router(alertes.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(admin_esp32.router)     # admin-only ESP32 management
app.include_router(realtime.router)        # WebSocket live stream

@app.get("/")
def root():
    return {"message": "MedAssist AI est opérationnel", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
