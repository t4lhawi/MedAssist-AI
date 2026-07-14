"""MQTT subscriber for sensor measurements.

ESP32 devices publish JSON payloads to ``<MQTT_TOPIC_PREFIX>/<capteur_id>``
(see ``backend/app/config.py``). This client subscribes with a single-level
wildcard (``+``) and inserts a row in the ``mesures`` table for each message.
Threshold alerting (``crud._verifier_seuil``) runs as a side-effect of the
insert, exactly like the legacy ``POST /api/mesures/`` path.

The paho network loop runs on its own background thread. We deliberately
do **not** use the FastAPI request-scoped ``get_db`` generator here — every
message opens a fresh ``SessionLocal()`` and closes it in ``finally``.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import paho.mqtt.client as mqtt

from . import crud, schemas
from .config import settings
from .database import SessionLocal

logger = logging.getLogger(__name__)


class MqttIngestClient:
    """Thin wrapper around :class:`paho.mqtt.client.Client`.

    Lifecycle::

        client = MqttIngestClient()
        client.start()        # non-blocking; loop runs on a background thread
        ...
        client.stop()         # called from FastAPI lifespan shutdown
    """

    def __init__(self) -> None:
        # paho 2.x: callbacks API v2 — pass CallbackAPIVersion.VERSION2 explicitly
        self._client = mqtt.Client(
            client_id=settings.MQTT_CLIENT_ID,
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )

        if settings.MQTT_USERNAME:
            self._client.username_pw_set(
                settings.MQTT_USERNAME,
                settings.MQTT_PASSWORD or None,
            )

        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

    # ── public API ───────────────────────────────────────────────
    def start(self) -> None:
        """Connect asynchronously and start the network loop on a thread."""
        try:
            self._client.connect_async(
                host=settings.MQTT_HOST,
                port=settings.MQTT_PORT,
                keepalive=settings.MQTT_KEEPALIVE,
            )
        except OSError as exc:
            # DNS / unreachable broker — don't crash the FastAPI process;
            # paho will keep retrying via its internal reconnect timer.
            logger.warning("MQTT connect_async échoué: %s", exc)
        self._client.loop_start()
        logger.info(
            "MQTT client démarré (broker=%s:%d, abonnement=%s/+)",
            settings.MQTT_HOST,
            settings.MQTT_PORT,
            settings.MQTT_TOPIC_PREFIX,
        )

    def stop(self) -> None:
        """Stop the network loop and disconnect cleanly."""
        try:
            self._client.loop_stop()
            self._client.disconnect()
        except Exception as exc:  # pragma: no cover - shutdown best-effort
            logger.warning("MQTT stop: %s", exc)

    # ── paho callbacks ───────────────────────────────────────────
    def _on_connect(self, client, userdata, flags, reason_code, properties=None):
        if reason_code != 0:
            logger.warning("MQTT connexion refusée (reason_code=%s)", reason_code)
            return
        topic = f"{settings.MQTT_TOPIC_PREFIX}/+"
        client.subscribe(topic, qos=0)
        logger.info("MQTT connecté, abonnement à %s", topic)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties=None):
        if reason_code != 0:
            # reason_code != 0 means unexpected drop (network blip, broker
            # restart). Paho will retry automatically.
            logger.warning("MQTT déconnecté (reason_code=%s) — reconnexion…", reason_code)

    def _on_message(self, client, userdata, msg):
        topic = msg.topic or ""
        try:
            capteur_id = _parse_capteur_id(topic)
        except ValueError as exc:
            logger.warning("MQTT topic ignoré (%s): %s", topic, exc)
            return

        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("payload n'est pas un objet JSON")
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
            logger.warning("MQTT payload invalide sur %s: %s", topic, exc)
            return

        valeur = payload.get("valeur")
        if valeur is None:
            logger.warning("MQTT payload sans 'valeur' sur %s", topic)
            return
        try:
            valeur_f = float(valeur)
        except (TypeError, ValueError):
            logger.warning("MQTT 'valeur' non numérique sur %s: %r", topic, valeur)
            return

        unite_raw = payload.get("unite")
        unite = str(unite_raw) if unite_raw is not None else None

        # Per-message session — never use the request-scoped get_db here.
        db = SessionLocal()
        try:
            data = schemas.MesureCreate(
                capteur_id=capteur_id,
                valeur=valeur_f,
                unite=unite,
            )
            crud.create_mesure(db, data)
            logger.info(
                "MQTT mesure insérée capteur=%d valeur=%s unite=%s",
                capteur_id, valeur_f, unite,
            )
        except Exception:
            # Log and swallow — never let a bad message kill the paho loop.
            logger.exception("MQTT insert mesure échoué (topic=%s)", topic)
        finally:
            db.close()


def _parse_capteur_id(topic: str) -> int:
    """Extract the capteur_id from ``medassist/mesures/<id>``.

    Raises ``ValueError`` if the topic doesn't end with an integer segment.
    """
    prefix = settings.MQTT_TOPIC_PREFIX.rstrip("/")
    if not topic.startswith(prefix + "/"):
        raise ValueError(f"topic hors préfixe '{prefix}/'")
    tail = topic[len(prefix) + 1:]
    # Ignore any trailing sub-paths (defensive: we only subscribe to "+").
    tail = tail.split("/", 1)[0]
    return int(tail)
