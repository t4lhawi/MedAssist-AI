from __future__ import annotations
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..auth import require_admin, require_hospital_staff
from ..database import get_db

logger = logging.getLogger(__name__)

# Two-tier protection:
#   * The router-level dependency ensures *every* endpoint in this
#     module is at least authenticated and belongs to an admin OR a
#     hospital_staff member. The per-endpoint dependencies below
#     further restrict mutating actions to admin only.
router = APIRouter(
    prefix="/api/admin/esp32",
    tags=["Admin · ESP32"],
    dependencies=[Depends(require_hospital_staff)],
)

# ─── CRUD on devices ────────────────────────────────────────────
@router.get("/", response_model=List[schemas.Esp32DeviceOut])
def lister_esp32(db: Session = Depends(get_db)):
    return crud.list_esp32(db)

@router.post("/", response_model=schemas.Esp32DeviceOut, status_code=201)
def creer_esp32(
    data: schemas.Esp32DeviceCreate,
    db: Session = Depends(get_db),
    _user=Depends(require_admin),
):
    try:
        return crud.create_esp32(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

@router.patch("/{esp32_id}", response_model=schemas.Esp32DeviceOut)
def mettre_a_jour_esp32(
    esp32_id: int,
    data: schemas.Esp32DeviceUpdate,
    db: Session = Depends(get_db),
    _user=Depends(require_admin),
):
    d = crud.update_esp32(db, esp32_id, data)
    if d is None:
        raise HTTPException(status_code=404, detail="ESP32 introuvable")
    return d

@router.delete("/{esp32_id}", status_code=204)
def supprimer_esp32(
    esp32_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_admin),
):
    ok = crud.delete_esp32(db, esp32_id)
    if not ok:
        raise HTTPException(status_code=404, detail="ESP32 introuvable")
    return None

# ─── Unregistered bucket (measurements from unknown IPs) ─────────
@router.get("/unregistered", response_model=List[schemas.UnregisteredSource])
def lister_sources_non_enregistrees(
    db: Session = Depends(get_db),
    _user=Depends(require_admin),
):
    return crud.get_unregistered_sources(db)

@router.post("/claim", response_model=schemas.Esp32DeviceOut, status_code=201)
def reclamer_ip(
    data: schemas.Esp32ClaimRequest,
    db: Session = Depends(get_db),
    _user=Depends(require_admin),
):
    try:
        return crud.claim_source_ip(db, data.ip, data.salle, data.note)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

# ─── Aggregated salle grid (consumed by the dashboard) ──────────
@router.get("/salles-status", response_model=List[schemas.SalleStatus])
def statut_salles(db: Session = Depends(get_db)):
    return crud.get_salles_status(db)