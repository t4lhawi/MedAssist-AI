from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas import CapteurCreate, CapteurOut
from ..auth import get_current_user
from .. import crud

router = APIRouter(prefix="/api/capteurs", tags=["Capteurs"])

@router.post("/", response_model=CapteurOut)
def creer(data: CapteurCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return crud.create_capteur(db, data)

@router.get("/", response_model=List[CapteurOut])
def lister(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return crud.get_capteurs(db)
