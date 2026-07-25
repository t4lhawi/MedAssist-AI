from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..auth import get_current_user, require_admin, normalize_role
from ..database import get_db

router = APIRouter(prefix="/api/utilisateurs", tags=["Utilisateurs"])

@router.get("/", response_model=List[schemas.UtilisateurOut])
def lister_utilisateurs(
    db: Session = Depends(get_db),
    user = require_admin,
):
    """
    Liste tous les utilisateurs (admin uniquement).
    """
    return crud.get_utilisateurs(db)

@router.get("/{user_id}", response_model=schemas.UtilisateurOut)
def obtenir_utilisateur(
    user_id: int,
    db: Session = Depends(get_db),
    user = require_admin,
):
    """
    Récupère un utilisateur par son ID (admin uniquement).
    """
    db_user = crud.get_utilisateur(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return db_user

@router.put("/{user_id}", response_model=schemas.UtilisateurOut)
def mettre_a_jour_utilisateur(
    user_id: int,
    payload: schemas.UtilisateurUpdate,
    db: Session = Depends(get_db),
    user = require_admin,
):
    """
    Met à jour un utilisateur (admin uniquement). Le champ ``role`` est
    normalisé à la valeur canonique (``admin`` / ``hospital_staff`` /
    ``visitor``) avant d'être persisté.
    """
    db_user = crud.get_utilisateur(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    # Convert Pydantic model to dict, excluding unset fields
    update_data = payload.dict(exclude_unset=True)
    # Hash password if provided
    if "password" in update_data and update_data["password"]:
        from ..auth import hacher_mdp
        update_data["mdp_hash"] = hacher_mdp(update_data.pop("password"))
    # Normalize the role so a malicious client cannot sneak a legacy
    # string into the column and bypass the dependency check next time.
    if "role" in update_data and update_data["role"]:
        update_data["role"] = normalize_role(update_data["role"])
    updated_user = crud.update_utilisateur(db, user_id=user_id, payload=update_data)
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_utilisateur(
    user_id: int,
    db: Session = Depends(get_db),
    user = require_admin,
):
    """
    Supprime un utilisateur (admin uniquement). On empêche un admin de
    se supprimer lui-même pour éviter de verrouiller la plateforme.
    """
    db_user = crud.get_utilisateur(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user_id == user.id:
        raise HTTPException(
            status_code=400,
            detail="Vous ne pouvez pas supprimer votre propre compte.",
        )
    success = crud.delete_utilisateur(db, user_id=user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Impossible de supprimer l'utilisateur")
    return None