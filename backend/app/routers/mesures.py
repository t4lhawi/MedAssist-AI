from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas
from ..auth import require_hospital_staff
from ..database import get_db

router = APIRouter(prefix="/api/mesures", tags=["Mesures"])

# Mesures are created by the MQTT ingester running in-process, so
# ``POST /api/mesures`` is intentionally NOT exposed as a public HTTP
# endpoint. We keep the internal helper on ``crud`` for the ingester
# to call. Reads (used by the dashboard / charts) are available to
# any authenticated staff or admin.

@router.get("/", response_model=List[schemas.MesureOut])
def lister(
    limite: int = Query(100, le=500),
    esp32_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    salle: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(require_hospital_staff),
):
    return crud.get_mesures(
        db,
        limit=limite,
        esp32_id=esp32_id,
        type=type,
        salle=salle,
    )