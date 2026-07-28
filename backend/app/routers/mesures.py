from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas
from ..auth import require_hospital_staff
from ..database import get_db

router = APIRouter(prefix="/api/mesures", tags=["Mesures"])

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