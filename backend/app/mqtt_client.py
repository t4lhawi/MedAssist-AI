"""MQTT subscriber for sensor measurements.

ESP32 devices publish JSON payloads to ``<MQTT_TOPIC_PREFIX>/<salle>/<type>``
(see ``backend/app/config.py``). The default prefix is ``medassist/salle``,
so the topic shape is::

    medassist/salle/<salle>/<type>

This client subscribes with a two-level wildcard (``+/+``) and parses the
salle + type out of the topic — the topic is the source of truth for the
salle. The IP in the JSON payload is used as a sanity check against the
salle's registered devices.

The matching is done against the ``esp32_devices`` table by salle. If the
salle is registered and one of its devices has a matching IP, the mesure
is linked to the device and a threshold check runs (see
``crud._verifier_seuil``). If the salle is unknown or no device in the
salle matches the IP, the mesure is still stored with ``esp32_id=NULL``
and ``source_ip=<ip>`` (plus the topic salle in ``mesures.topic_salle``)
so the admin can see and claim it from the dashboard.

The paho network loop runs on its own background thread. We deliberately
do **not** use the FastAPI request-scoped ``get_db`` generator here — every
message opens a fresh ``SessionLocal()`` and closes it in ``finally``.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Dict, List, Optional

import paho.mqtt.client as mqtt

from . import crud, schemas
from .config import settings
from .database import SessionLocal

logger = logging.getLogger(__name__)


# Rate-limit the "unknown source IP" log: at most 1 warning per IP per minute.
_WARN_COOLDOWN_SECONDS = 60
_last_unreg_warn_at: Dict[str, float] = {}


class MqttIngestClient:
    """Thin wrapper around :class:`paho.mqtt.client.Client`.

    Lifecycle::

        client = MqttIngestClient()
        client.start()        # non-blocking; loop runs on a background thread
        ...
        client.stop()         # called from FastAPI lifespan shutdown
    """

    def __init__(self) -> None:
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

    # ── public API ────────────────────────────────────────────────
    def start(self) -> None:
        """Connect asynchronously and start the network loop on a thread."""
        try:
            self._client.connect_async(
                host=settings.MQTT_HOST,
                port=settings.MQTT_PORT,
                keepalive=settings.MQTT_KEEPALIVE,
            )
        except OSError as exc:
            logger.warning("MQTT connect_async échoué: %s", exc)
        self._client.loop_start()
        logger.info(
            "MQTT client démarré (broker=%s:%d, abonnement=%s/+/+)",
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
        topic = f"{settings.MQTT_TOPIC_PREFIX}/+/+"
        client.subscribe(topic, qos=0)
        logger.info("MQTT connecté, abonnement à %s", topic)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties=None):
        if reason_code != 0:
            logger.warning(
                "MQTT déconnecté (reason_code=%s) — reconnexion…", reason_code,
            )

    # ── message handler ──────────────────────────────────────────
    def _on_message(self, client, userdata, msg):
        topic = msg.topic or ""
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("payload n'est pas un objet JSON")
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
            logger.warning("MQTT payload invalide sur %s: %s", topic, exc)
            return

        # ── Topic parsing — source of truth for salle + type ────
        prefix = settings.MQTT_TOPIC_PREFIX
        if not topic.startswith(prefix + "/"):
            logger.warning("MQTT topic hors-prefixe: %s", topic)
            return
        parts = topic[len(prefix) + 1:].split("/")
        if len(parts) != 2 or not parts[0] or not parts[1]:
            logger.warning("MQTT topic mal forme: %s (attendu: <salle>/<type>)", topic)
            return
        topic_salle, topic_type = parts

        # ── Payload validation ─────────────────────────────────
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
        unite: Optional[str] = str(unite_raw) if unite_raw is not None else None

        type_ = payload.get("type") or topic_type
        if not isinstance(type_, str) or not type_:
            logger.warning(
                "MQTT payload sans 'type' valide sur %s: %r (ignorée)", topic, type_,
            )
            return
        if type_ not in schemas.SENSOR_TYPES:
            logger.warning(
                "MQTT 'type' inconnu sur %s: %r (attendu: %s) — ignorée",
                topic, type_, ", ".join(schemas.SENSOR_TYPES),
            )
            return

        # Topic wins over payload when they disagree — the admin registered
        # the device by salle, and the firmware embeds the salle in the
        # topic prefix.
        if topic_type != type_:
            logger.warning(
                "MQTT topic/payload type mismatch: topic=%s payload=%s (topic wins)",
                topic_type, type_,
            )
            type_ = topic_type

        ip_raw = payload.get("ip")
        if not ip_raw or not isinstance(ip_raw, str):
            logger.warning(
                "MQTT payload sans 'ip' sur %s — l'ESP32 doit publier son IP",
                topic,
            )
            return
        source_ip = ip_raw.strip()

        # ── Per-message session — never use the request-scoped get_db ──
        db = SessionLocal()
        try:
            # Salle-first lookup. If the salle isn't registered, or the
            # salle is registered but the IP doesn't match any device in
            # it, the mesure lands in the unregistered bucket.
            esp32 = self._match_device(db, topic_salle, source_ip, topic)

            data = schemas.MesureCreate(
                esp32_id=esp32.id if esp32 is not None else None,
                type=type_,            # type: ignore[arg-type]
                source_ip=source_ip,
                topic_salle=topic_salle,
                valeur=valeur_f,
                unite=unite,
            )
            crud.create_mesure(db, data)
            logger.info(
                "MQTT mesure insérée salle=%s ip=%s type=%s valeur=%s unite=%s (linked=%s)",
                topic_salle, source_ip, type_, valeur_f, unite,
                esp32 is not None,
            )
        except Exception:
            logger.exception("MQTT insert mesure échoué (topic=%s)", topic)
        finally:
            db.close()

    # ── helpers ──────────────────────────────────────────────────
    def _match_device(
        self,
        db,
        topic_salle: str,
        source_ip: str,
        topic: str,
    ) -> Optional[object]:
        """Find the Esp32Device for this (salle, ip) tuple, logging
        non-fatal mismatches so the admin can spot misconfigured devices.

        Returns the matching device, or ``None`` if the mesure should
        fall into the unregistered bucket."""
        devices: List[object] = crud.get_esp32_by_salle(db, topic_salle)
        if not devices:
            self._warn_unknown_source(source_ip, topic_salle, topic)
            return None

        match = next((d for d in devices if d.ip == source_ip), None)
        if match is not None:
            return match

        # Salle known, but the IP isn't part of it — log so the admin
        # can decide whether to add a new device or update the topic.
        known_ips = [d.ip for d in devices]
        logger.warning(
            "MQTT salle/ip non concordant: salle=%s ip=%s (IPs enregistrées: %s) — "
            "stocké en attente de réclamation par l'administrateur",
            topic_salle, source_ip, ", ".join(known_ips),
        )
        return None

    def _warn_unknown_source(self, ip: str, salle: str, topic: str) -> None:
        now = time.time()
        last = _last_unreg_warn_at.get(ip, 0.0)
        if now - last < _WARN_COOLDOWN_SECONDS:
            return
        _last_unreg_warn_at[ip] = now
        logger.warning(
            "MQTT message d'un salle non enregistré (%s, ip=%s) sur %s — "
            "stocké en attente d'enregistrement par un administrateur",
            salle, ip, topic,
        )
