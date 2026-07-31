from __future__ import annotations
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy import desc, func, and_
from sqlalchemy.orm import Session, joinedload
from . import models, schemas

logger = logging.getLogger(__name__)


# ─── SEUILS D'ALERTE ─────────────────────────────────────────────
SEUILS: Dict[str, Dict[str, float]] = {
    "temperature": {"min": 18.0, "max": 26.0},
    "humidite": {"min": 30.0, "max": 70.0},
    "pression": {"min": 950.0, "max": 1050.0},
    "qualite_air": {"max": 1000.0},
}

LIBELLES_TYPES: Dict[str, str] = {
    "temperature": "Température",
    "humidite": "Humidité",
    "pression": "Pression",
    "qualite_air": "Qualité de l'air",
}

# A sensor flips to "offline" when no mesure for that (esp32, type) pair
# has arrived in the last N seconds. Default 60s — adjust in tests via
# get_salles_status(offline_threshold_seconds=...).
OFFLINE_THRESHOLD_SECONDS: int = 60

# Alertes older than this are filtered out of every read AND physically
# purged from the database by a background sweeper (see ``purge_old_alertes``
# in ``app.main``). The 24h window keeps the alertes list bounded while
# still giving the dashboard enough history to be useful.
ALERTE_RETENTION_HOURS: int = 24

# AI explanations are cached per (sensor type, severity) for this long.
# Any new alert of the same (type, niveau) within the window reuses the
# last generated explanation instead of paying for another LLM call.
EXPLICATION_CACHE_HOURS: int = 24

# ─── Utilisateurs ────────────────────────────────────────────────
def get_utilisateur_by_email(db: Session, email: str):
    return db.query(models.Utilisateur).filter(
        models.Utilisateur.email == email,
    ).first()

def create_utilisateur(db: Session, data: schemas.UtilisateurCreate):
    from .auth import hacher_mdp
    user = models.Utilisateur(
        nom=data.nom,
        email=data.email,
        mdp_hash=hacher_mdp(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_utilisateurs(db: Session):
    return db.query(models.Utilisateur).all()

# ─── ESP32 (source of truth) ────────────────────────────────────
def list_esp32(db: Session) -> List[models.Esp32Device]:
    return db.query(models.Esp32Device).order_by(
        models.Esp32Device.salle.asc(),
        models.Esp32Device.ip.asc(),
    ).all()

def get_esp32(db: Session, esp32_id: int) -> Optional[models.Esp32Device]:
    return db.query(models.Esp32Device).filter(
        models.Esp32Device.id == esp32_id,
    ).first()

def get_esp32_by_ip(db: Session, ip: str) -> Optional[models.Esp32Device]:
    if not ip:
        return None
    return db.query(models.Esp32Device).filter(
        models.Esp32Device.ip == ip,
    ).first()

def get_esp32_by_salle(db: Session, salle: str) -> List[models.Esp32Device]:
    if not salle:
        return []
    return db.query(models.Esp32Device).filter(
        models.Esp32Device.salle == salle,
    ).all()

def get_esp32_by_ip_locked(db: Session, ip: str) -> Optional[models.Esp32Device]:
    return db.query(models.Esp32Device).filter(
        models.Esp32Device.ip == ip,
    ).with_for_update().first()

def create_esp32(
        db: Session,
        data: schemas.Esp32DeviceCreate) -> models.Esp32Device:
    existing = get_esp32_by_ip(db, data.ip)
    if existing is not None:
        raise ValueError(f"Un ESP32 avec l'IP {data.ip} est déjà enregistré")
    d = models.Esp32Device(
        ip=data.ip,
        salle=data.salle,
        note=data.note,
        actif=data.actif,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d

def update_esp32(
    db: Session,
    esp32_id: int,
    data: schemas.Esp32DeviceUpdate,
) -> Optional[models.Esp32Device]:
    d = get_esp32(db, esp32_id)
    if d is None:
        return None
    if data.salle is not None:
        d.salle = data.salle
    if data.clear_note is True:
        d.note = None
    elif data.note is not None:
        d.note = data.note
    if data.actif is not None:
        d.actif = data.actif
    db.commit()
    db.refresh(d)
    return d

def delete_esp32(db: Session, esp32_id: int) -> bool:
    d = get_esp32(db, esp32_id)
    if d is None:
        return False

    # 1) Alertes that point at any of this device's mesures (via mesure_id).
    db.query(
        models.Alerte).filter(
        models.Alerte.mesure_id.in_(
            db.query(
                models.Mesure.id).filter(
                    models.Mesure.esp32_id == esp32_id)),
    ).delete(
        synchronize_session='fetch')

    # 2) The mesures themselves.
    db.query(models.Mesure).filter(
        models.Mesure.esp32_id == esp32_id,
    ).delete(synchronize_session='fetch')

    # 3) The device row.
    db.flush()
    db.delete(d)
    db.commit()
    return True

def claim_source_ip(
    db: Session,
    ip: str,
    salle: str,
    note: Optional[str],
) -> models.Esp32Device:
    existing = get_esp32_by_ip(db, ip)
    if existing is not None:
        raise ValueError(
            f"L'IP {ip} est déjà enregistrée (salle: {existing.salle})")

    d = models.Esp32Device(ip=ip, salle=salle, note=note, actif=True)
    db.add(d)
    db.flush()  # populate d.id before the UPDATE below

    db.query(models.Mesure).filter(
        models.Mesure.source_ip == ip,
        models.Mesure.esp32_id.is_(None),
    ).update({models.Mesure.esp32_id: d.id}, synchronize_session=False)

    db.query(models.Alerte).filter(
        models.Alerte.mesure_id.in_(
            db.query(models.Mesure.id).filter(models.Mesure.source_ip == ip),
        ),
        models.Alerte.esp32_id.is_(None),
    ).update({models.Alerte.esp32_id: d.id}, synchronize_session=False)

    db.commit()
    db.refresh(d)
    return d

# ─── Mesures ─────────────────────────────────────────────────────
def create_mesure(
        db: Session,
        data: schemas.MesureCreate) -> schemas.MesureOut:
    # type is required (no longer derivable from the device).
    type_ = data.type
    if not type_:
        raise ValueError(
            "Le champ 'type' est obligatoire (temperature | humidite | pression | qualite_air)")

    esp32 = None
    if data.esp32_id is not None:
        esp32 = get_esp32(db, data.esp32_id)
        if esp32 is None:
            raise ValueError(f"esp32_id={data.esp32_id} introuvable")
    elif data.source_ip:
        esp32 = get_esp32_by_ip(db, data.source_ip)

    m = models.Mesure(
        esp32_id=esp32.id if esp32 is not None else None,
        type=type_,
        source_ip=data.source_ip,
        topic_salle=data.topic_salle,
        valeur=data.valeur,
        unite=data.unite,
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    if esp32 is not None:
        esp32.derniere_mesure_le = m.timestamp
        db.commit()

    # Threshold check — only for registered devices (no alerts on
    # unregistered source IPs).
    if esp32 is not None:
        _verifier_seuil(db, m, esp32, type_)
    return _mesure_to_out(m)

def _mesure_to_out(m: models.Mesure) -> schemas.MesureOut:
    return schemas.MesureOut.model_validate(
        {**{c.name: getattr(m, c.name) for c in m.__table__.columns},
         "salle": m.esp32.salle if m.esp32 is not None else None},
    )

def get_mesures(
    db: Session,
    limit: int = 100,
    esp32_id: Optional[int] = None,
    type: Optional[str] = None,
    salle: Optional[str] = None,
):
    q = db.query(models.Mesure).options(joinedload(models.Mesure.esp32))
    if esp32_id is not None:
        q = q.filter(models.Mesure.esp32_id == esp32_id)
    if type:
        q = q.filter(models.Mesure.type == type)
    if salle:
        q = q.join(
            models.Esp32Device,
            models.Mesure.esp32_id == models.Esp32Device.id).filter(
            models.Esp32Device.salle == salle,
        )
    return [_mesure_to_out(m) for m in
            q.order_by(desc(models.Mesure.timestamp)).limit(limit).all()]

def _verifier_seuil(
    db: Session,
    mesure: models.Mesure,
    esp32: models.Esp32Device,
    type_: str,
) -> None:
    seuil = SEUILS.get(type_, {})
    libelle = LIBELLES_TYPES.get(type_, type_.capitalize())
    niveau = None
    msg = None
    valeur = mesure.valeur
    unite = mesure.unite or ""
    if "max" in seuil and valeur > seuil["max"]:
        niveau = "critique" if valeur > seuil["max"] * 1.1 else "attention"
        msg = f"{libelle} trop élevée : {valeur} {unite} (max: {seuil['max']})"
    elif "min" in seuil and valeur < seuil["min"]:
        niveau = "attention"
        msg = f"{libelle} trop basse : {valeur} {unite} (min: {seuil['min']})"
    if niveau:
        alerte = models.Alerte(
            esp32_id=esp32.id,
            type=type_,
            mesure_id=mesure.id,
            niveau=niveau,
            message=msg,
        )
        db.add(alerte)
        db.commit()
        db.refresh(alerte)
        _schedule_explication(alerte.id)
        try:
            from . import realtime
            realtime.publish(realtime.make_alerte_event(alerte))
        except Exception:
            logger.exception(
                "realtime: échec publication alerte %d",
                alerte.id)

def _schedule_explication(alerte_id: int) -> None:
    import threading
    thread = threading.Thread(
        target=_run_explication,
        args=(alerte_id,),
        daemon=True,
    )
    thread.start()

def _run_explication(alerte_id: int) -> None:
    try:
        # 1) Tentative de cache : on cherche la dernière explication encore
        #    valide pour ce couple (type, niveau).
        cached = _get_cached_explication(alerte_id)
        if cached is not None:
            texte, source_id = cached
            _apply_cached_explication(alerte_id, texte, source_id)
            logger.info(
                "Explication IA réutilisée du cache pour alerte %d (source: alerte %d, %d caractères)",
                alerte_id,
                source_id,
                len(texte),
            )
            return

        # 2) Pas de cache exploitable : on appelle le LLM.
        from .rag.pipeline import expliquer_alerte
        explication = expliquer_alerte(alerte_id)
        if explication:
            logger.info(
                "Explication IA générée pour alerte %d (%d caractères)",
                alerte_id,
                len(explication))
        else:
            logger.info(
                "Explication IA vide pour alerte %d (LLM a renvoyé un texte vide)",
                alerte_id)
    except Exception as exc:
        logger.warning(
            "Échec génération explication IA pour alerte %d : %s: %s",
            alerte_id,
            type(exc).__name__,
            exc)

def _get_cached_explication(alerte_id: int) -> Optional[Tuple[str, int]]:
    from .database import SessionLocal
    db = SessionLocal()
    try:
        cible = db.query(models.Alerte).get(alerte_id)
        if cible is None or not cible.type or not cible.niveau:
            return None
        cutoff = datetime.now(timezone.utc) - \
            timedelta(hours=EXPLICATION_CACHE_HOURS)
        row = (
            db.query(models.Alerte)
            .filter(
                models.Alerte.id != alerte_id,
                models.Alerte.type == cible.type,
                models.Alerte.niveau == cible.niveau,
                models.Alerte.explication.isnot(None),
                models.Alerte.explication != "",
                models.Alerte.explication_cree_le.isnot(None),
                models.Alerte.explication_cree_le >= cutoff,
            )
            .order_by(desc(models.Alerte.explication_cree_le))
            .first()
        )
        if row is None or not row.explication:
            return None
        return (row.explication, row.id)
    finally:
        db.close()


def _apply_cached_explication(
        alerte_id: int,
        texte: str,
        source_id: int) -> None:
    from .database import SessionLocal
    db = SessionLocal()
    try:
        cible = db.query(models.Alerte).get(alerte_id)
        if cible is None:
            return
        cible.explication = texte
        cible.explication_cree_le = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()


def purge_old_alertes(db: Session) -> int:
    cutoff = datetime.now(timezone.utc) - \
        timedelta(hours=ALERTE_RETENTION_HOURS)
    deleted = (
        db.query(models.Alerte)
        .filter(
            models.Alerte.cree_le < cutoff,
            models.Alerte.traitee.is_(False),
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return int(deleted or 0)


# ─── Salles (aggregated view) ───────────────────────────────────
def _format_last_seen(ts: Optional[datetime]) -> Optional[str]:
    if ts is None:
        return None
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - ts
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "à l'instant"
    if seconds < 3600:
        return f"il y a {seconds // 60} min"
    if seconds < 86400:
        return f"il y a {seconds // 3600} h"
    return f"il y a {seconds // 86400} j"


def get_salles_status(
    db: Session,
    offline_threshold_seconds: int = OFFLINE_THRESHOLD_SECONDS,
) -> List[schemas.SalleStatus]:
    devices = list_esp32(db)
    types = list(schemas.SENSOR_TYPES)
    out: List[schemas.SalleStatus] = []

    # 1) Compute the last mesure per (esp32_id, type) in a single query.
    last_per_pair: dict[tuple[int, str], datetime] = {
        (r.esp32_id, r.type): r.max_ts
        for r in db.query(
            models.Mesure.esp32_id,
            models.Mesure.type,
            func.max(models.Mesure.timestamp).label("max_ts"),
        ).filter(
            models.Mesure.esp32_id.isnot(None),
        ).group_by(
            models.Mesure.esp32_id, models.Mesure.type,
        ).all()
    }

    for d in devices:
        sensors: List[schemas.SensorStatus] = []
        device_latest: Optional[datetime] = None
        for t in types:
            last_ts = last_per_pair.get((d.id, t))
            if last_ts is None:
                sensors.append(
                    schemas.SensorStatus(
                        type=t,
                        state="not_installed",
                        last_value=None,
                        last_unite=None,
                        last_timestamp=None,
                        last_seen_label=None,
                    ))
                continue
            if device_latest is None or last_ts > device_latest:
                device_latest = last_ts
            age = (
                datetime.now(
                    timezone.utc) - (
                    last_ts if last_ts.tzinfo else last_ts.replace(
                        tzinfo=timezone.utc))).total_seconds()
            # Fetch the actual last value (small, indexed lookup).
            last_row = db.query(models.Mesure).filter(
                models.Mesure.esp32_id == d.id,
                models.Mesure.type == t,
                models.Mesure.timestamp == last_ts,
            ).order_by(models.Mesure.id.desc()).first()
            sensors.append(
                schemas.SensorStatus(
                    type=t,
                    state="active" if age <= offline_threshold_seconds else "offline",
                    last_value=last_row.valeur if last_row else None,
                    last_unite=last_row.unite if last_row else None,
                    last_timestamp=last_ts,
                    last_seen_label=_format_last_seen(last_ts),
                ))
        online = device_latest is not None and (
            datetime.now(timezone.utc) - (
                device_latest if device_latest.tzinfo
                else device_latest.replace(tzinfo=timezone.utc)
            )
        ).total_seconds() <= offline_threshold_seconds
        out.append(
            schemas.SalleStatus(
                esp32_id=d.id,
                salle=d.salle,
                ip=d.ip,
                actif=d.actif,
                online=online,
                sensors=sensors,
                derniere_mesure_le=device_latest,
                note=d.note,
            ))

    # 2) Synthetic "Unregistered" entry.
    unreg_ips = [
        ip for (ip,) in db.query(models.Mesure.source_ip).filter(
            models.Mesure.esp32_id.is_(None),
            models.Mesure.source_ip.isnot(None),
        ).distinct().all()
    ]
    if unreg_ips:
        sensors: List[schemas.SensorStatus] = []
        last_overall: Optional[datetime] = None
        for t in types:
            row = db.query(models.Mesure).filter(
                models.Mesure.esp32_id.is_(None),
                models.Mesure.type == t,
            ).order_by(desc(models.Mesure.timestamp)).first()
            if row is None:
                continue
            if last_overall is None or row.timestamp > last_overall:
                last_overall = row.timestamp
            sensors.append(schemas.SensorStatus(
                type=t, state="active",
                last_value=row.valeur, last_unite=row.unite,
                last_timestamp=row.timestamp,
                last_seen_label=_format_last_seen(row.timestamp),
            ))
        out.insert(0, schemas.SalleStatus(
            esp32_id=None, salle="ESP32 non enregistrés", ip=None,
            actif=True, online=True, sensors=sensors,
            derniere_mesure_le=last_overall,
        ))

    return out

# ─── Unregistered bucket (admin view) ───────────────────────────
def get_unregistered_sources(db: Session) -> List[schemas.UnregisteredSource]:
    rows = db.query(
        models.Mesure.source_ip,
        func.max(models.Mesure.timestamp).label("last_seen"),
        func.count(models.Mesure.id).label("cnt"),
    ).filter(
        models.Mesure.esp32_id.is_(None),
        models.Mesure.source_ip.isnot(None),
    ).group_by(models.Mesure.source_ip).order_by(desc("last_seen")).all()

    out: List[schemas.UnregisteredSource] = []
    for ip, last_seen, cnt in rows:
        last_row = db.query(models.Mesure).filter(
            models.Mesure.source_ip == ip,
            models.Mesure.esp32_id.is_(None),
        ).order_by(desc(models.Mesure.timestamp)).first()
        out.append(schemas.UnregisteredSource(
            ip=ip,
            last_seen=last_seen,
            measurement_count=cnt or 0,
            last_type=last_row.type if last_row else None,
            last_valeur=last_row.valeur if last_row else None,
            last_unite=last_row.unite if last_row else None,
        ))
    return out

# ─── Alertes ─────────────────────────────────────────────────────
def get_alertes(
    db: Session,
    traitee: Optional[bool] = None,
    limit: int = 50,
    esp32_id: Optional[int] = None,
):
    q = db.query(models.Alerte).options(
        joinedload(models.Alerte.esp32),
        joinedload(models.Alerte.mesure).joinedload(models.Mesure.esp32),
    )
    if traitee is not True:
        cutoff = datetime.now(timezone.utc) - \
            timedelta(hours=ALERTE_RETENTION_HOURS)
        q = q.filter(models.Alerte.cree_le >= cutoff)
    if traitee is not None:
        q = q.filter(models.Alerte.traitee == traitee)
    if esp32_id is not None:
        q = q.filter(models.Alerte.esp32_id == esp32_id)
    return q.order_by(desc(models.Alerte.cree_le)).limit(limit).all()

def traiter_alerte(db: Session, alerte_id: int):
    a = db.query(models.Alerte).filter(models.Alerte.id == alerte_id).first()
    if a:
        a.traitee = True
        db.commit()
    return a

def delete_alerte(db: Session, alerte_id: int) -> bool:
    deleted = (
        db.query(models.Alerte)
        .filter(models.Alerte.id == alerte_id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return bool(deleted)

def delete_alertes(db: Session, alerte_ids: List[int]) -> int:
    if not alerte_ids:
        return 0
    deleted = (
        db.query(models.Alerte)
        .filter(models.Alerte.id.in_(alerte_ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    return int(deleted or 0)

# ─── Documents ───────────────────────────────────────────────────
def create_document(
        db: Session,
        nom: str,
        chemin: str,
        taille: int,
        user_id: int):
    doc = models.Document(
        nom=nom,
        chemin=chemin,
        taille=taille,
        uploade_par=user_id)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def get_documents(db: Session):
    return db.query(models.Document).order_by(
        desc(models.Document.uploade_le)).all()

def get_document(db: Session, doc_id: int):
    return db.query(models.Document).filter(
        models.Document.id == doc_id).first()

def marquer_indexe(db: Session, doc_id: int):
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id).first()
    if doc:
        doc.indexe = True
        db.commit()
    return doc

def delete_document(db: Session, doc_id: int):
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id).first()
    if doc:
        db.delete(doc)
        db.commit()
    return doc

def get_document_by_nom(db: Session, nom: str):
    """Return the document with this exact name, or None. Used to detect
    a rename that would collide with another file on disk."""
    return db.query(models.Document).filter(
        models.Document.nom == nom,
    ).first()

def update_document_nom(
    db: Session,
    doc_id: int,
    nouveau_nom: str,
    nouveau_chemin: str,
):
    """Rename a document: update `nom` + `chemin` and flip `indexe` back
    to False so the UI shows the "En attente" badge until the background
    re-index finishes. Returns the updated row, or None if the doc was
    deleted in the meantime."""
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id).first()
    if doc is None:
        return None
    doc.nom = nouveau_nom
    doc.chemin = nouveau_chemin
    doc.indexe = False
    db.commit()
    db.refresh(doc)
    return doc

# ─── Conversations ───────────────────────────────────────────────
def save_conversation(
        db: Session,
        user_id: int,
        question: str,
        reponse: str,
        sources: list):
    c = models.Conversation(
        utilisateur_id=user_id,
        question=question,
        reponse=reponse,
        sources=sources)
    db.add(c)
    db.commit()
    return c

def get_conversations(db: Session, user_id: int, limit: int = 20):
    return db.query(models.Conversation)\
        .filter(models.Conversation.utilisateur_id == user_id)\
        .order_by(desc(models.Conversation.cree_le)).limit(limit).all()

def delete_conversations(db: Session, user_id: int):
    deleted = db.query(models.Conversation).filter(
        models.Conversation.utilisateur_id == user_id,
    ).delete(synchronize_session=False)
    db.commit()
    return deleted

def delete_conversation(
        db: Session,
        user_id: int,
        conversation_id: int) -> bool:
    conv = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id,
        models.Conversation.utilisateur_id == user_id,
    ).first()
    if not conv:
        return False
    db.delete(conv)
    db.commit()
    return True