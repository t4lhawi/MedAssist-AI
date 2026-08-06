import os
import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

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
    role: str = "visitor"

class UtilisateurUpdate(BaseModel):
    nom: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    actif: Optional[bool] = None

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

# ─── ESP32 (source-of-truth device registry) ───────────────────
SensorType = Literal["temperature", "humidite", "pression", "qualite_air"]
SENSOR_TYPES: tuple[SensorType, ...] = (
    "temperature", "humidite", "pression", "qualite_air",
)

# Conservative IPv4 validator — we store the string verbatim but reject
_IPV4_RE = re.compile(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$")

def _validate_ipv4(value: str) -> str:
    if not isinstance(value, str) or not _IPV4_RE.match(value):
        raise ValueError("Adresse IP invalide (format IPv4 attendu)")
    for part in value.split("."):
        if int(part) > 255:
            raise ValueError("Adresse IP invalide (octet > 255)")
    return value

class Esp32DeviceBase(BaseModel):
    ip: str
    salle: str = Field(min_length=1, max_length=100)
    note: Optional[str] = Field(default=None, max_length=200)
    actif: bool = True

    @field_validator("ip")
    @classmethod
    def _ip_v4(cls, v: str) -> str:
        return _validate_ipv4(v)

class Esp32DeviceCreate(Esp32DeviceBase):
    pass

class Esp32DeviceUpdate(BaseModel):
    salle: Optional[str] = Field(default=None, min_length=1, max_length=100)
    note: Optional[str] = Field(default=None, max_length=200)
    clear_note: Optional[bool] = None
    actif: Optional[bool] = None

class Esp32DeviceOut(BaseModel):
    id: int
    ip: str
    salle: str
    note: Optional[str] = None
    actif: bool
    cree_le: datetime
    derniere_mesure_le: Optional[datetime] = None
    class Config:
        from_attributes = True

class Esp32ClaimRequest(BaseModel):
    ip: str
    salle: str = Field(min_length=1, max_length=100)
    note: Optional[str] = Field(default=None, max_length=200)

    @field_validator("ip")
    @classmethod
    def _ip_v4(cls, v: str) -> str:
        return _validate_ipv4(v)

# ─── Mesure ──────────────────────────────────────────────────────
class MesureCreate(BaseModel):
    esp32_id: Optional[int] = None
    type: Optional[SensorType] = None
    source_ip: Optional[str] = None
    topic_salle: Optional[str] = None
    capteur_id: Optional[int] = None
    valeur: float
    unite: Optional[str] = None

    @field_validator("source_ip")
    @classmethod
    def _source_ip_v4(cls, v: Optional[str]) -> Optional[str]:
        return _validate_ipv4(v) if v else v

class MesureOut(BaseModel):
    id: int
    esp32_id: Optional[int] = None
    type: Optional[SensorType] = None
    source_ip: Optional[str] = None
    salle: Optional[str] = None
    topic_salle: Optional[str] = None
    valeur: float
    unite: Optional[str] = None
    timestamp: datetime
    class Config:
        from_attributes = True

# ─── Document ────────────────────────────────────────────────────
class DocumentUpdate(BaseModel):
    nom: str = Field(min_length=1, max_length=255)

    @field_validator("nom")
    @classmethod
    def _nom_pdf(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom ne peut pas être vide")
        if os.sep in v or "/" in v or "\\" in v:
            raise ValueError("Le nom ne peut pas contenir de séparateur de chemin")
        if not v.lower().endswith(".pdf"):
            raise ValueError("Le nom doit se terminer par .pdf")
        return v

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
    explication: str | None = None

# ─── Alerte ──────────────────────────────────────────────────────
class AlerteOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    type: Optional[SensorType] = None
    mesure_id: Optional[int] = None
    niveau: str
    message: str
    traitee: bool
    cree_le: datetime
    esp32_id: Optional[int] = None
    salle: Optional[str] = None
    explication: Optional[str] = None
    explication_cree_le: Optional[datetime] = None

def _alerte_to_out(a) -> AlerteOut:
    direct_esp32 = getattr(a, "esp32", None)
    mesure = getattr(a, "mesure", None)
    indirect_esp32 = getattr(mesure, "esp32", None) if mesure else None
    esp32 = direct_esp32 if direct_esp32 else indirect_esp32
    return AlerteOut.model_construct(
        id=a.id,
        type=getattr(a, "type", None),
        mesure_id=getattr(a, "mesure_id", None),
        niveau=a.niveau,
        message=a.message,
        traitee=a.traitee,
        cree_le=a.cree_le,
        esp32_id=getattr(esp32, "id", None) if esp32 else None,
        salle=getattr(esp32, "salle", None) if esp32 else None,
        explication=getattr(a, "explication", None),
        explication_cree_le=getattr(a, "explication_cree_le", None),
    )

# ─── Aggregated views for the salle-grouped dashboard ──────────
SensorState = Literal["active", "offline", "not_installed"]

class SensorStatus(BaseModel):
    type: SensorType
    state: SensorState
    last_value: Optional[float] = None
    last_unite: Optional[str] = None
    last_timestamp: Optional[datetime] = None
    last_seen_label: Optional[str] = None

class SalleStatus(BaseModel):
    esp32_id: Optional[int] = None
    salle: str
    ip: Optional[str] = None
    actif: bool
    online: bool
    sensors: List[SensorStatus] = []
    derniere_mesure_le: Optional[datetime] = None
    note: Optional[str] = None

class UnregisteredSource(BaseModel):
    ip: str
    last_seen: Optional[datetime] = None
    measurement_count: int
    last_type: Optional[SensorType] = None
    last_valeur: Optional[float] = None
    last_unite: Optional[str] = None