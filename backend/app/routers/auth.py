from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import cast
from ..database import get_db
from ..schemas import Token, LoginRequest, UtilisateurCreate, UtilisateurOut
from ..auth import verifier_mdp, creer_token, get_current_user, normalize_role
from .. import crud

router = APIRouter(prefix="/api/auth", tags=["Authentification"])

@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_utilisateur_by_email(db, data.email)
    if not user or not verifier_mdp(data.password, cast(str, user.mdp_hash)):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    # Always embed the canonical role in the JWT so downstream code
    # never has to translate legacy values.
    role = normalize_role(cast(str, user.role))
    token = creer_token({"sub": user.email, "role": role})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/register", response_model=UtilisateurOut)
def register(data: UtilisateurCreate, db: Session = Depends(get_db)):
    """Self-registration. The role in the body is clamped to the most
    restrictive (visitor) — only an admin can promote a user to a
    higher role via PUT /api/utilisateurs/{id}."""
    if crud.get_utilisateur_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    # Force the role to visitor regardless of the payload to prevent
    # privilege escalation through the public registration endpoint.
    safe_data = UtilisateurCreate(
        nom=data.nom,
        email=data.email,
        password=data.password,
        role=normalize_role("visitor"),
    )
    return crud.create_utilisateur(db, safe_data)

@router.get("/me", response_model=UtilisateurOut)
def me(current_user: UtilisateurOut = Depends(get_current_user)):
    # ``current_user.role`` has already been normalized to the canonical
    # identifier by ``get_current_user``; we echo it back so the client
    # can drive its permission system without a second round-trip.
    return current_user
