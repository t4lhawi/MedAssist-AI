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
    return crud.list_esp32(db)