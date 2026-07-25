from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas
from ..auth import require_hospital_staff
from ..database import get_db

router = APIRouter(prefix="/api/capteurs", tags=["Capteurs (legacy)"])

@router.get("/", response_model=List[schemas.Esp32DeviceOut])
def lister_comme_capteurs(
    db: Session = Depends(get_db),
    user=Depends(require_hospital_staff),
):
    return crud.list_esp32(db)