from __future__ import annotations
import logging
from typing import Any, Dict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from .. import realtime
from ..auth import decoder_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/realtime", tags=["Realtime"])

def _decode_ws_token(token: str) -> Dict[str, Any]:
    try:
        return decoder_token(token)
    except JWTError:
        raise WebSocketDisconnect(code=status.WS_1008_POLICY_VIOLATION)
    except Exception:
        # decoder_token also raises HTTPException(401) for "Token invalide".
        # Treat any auth failure as policy violation on the WS.
        raise WebSocketDisconnect(code=status.WS_1008_POLICY_VIOLATION)

@router.websocket("/ws")
async def realtime_ws(websocket: WebSocket, token: str = ""):
    payload = _decode_ws_token(token) if token else None
    if payload is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    # Tiny "hello" so the client can tell the link is up. The client
    # also uses it to flip its "connecting" state to "live".
    try:
        await websocket.send_json({"kind": "hello", "user": payload.get("sub")})
    except Exception:
        return

    queue = await realtime.subscribe()
    try:
        while True:
            # Drain messages. send_json can raise on a dead socket;
            # catch and exit so we don't leak the subscriber.
            event = await queue.get()
            try:
                await websocket.send_json(event)
            except Exception:
                break
    except WebSocketDisconnect:
        pass
    finally:
        await realtime.unsubscribe(queue)
        try:
            await websocket.close()
        except Exception:
            pass