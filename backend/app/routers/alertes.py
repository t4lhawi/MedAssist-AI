from fastapi import APIRouter, Body, Depends, Query
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


@router.delete("/{alerte_id}", status_code=204)
def supprimer(
    alerte_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Supprime une alerte par id. 204 si OK, 404 si l'id n'existe pas.

    Conçu pour purger manuellement les alertes déjà traitées depuis
    l'écran 'Traitées' — le sweeper automatique n'efface que les
    alertes encore actives au-delà de 24h, donc les traitées restent
    dans l'historique tant qu'on ne les supprime pas explicitement.
    """
    from fastapi import HTTPException
    if not crud.delete_alerte(db, alerte_id):
        raise HTTPException(404, "Alerte introuvable")
    return None


@router.post("/bulk-delete")
def supprimer_en_masse(
    ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Supprime plusieurs alertes en une seule requête.

    Le frontend envoie ``{"ids": [1, 2, 3]}`` (embed=True place le body
    sous la clé ``ids`` — évite la collision avec d'éventuels query
    params). Renvoie le nombre de lignes effectivement effacées pour
    que l'UI puisse afficher un toast précis.
    """
    deleted = crud.delete_alertes(db, ids)
    return {"deleted": deleted}
