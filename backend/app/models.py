from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, JSON, Index,
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

class Esp32Device(Base):
    __tablename__ = "esp32_devices"
    id        = Column(Integer, primary_key=True, index=True)
    ip        = Column(String(45), nullable=False, unique=True, index=True)
    salle     = Column(String(100), nullable=False, index=True)
    note      = Column(String(200))
    actif     = Column(Boolean, default=True)
    cree_le   = Column(DateTime(timezone=True), server_default=func.now())
    derniere_mesure_le = Column(DateTime(timezone=True))

    mesures = relationship("Mesure", back_populates="esp32")
    alertes = relationship("Alerte", back_populates="esp32")

class Mesure(Base):
    __tablename__ = "mesures"
    id         = Column(Integer, primary_key=True, index=True)
    esp32_id   = Column(Integer, ForeignKey("esp32_devices.id"), nullable=True, index=True)
    type       = Column(String(30), nullable=False, index=True)
    source_ip  = Column(String(45), nullable=True, index=True)
    topic_salle = Column(String(100), nullable=True, index=True)
    valeur     = Column(Float, nullable=False)
    unite      = Column(String(20))
    timestamp  = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    esp32   = relationship("Esp32Device", back_populates="mesures")
    alertes = relationship("Alerte", back_populates="mesure")

    __table_args__ = (
        Index("ix_mesures_esp32_type_ts", "esp32_id", "type", "timestamp"),
    )

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
    esp32_id   = Column(Integer, ForeignKey("esp32_devices.id"), nullable=True, index=True)
    mesure_id  = Column(Integer, ForeignKey("mesures.id"), nullable=True)
    niveau     = Column(String(20), nullable=False)   # info | attention | critique
    type       = Column(String(30), nullable=True)    # sensor type (temperature, etc.)
    message    = Column(Text, nullable=False)
    traitee    = Column(Boolean, default=False)
    cree_le    = Column(DateTime(timezone=True), server_default=func.now())
    explication = Column(Text, nullable=True)
    explication_cree_le = Column(DateTime(timezone=True), nullable=True)

    esp32  = relationship("Esp32Device", back_populates="alertes")
    mesure = relationship("Mesure", back_populates="alertes")