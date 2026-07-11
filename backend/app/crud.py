from typing import Optional

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from . import models, schemas
from .auth import hacher_mdp

# ─── SEUILS D'ALERTE ─────────────────────────────────────────────
SEUILS = {
    "temperature": {"min": 18.0, "max": 26.0},
    "humidite":    {"min": 30.0, "max": 70.0},
    "pression":    {"min": 950.0, "max": 1050.0},
    "qualite_air": {"max": 100.0},
    "air":         {"max": 1000.0},
}

LIBELLES_CAPTEURS = {
    "temperature": "Température",
    "humidite": "Humidité",
    "pression": "Pression",
    "qualite_air": "Qualité de l'air",
    "air": "Qualité de l'air",
}

# ─── Utilisateurs ────────────────────────────────────────────────
def get_utilisateur_by_email(db: Session, email: str):
    return db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()

def create_utilisateur(db: Session, data: schemas.UtilisateurCreate):
    user = models.Utilisateur(
        nom=data.nom, email=data.email,
        mdp_hash=hacher_mdp(data.password), role=data.role
    )
    db.add(user); db.commit(); db.refresh(user)
    return user

def get_utilisateurs(db: Session):
    return db.query(models.Utilisateur).all()


# ─── Capteurs ────────────────────────────────────────────────────
def create_capteur(db: Session, data: schemas.CapteurCreate):
    c = models.Capteur(**data.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return c

def get_capteurs(db: Session):
    return db.query(models.Capteur).filter(models.Capteur.actif == True).all()

def get_capteur(db: Session, capteur_id: int):
    return db.query(models.Capteur).filter(models.Capteur.id == capteur_id).first()


# ─── Mesures ─────────────────────────────────────────────────────
def create_mesure(db: Session, data: schemas.MesureCreate):
    m = models.Mesure(**data.model_dump())
    db.add(m); db.commit(); db.refresh(m)
    _verifier_seuil(db, m)
    return m

def get_mesures(db: Session, capteur_id: Optional[int] = None, limit: int = 100):
    q = db.query(models.Mesure)
    if capteur_id is not None:
        q = q.filter(models.Mesure.capteur_id == capteur_id)
    return q.order_by(desc(models.Mesure.timestamp)).limit(limit).all()

def _verifier_seuil(db: Session, mesure: models.Mesure):
    capteur = db.query(models.Capteur).filter(models.Capteur.id == mesure.capteur_id).first()
    if not capteur:
        return
    capteur_type = getattr(capteur, "type")
    mesure_valeur = getattr(mesure, "valeur")
    mesure_unite = getattr(mesure, "unite")
    seuil = SEUILS.get(capteur_type, {})
    libelle = LIBELLES_CAPTEURS.get(capteur_type, capteur_type.capitalize())
    niveau = None; msg = None
    if "max" in seuil and mesure_valeur > seuil["max"]:
        niveau = "critique" if mesure_valeur > seuil["max"] * 1.1 else "attention"
        msg = f"{libelle} trop élevée : {mesure_valeur} {mesure_unite or ''} (max: {seuil['max']})"
    elif "min" in seuil and mesure_valeur < seuil["min"]:
        niveau = "attention"
        msg = f"{libelle} trop basse : {mesure_valeur} {mesure_unite or ''} (min: {seuil['min']})"
    if niveau:
        alerte = models.Alerte(capteur_id=capteur.id, mesure_id=mesure.id, niveau=niveau, message=msg)
        db.add(alerte); db.commit()


# ─── Alertes ─────────────────────────────────────────────────────
def get_alertes(db: Session, traitee: Optional[bool] = None, limit: int = 50):
    q = db.query(models.Alerte).options(joinedload(models.Alerte.capteur))
    if traitee is not None:
        q = q.filter(models.Alerte.traitee == traitee)
    return q.order_by(desc(models.Alerte.cree_le)).limit(limit).all()

def traiter_alerte(db: Session, alerte_id: int):
    a = db.query(models.Alerte).options(joinedload(models.Alerte.capteur)).filter(models.Alerte.id == alerte_id).first()
    if a:
        setattr(a, "traitee", True)
        db.commit()
    return a


# ─── Documents ───────────────────────────────────────────────────
def create_document(db: Session, nom: str, chemin: str, taille: int, user_id: int):
    doc = models.Document(nom=nom, chemin=chemin, taille=taille, uploade_par=user_id)
    db.add(doc); db.commit(); db.refresh(doc)
    return doc

def get_documents(db: Session):
    return db.query(models.Document).order_by(desc(models.Document.uploade_le)).all()

def get_document(db: Session, doc_id: int):
    return db.query(models.Document).filter(models.Document.id == doc_id).first()

def marquer_indexe(db: Session, doc_id: int):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if doc:
        setattr(doc, "indexe", True)
        db.commit()
    return doc

def delete_document(db: Session, doc_id: int):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if doc:
        db.delete(doc); db.commit()
    return doc


# ─── Conversations ───────────────────────────────────────────────
def save_conversation(db: Session, user_id: int, question: str, reponse: str, sources: list):
    c = models.Conversation(utilisateur_id=user_id, question=question, reponse=reponse, sources=sources)
    db.add(c); db.commit()
    return c

def get_conversations(db: Session, user_id: int, limit: int = 20):
    return db.query(models.Conversation)\
        .filter(models.Conversation.utilisateur_id == user_id)\
        .order_by(desc(models.Conversation.cree_le)).limit(limit).all()
