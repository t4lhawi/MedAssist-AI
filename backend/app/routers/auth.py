from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas import Token, LoginRequest, UtilisateurCreate, UtilisateurOut
from ..auth import verifier_mdp, creer_token, get_current_user
from .. import crud

router = APIRouter(prefix="/api/auth", tags=["Authentification"])

@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_utilisateur_by_email(db, data.email)
    if not user or not verifier_mdp(data.password, user.mdp_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = creer_token({"sub": user.email, "role": user.role})
    return {"access_token": token}

@router.post("/register", response_model=UtilisateurOut)
def register(data: UtilisateurCreate, db: Session = Depends(get_db)):
    if crud.get_utilisateur_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    return crud.create_utilisateur(db, data)

@router.get("/me", response_model=UtilisateurOut)
def me(current_user=Depends(get_current_user)):
    return current_user
