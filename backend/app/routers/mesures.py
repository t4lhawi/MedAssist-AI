from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas import MesureCreate, MesureOut
from ..auth import get_current_user
from .. import crud

router = APIRouter(prefix="/api/mesures", tags=["Mesures"])

@router.post("/", response_model=MesureOut)
def creer(data: MesureCreate, db: Session = Depends(get_db)):
    """Endpoint conservé pour tests manuels / clients HTTP legacy.

    Les ESP32 en production publient désormais sur MQTT
    ``medassist/mesures/<capteur_id>`` (voir ``backend/app/mqtt_client.py``).
    """
    return crud.create_mesure(db, data)

@router.get("/", response_model=List[MesureOut])
def lister(
    capteur_id: Optional[int] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return crud.get_mesures(db, capteur_id=capteur_id, limit=limit)
