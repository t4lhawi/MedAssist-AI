from __future__ import annotations
import json
import logging
import time
from typing import Dict, List, Optional
import paho.mqtt.client as mqtt
from . import crud, models, schemas
from .config import settings
from .database import SessionLocal

logger = logging.getLogger(__name__)

# Rate-limit the "unknown source IP" log: at most 1 warning per IP per minute.
_WARN_COOLDOWN_SECONDS = 60
_last_unreg_warn_at: Dict[str, float] = {}

class MqttIngestClient:
    def __init__(self) -> None:
        # paho-mqtt 1.x: pas de paramètre callback_api_version (API v1 par défaut)
        # paho-mqtt 2.x: il faut explicitement passer CallbackAPIVersion.VERSION2
        if hasattr(mqtt, "CallbackAPIVersion"):
            self._client = mqtt.Client(
                client_id=settings.MQTT_CLIENT_ID,
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            )
        else:
            self._client = mqtt.Client(client_id=settings.MQTT_CLIENT_ID)

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
    def _on_connect(self, client, userdata, flags, reason_code=None, properties=None):
        # paho-mqtt 1.x: _on_connect(client, userdata, flags, rc)
        # paho-mqtt 2.x: _on_connect(client, userdata, flags, reason_code, properties)
        rc = 0 if reason_code is None else reason_code
        if rc != 0:
            logger.warning("MQTT connexion refusée (reason_code=%s)", rc)
            return
        topic = f"{settings.MQTT_TOPIC_PREFIX}/+/+"
        client.subscribe(topic, qos=0)
        logger.info("MQTT connecté, abonnement à %s", topic)

    def _on_disconnect(self, client, userdata, *args):
        # Compatible paho-mqtt 1.x (rc) et 2.x (flags, reason_code, properties)
        rc = args[-1] if args else 0
        try:
            rc = int(rc)
        except (TypeError, ValueError):
            rc = 0
        if rc != 0:
            logger.warning("MQTT déconnecté (rc=%s) — reconnexion…", rc)

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
        topic_rest = topic[len(prefix) + 1:].split("/")
        # Topic shape: medassist/salle/<salle>/<type> (2 parts: salle, type)
        if len(topic_rest) != 2 or not topic_rest[0] or not topic_rest[1]:
            logger.warning("MQTT topic mal forme: %s (attendu: <salle>/<type>)", topic)
            return
        topic_salle = topic_rest[0]
        topic_type = topic_rest[1]

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

            # Broadcast to WebSocket subscribers. We re-query the row
            # so the payload carries the server-stamped id + timestamp;
            # the ingester's own context has neither.
            from . import realtime as _rt
            try:
                fresh = (
                    db.query(models.Mesure)
                    .filter(models.Mesure.source_ip == source_ip)
                    .order_by(models.Mesure.id.desc())
                    .first()
                )
                if fresh is not None:
                    _rt.publish(_rt.make_mesure_event(fresh))
            except Exception:
                logger.exception("realtime: échec publication mesure")
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
        devices: List[object] = crud.get_esp32_by_salle(db, topic_salle)
        if not devices:
            self._warn_unknown_source(source_ip, topic_salle, topic)
            return None

        match = next((d for d in devices if d.ip == source_ip), None)
        if match is not None:
            return match

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