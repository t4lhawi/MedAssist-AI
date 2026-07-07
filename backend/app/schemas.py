from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ─── Auth ────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: str
    password: str


# ─── Utilisateur ────────────────────────────────────────────────
class UtilisateurCreate(BaseModel):
    nom: str
    email: str
    password: str
    role: str = "soignant"

class UtilisateurOut(BaseModel):
    id: int
    nom: str
    email: str
    role: str
    actif: bool
    cree_le: datetime
    class Config:
        from_attributes = True


# ─── Capteur ─────────────────────────────────────────────────────
class CapteurCreate(BaseModel):
    nom: str
    type: str
    emplacement: Optional[str] = None

class CapteurOut(CapteurCreate):
    id: int
    actif: bool
    cree_le: datetime
    class Config:
        from_attributes = True


# ─── Mesure ──────────────────────────────────────────────────────
class MesureCreate(BaseModel):
    capteur_id: int
    valeur: float
    unite: Optional[str] = None

class MesureOut(MesureCreate):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True


# ─── Document ────────────────────────────────────────────────────
class DocumentOut(BaseModel):
    id: int
    nom: str
    taille: Optional[int]
    indexe: bool
    uploade_le: datetime
    class Config:
        from_attributes = True


# ─── Conversation ────────────────────────────────────────────────
class ChatRequest(BaseModel):
    question: str
    historique: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    reponse: str
    sources: List[Any] = []


# ─── Alerte ──────────────────────────────────────────────────────
class AlerteOut(BaseModel):
    id: int
    capteur_id: Optional[int]
    niveau: str
    message: str
    traitee: bool
    cree_le: datetime
    class Config:
        from_attributes = True
