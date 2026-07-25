from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas import AlerteOut, _alerte_to_out
from ..auth import require_admin, require_hospital_staff
from .. import crud

router = APIRouter(prefix="/api/alertes", tags=["Alertes"])

# Alerte visibility is shared between admin and hospital staff
#   * "traiter"  → admin OR hospital staff
#   * delete     → admin only
@router.get("/", response_model=List[AlerteOut])
def lister(
    traitee: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    user=Depends(require_hospital_staff),
):
    alertes = crud.get_alertes(db, traitee=traitee, limit=limit)
    return [_alerte_to_out(a) for a in alertes]

@router.patch("/{alerte_id}/traiter", response_model=AlerteOut)
def traiter(
    alerte_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_hospital_staff),
):
    a = crud.traiter_alerte(db, alerte_id)
    if not a:
        raise HTTPException(404, "Alerte introuvable")
    return _alerte_to_out(a)

@router.delete("/{alerte_id}", status_code=204)
def supprimer(
    alerte_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    if not crud.delete_alerte(db, alerte_id):
        raise HTTPException(404, "Alerte introuvable")
    return None

@router.post("/bulk-delete")
def supprimer_en_masse(
    ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    user=Depends(require_admin),
):
    deleted = crud.delete_alertes(db, ids)
    return {"deleted": deleted}