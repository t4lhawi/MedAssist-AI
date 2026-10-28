from __future__ import annotations
import asyncio
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
    async def send_events() -> None:
        while True:
            event = await queue.get()
            await websocket.send_json(event)

    async def receive_messages() -> None:
        while True:
            await websocket.receive()

    sender = asyncio.create_task(send_events())
    receiver = asyncio.create_task(receive_messages())
    try:
        # Read and write concurrently. Reading client heartbeats prevents
        # reverse proxies from treating an otherwise quiet socket as idle.
        done, pending = await asyncio.wait(
            (sender, receiver),
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in done:
            task.result()
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("realtime: websocket closed", exc_info=True)
    finally:
        for task in (sender, receiver):
            if not task.done():
                task.cancel()
        await asyncio.gather(sender, receiver, return_exceptions=True)
        await realtime.unsubscribe(queue)
        try:
            await websocket.close()
        except Exception:
            pass