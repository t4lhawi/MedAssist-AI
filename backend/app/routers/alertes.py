from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas import AlerteOut, _alerte_to_out
from ..auth import get_current_user
from .. import crud

router = APIRouter(prefix="/api/alertes", tags=["Alertes"])

@router.get("/", response_model=List[AlerteOut])
def lister(
    traitee: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    alertes = crud.get_alertes(db, traitee=traitee, limit=limit)
    return [_alerte_to_out(a) for a in alertes]

@router.patch("/{alerte_id}/traiter", response_model=AlerteOut)
def traiter(alerte_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    a = crud.traiter_alerte(db, alerte_id)
    if not a:
        from fastapi import HTTPException
        raise HTTPException(404, "Alerte introuvable")
    return _alerte_to_out(a)
