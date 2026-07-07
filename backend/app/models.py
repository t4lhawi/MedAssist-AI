from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id        = Column(Integer, primary_key=True, index=True)
    nom       = Column(String(100), nullable=False)
    email     = Column(String(150), unique=True, index=True, nullable=False)
    mdp_hash  = Column(String(255), nullable=False)
    role      = Column(String(30), default="soignant")   # admin | technicien | soignant
    actif     = Column(Boolean, default=True)
    cree_le   = Column(DateTime(timezone=True), server_default=func.now())

    conversations = relationship("Conversation", back_populates="utilisateur")
    documents     = relationship("Document", back_populates="uploade_par_user")


class Capteur(Base):
    __tablename__ = "capteurs"
    id          = Column(Integer, primary_key=True, index=True)
    nom         = Column(String(100), nullable=False)
    type        = Column(String(50), nullable=False)   # temperature | humidite | air
    emplacement = Column(String(200))
    actif       = Column(Boolean, default=True)
    cree_le     = Column(DateTime(timezone=True), server_default=func.now())

    mesures = relationship("Mesure", back_populates="capteur")
    alertes = relationship("Alerte", back_populates="capteur")


class Mesure(Base):
    __tablename__ = "mesures"
    id         = Column(Integer, primary_key=True, index=True)
    capteur_id = Column(Integer, ForeignKey("capteurs.id"), nullable=False)
    valeur     = Column(Float, nullable=False)
    unite      = Column(String(20))
    timestamp  = Column(DateTime(timezone=True), server_default=func.now())

    capteur = relationship("Capteur", back_populates="mesures")
    alertes = relationship("Alerte", back_populates="mesure")


class Document(Base):
    __tablename__ = "documents"
    id           = Column(Integer, primary_key=True, index=True)
    nom          = Column(String(255), nullable=False)
    chemin       = Column(String(500), nullable=False)
    taille       = Column(Integer)
    indexe       = Column(Boolean, default=False)
    uploade_par  = Column(Integer, ForeignKey("utilisateurs.id"))
    uploade_le   = Column(DateTime(timezone=True), server_default=func.now())

    uploade_par_user = relationship("Utilisateur", back_populates="documents")


class Conversation(Base):
    __tablename__ = "conversations"
    id             = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id"))
    question       = Column(Text, nullable=False)
    reponse        = Column(Text, nullable=False)
    sources        = Column(JSON, default=list)
    cree_le        = Column(DateTime(timezone=True), server_default=func.now())

    utilisateur = relationship("Utilisateur", back_populates="conversations")


class Alerte(Base):
    __tablename__ = "alertes"
    id         = Column(Integer, primary_key=True, index=True)
    capteur_id = Column(Integer, ForeignKey("capteurs.id"))
    mesure_id  = Column(Integer, ForeignKey("mesures.id"))
    niveau     = Column(String(20), nullable=False)   # info | attention | critique
    message    = Column(Text, nullable=False)
    traitee    = Column(Boolean, default=False)
    cree_le    = Column(DateTime(timezone=True), server_default=func.now())

    capteur = relationship("Capteur", back_populates="alertes")
    mesure  = relationship("Mesure", back_populates="alertes")
