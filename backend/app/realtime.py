"""In-process pub/sub used by the WebSocket layer to broadcast live
events (new mesures from MQTT, new alertes from the threshold check)
to every connected client.

The publisher can be called from any thread — it uses the running
asyncio loop captured at app startup to push events into each
subscriber's queue.

Kept deliberately minimal: no event persistence, no replay, no
filtering. If the WS is offline at the moment a publish happens,
the event is dropped. Frontends fall back to a slow safety poll for
state they missed while disconnected.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional, Set

logger = logging.getLogger(__name__)


# ─── subscriber registry ─────────────────────────────────────────
_subscribers: Set[asyncio.Queue] = set()
_loop: Optional[asyncio.AbstractEventLoop] = None
_lock: Optional[asyncio.Lock] = None
# Reentrancy guard. The MQTT thread and the FastAPI thread both can
# race on _subscribers; lock all mutations. Created lazily because
# asyncio.Lock() needs a running loop in 3.10+.
def _get_lock() -> asyncio.Lock:
    global _lock
    if _lock is None:
        _lock = asyncio.Lock()
    return _lock


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Called once from the FastAPI lifespan. The MQTT thread (and any
    other thread) uses this to push events into the running loop."""
    global _loop
    _loop = loop
    logger.info("realtime: event loop captured (%s)", loop)


async def subscribe() -> asyncio.Queue:
    """Register a new subscriber and return its queue. The caller is
    responsible for draining the queue and calling ``unsubscribe`` when
    done."""
    q: asyncio.Queue = asyncio.Queue(maxsize=256)
    async with _get_lock():
        _subscribers.add(q)
    return q


async def unsubscribe(q: asyncio.Queue) -> None:
    async with _get_lock():
        _subscribers.discard(q)


def publish(event: Dict[str, Any]) -> None:
    """Sync, thread-safe. Pushes ``event`` into every subscriber queue.
    Drop the event if a queue is full (slow consumer) rather than block
    the publisher — losing a tick is fine, the safety poll will catch up.
    """
    if _loop is None or not _subscribers:
        return
    for q in list(_subscribers):
        try:
            _loop.call_soon_threadsafe(_put_nowait, q, event)
        except RuntimeError:
            # Loop closed during shutdown.
            return


def _put_nowait(q: asyncio.Queue, event: Dict[str, Any]) -> None:
    try:
        q.put_nowait(event)
    except asyncio.QueueFull:
        # Slow consumer — drop. Logging at debug to avoid spam.
        logger.debug("realtime: dropped event for slow consumer")


# ─── event helpers ──────────────────────────────────────────────
def make_mesure_event(m) -> Dict[str, Any]:
    """Project a Mesure ORM row to a small WS payload. Matches the
    fields consumed by the dashboard (id, type, valeur, unite,
    timestamp, esp32_id, salle, source_ip, topic_salle) so the
    frontend can splice it into its existing state without a re-fetch.
    """
    return {
        "kind": "mesure",
        "data": {
            "id": m.id,
            "type": m.type,
            "valeur": m.valeur,
            "unite": m.unite,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "esp32_id": m.esp32_id,
            "salle": (m.esp32.salle if m.esp32 is not None else None),
            "source_ip": m.source_ip,
            "topic_salle": m.topic_salle,
        },
    }


def make_alerte_event(a) -> Dict[str, Any]:
    """Project a freshly-created Alerte to a small WS payload. Mirrors
    schemas.AlerteOut so the frontend's existing AlerteOut type applies.
    """
    direct = getattr(a, "esp32", None)
    mesure = getattr(a, "mesure", None)
    indirect = getattr(mesure, "esp32", None) if mesure else None
    device = direct if direct else indirect
    return {
        "kind": "alerte",
        "data": {
            "id": a.id,
            "type": getattr(a, "type", None),
            "mesure_id": getattr(a, "mesure_id", None),
            "niveau": a.niveau,
            "message": a.message,
            "traitee": a.traitee,
            "cree_le": a.cree_le.isoformat() if a.cree_le else None,
            "esp32_id": getattr(device, "id", None) if device else None,
            "salle": getattr(device, "salle", None) if device else None,
            "explication": getattr(a, "explication", None),
            "explication_cree_le": (
                a.explication_cree_le.isoformat()
                if getattr(a, "explication_cree_le", None)
                else None
            ),
        },
    }