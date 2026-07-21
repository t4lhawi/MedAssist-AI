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


# ─── Capteur (legacy — kept for the read-only CapteursPage
#              during the migration window). New code uses Esp32Device.
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
# obvious garbage from the admin form.
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
    # When set to a string, the note is replaced with that value (including
    # the empty string ""). When ``clear_note`` is True the note is set to
    # NULL regardless of ``note``. This disambiguates "leave untouched" from
    # "wipe", which a single Optional[str] cannot express.
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
    """Body for POST /api/admin/esp32/claim — promote an unregistered IP
    to a fully-registered ESP32 in a single call."""
    ip: str
    salle: str = Field(min_length=1, max_length=100)
    note: Optional[str] = Field(default=None, max_length=200)

    @field_validator("ip")
    @classmethod
    def _ip_v4(cls, v: str) -> str:
        return _validate_ipv4(v)


# ─── Mesure ──────────────────────────────────────────────────────
class MesureCreate(BaseModel):
    """Insertion DTO. Accepts both the new (esp32_id, type, source_ip) and
    the legacy (capteur_id) shape — the legacy field is ignored on insert
    with a deprecation log so old clients keep working during the migration
    window."""
    # New (preferred)
    esp32_id: Optional[int] = None
    type: Optional[SensorType] = None
    source_ip: Optional[str] = None
    # Salle segment read from the MQTT topic (medassist/salle/<topic_salle>/<type>).
    # Optional for callers that don't go through the MQTT path.
    topic_salle: Optional[str] = None
    # Legacy — ignored on insert
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
    """esp32_id and salle are computed from the alerte → esp32 chain
    (or from alerte → mesure → esp32 for pre-migration alertes).
    Requires joinedload on both Alerte.esp32 and Alerte.mesure.esp32."""
    model_config = {"from_attributes": True}

    id: int
    type: Optional[SensorType] = None
    mesure_id: Optional[int] = None
    niveau: str
    message: str
    traitee: bool
    cree_le: datetime
    # computed from the alerte's direct esp32 link or the mesure chain
    esp32_id: Optional[int] = None
    salle: Optional[str] = None
    # IA-generated explanation (markdown). NULL while being generated or
    # if the LLM call failed.
    explication: Optional[str] = None
    explication_cree_le: Optional[datetime] = None


def _alerte_to_out(a) -> AlerteOut:
    """Map an Alerte ORM row (with eagerly-loaded esp32 and mesure.esp32)
    to AlerteOut. Prefers the direct Alerte.esp32 link, falls back to the
    alerte → mesure → esp32 chain."""
    # Try direct link first (newer alertes), then go through mesure (legacy).
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
    # Convenient pre-formatted "il y a 12 min" string for the dashboard.
    last_seen_label: Optional[str] = None


class SalleStatus(BaseModel):
    esp32_id: Optional[int] = None
    salle: str
    ip: Optional[str] = None
    actif: bool
    online: bool
    sensors: List[SensorStatus] = []
    # The most recent timestamp of any sensor in this salle — used to
    # determine the "online dot" on the card header.
    derniere_mesure_le: Optional[datetime] = None
    # Free-form internal note attached to the device (étage, service…).
    note: Optional[str] = None


class UnregisteredSource(BaseModel):
    ip: str
    last_seen: Optional[datetime] = None
    measurement_count: int
    # Most recent type seen — a hint for the admin ("this device is
    # reporting temperature + humidity").
    last_type: Optional[SensorType] = None
    last_valeur: Optional[float] = None
    last_unite: Optional[str] = None

