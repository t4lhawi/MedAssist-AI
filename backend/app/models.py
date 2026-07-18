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
    """A registered IoT device, identified by its LAN IP and assigned to
    a physical 'salle'. Sensor *types* are not declared up-front — they are
    discovered from incoming MQTT payloads."""
    __tablename__ = "esp32_devices"

    id        = Column(Integer, primary_key=True, index=True)
    # IPv4 fits in 15 chars, IPv6 in 45 — keep room for the latter.
    ip        = Column(String(45), nullable=False, unique=True, index=True)
    salle     = Column(String(100), nullable=False, index=True)
    note      = Column(String(200))
    actif     = Column(Boolean, default=True)
    cree_le   = Column(DateTime(timezone=True), server_default=func.now())
    # Bumped by the MQTT ingester on every accepted measurement from this
    # IP. Used by the admin "unregistered bucket" and by the salle grid's
    # online/offline dot.
    derniere_mesure_le = Column(DateTime(timezone=True))

    mesures = relationship("Mesure", back_populates="esp32")
    alertes = relationship("Alerte", back_populates="esp32")


class Mesure(Base):
    """One observation from an ESP32. The sensor *type* lives on the row
    (not on the device) because a single ESP32 may emit multiple types.

    The ``esp32_id`` FK is nullable so we can keep measurements from
    devices that haven't been registered yet (``source_ip`` will be set
    instead)."""
    __tablename__ = "mesures"

    id         = Column(Integer, primary_key=True, index=True)
    esp32_id   = Column(Integer, ForeignKey("esp32_devices.id"), nullable=True, index=True)
    type       = Column(String(30), nullable=False, index=True)
    source_ip  = Column(String(45), nullable=True, index=True)
    # Salle segment from the MQTT topic (medassist/salle/<topic_salle>/<type>).
    # Stored even when esp32_id is NULL so the admin can see "a device claimed
    # to be Salle X but I haven't registered any device for Salle X".
    topic_salle = Column(String(100), nullable=True, index=True)
    valeur     = Column(Float, nullable=False)
    unite      = Column(String(20))
    timestamp  = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    esp32   = relationship("Esp32Device", back_populates="mesures")
    alertes = relationship("Alerte", back_populates="mesure")

    # Composite index powers the salle-grid query:
    #   WHERE esp32_id = ? AND type = ? ORDER BY timestamp DESC
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
    # optional direct esp32 link (may be null; esp32 reached via mesure chain instead)
    esp32_id   = Column(Integer, ForeignKey("esp32_devices.id"), nullable=True, index=True)
    # alerte is always linked to a mesure (which carries esp32 via mesures.esp32_id).
    mesure_id  = Column(Integer, ForeignKey("mesures.id"), nullable=True)
    niveau     = Column(String(20), nullable=False)   # info | attention | critique
    type       = Column(String(30), nullable=True)    # sensor type (temperature, etc.)
    message    = Column(Text, nullable=False)
    traitee    = Column(Boolean, default=False)
    cree_le    = Column(DateTime(timezone=True), server_default=func.now())

    esp32  = relationship("Esp32Device", back_populates="alertes")
    mesure = relationship("Mesure", back_populates="alertes")
