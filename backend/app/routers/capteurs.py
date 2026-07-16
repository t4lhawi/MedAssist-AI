"""Backward-compat shim for the legacy /api/capteurs/* endpoints.

The post-refactor model is keyed on ESP32 devices (IP + salle), not on
'capteurs' (name + type). The frontend has been rewritten against the
new model, so this router is kept only to make sure no other caller is
left with a 404 during the transition. New code should call the
``/api/admin/esp32/*`` endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/api/capteurs", tags=["Capteurs (legacy)"])


@router.get("/", response_model=List[schemas.Esp32DeviceOut])
def lister_comme_capteurs(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Return the registered ESP32 devices under the legacy 'capteurs'
    shape. The frontend should switch to ``/api/admin/esp32/``."""
    return crud.list_esp32(db)
