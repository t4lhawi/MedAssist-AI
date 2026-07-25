from datetime import datetime, timedelta
import hashlib
from typing import Iterable, List, Optional
import bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from . import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ─── Role identifiers (canonical, used in DB / JWT) ──────────────
# These are the *canonical* role strings stored in the database and
# embedded in the JWT. The UI maps them to localized labels in French.
ROLE_ADMIN = "admin"
ROLE_HOSPITAL_STAFF = "hospital_staff"
ROLE_VISITOR = "visitor"

# All known roles — used for validation and for legacy role migration.
ALL_ROLES: tuple[str, ...] = (ROLE_ADMIN, ROLE_HOSPITAL_STAFF, ROLE_VISITOR)

# Legacy role identifiers that older rows may still hold. The migration
# in 0003_rename_roles.py maps these onto the new canonical set so the
# application never has to deal with them at runtime.
LEGACY_ROLES: dict[str, str] = {
    "Admin": ROLE_ADMIN,
    "Technicien": ROLE_HOSPITAL_STAFF,
    "Soignant": ROLE_HOSPITAL_STAFF,
    "soignant": ROLE_HOSPITAL_STAFF,
    "technicien": ROLE_HOSPITAL_STAFF,
    "admin": ROLE_ADMIN,
    # "patient" / "visiteur" / "visitor" variants: only flip to
    # visitor if the user is *not* a staff member. The migration
    # script is more nuanced (it inspects email/flags), so the table
    # is only a hint for the request-time helper below.
    "patient": ROLE_VISITOR,
    "visiteur": ROLE_VISITOR,
    "Visitor": ROLE_VISITOR,
    "Patient": ROLE_VISITOR,
}

# Default role assigned to self-registered users (e.g. visitor sign-up
# that we may want to enable later). Keep the most restrictive option
# so that any future /api/auth/register endpoint is safe by default.
DEFAULT_ROLE: str = ROLE_VISITOR


def normalize_role(raw: Optional[str]) -> str:
    """Map any incoming role string (canonical, legacy, or unknown) to
    a canonical role. Unknown values fall back to the default."""
    if not raw:
        return DEFAULT_ROLE
    if raw in ALL_ROLES:
        return raw
    return LEGACY_ROLES.get(raw, DEFAULT_ROLE)


# ─── Mot de passe ────────────────────────────────────────────────
def _normaliser_mdp(mdp: str) -> bytes:
    return hashlib.sha256(mdp.encode("utf-8")).digest()

def hacher_mdp(mdp: str) -> str:
    mdp_normalise = _normaliser_mdp(mdp)
    hash_bcrypt = bcrypt.hashpw(mdp_normalise, bcrypt.gensalt())
    return f"sha256${hash_bcrypt.decode('utf-8')}"

def verifier_mdp(mdp_brut: str, mdp_hash: str) -> bool:
    try:
        if mdp_hash.startswith("sha256$"):
            hash_bcrypt = mdp_hash.removeprefix("sha256$").encode("utf-8")
            return bcrypt.checkpw(_normaliser_mdp(mdp_brut), hash_bcrypt)

        return bcrypt.checkpw(mdp_brut.encode("utf-8"), mdp_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False

# ─── JWT ─────────────────────────────────────────────────────────
def creer_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

def decoder_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")

# ─── Dépendances FastAPI ─────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decoder_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Token invalide")
    user = db.query(models.Utilisateur).filter(models.Utilisateur.email == email).first()
    if user is None or getattr(user, "actif", True) is False:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    # Normalize the role on the fly so legacy rows still resolve to a
    # canonical role at request time. We don't mutate the DB column
    # here — the migration handles that — but downstream code only ever
    # sees canonical values.
    user.role = normalize_role(user.role)
    return user


def _roles_to_set(roles: Optional[Iterable[str]]) -> set[str]:
    """Defensive: accept list, tuple, set, or a single string. Always
    returns the set of *canonical* roles."""
    if roles is None:
        return set()
    if isinstance(roles, str):
        return {normalize_role(roles)}
    return {normalize_role(r) for r in roles}


def require_roles(*allowed_roles: str):
    """Generic dependency factory. ``require_roles('admin', 'hospital_staff')``
    returns a dependency that yields the current user if and only if the
    user's role is in the allowed set. The user object's role is
    normalized to its canonical form before the check."""
    allowed = _roles_to_set(allowed_roles)

    def _dep(current_user=Depends(get_current_user)):
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Accès refusé. Rôles autorisés : "
                    + ", ".join(sorted(allowed))
                ),
            )
        return current_user

    return _dep


def require_admin(current_user=Depends(get_current_user)):
    """Backward-compatible alias — admin-only endpoints."""
    if current_user.role != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return current_user


def require_hospital_staff(current_user=Depends(get_current_user)):
    """Hospital staff or admin (admin is implicitly a superset of staff)."""
    if current_user.role not in (ROLE_ADMIN, ROLE_HOSPITAL_STAFF):
        raise HTTPException(status_code=403, detail="Accès agent hospitalier ou administrateur requis")
    return current_user


def require_visitor(current_user=Depends(get_current_user)):
    """Visitor (or any role — visitors are the most permissive). The
    intent is to ensure the request is at least authenticated, then
    the endpoint itself can do per-user authorization (e.g. only return
    the visitor's own data)."""
    if current_user.role not in ALL_ROLES:
        raise HTTPException(status_code=403, detail="Rôle inconnu")
    return current_user


def require_authenticated(current_user=Depends(get_current_user)):
    """Any authenticated user — for endpoints every role can hit (e.g.
    ``/api/auth/me``)."""
    return current_user
