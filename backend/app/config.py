import os
from pathlib import Path
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parents[1]

def _resolve_backend_path(value: str) -> str:
    path = Path(value)
    if path.is_absolute():
        return str(path)
    return str((BACKEND_DIR / path).resolve())

def _ensure_writable(path_str: str) -> str:
    p = Path(path_str)
    try:
        p.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise
    if not os.access(p, os.W_OK):
        raise PermissionError(
            f"UPLOAD_DIR/CHROMA_PATH '{p}' is not writable by UID "
            f"{os.getuid()}. Check the volume mount and directory "
            f"ownership in the Dockerfile."
        )
    return str(p)

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:admin@postgres:5432/medassist"
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # LLM
    GROQ_API_KEY: str
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    LLM_MAX_TOKENS: int = 256
    LLM_TIMEOUT_SECONDS: int = 60

    # Embedding
    OPENROUTER_API_KEY: str
    EMBEDDING_MODEL: str = "nvidia/llama-nemotron-embed-vl-1b-v2:free"

    RAG_RETRIEVAL_K: int = 4
    RAG_HISTORY_MESSAGES: int = 4

    CHROMA_PATH: str = "./chroma_db"
    UPLOAD_DIR: str = "./uploads"

    # ── MQTT (ingestion capteurs IoT) ────────────────────────
    MQTT_HOST: str = "localhost"
    MQTT_PORT: int = 1883
    # Topic shape: <prefix>/<salle>/<type> — the salle segment is the
    # source of truth for the device registry.
    MQTT_TOPIC_PREFIX: str = "medassist/salle"
    MQTT_CLIENT_ID: str = "medassist-backend"
    MQTT_USERNAME: str = ""                        # vide = anonyme
    MQTT_PASSWORD: str = ""
    MQTT_KEEPALIVE: int = 30

    class Config:
        env_file = str(BACKEND_DIR.parent / ".env")
        extra = "ignore"

settings = Settings()
settings.CHROMA_PATH = _ensure_writable(_resolve_backend_path(settings.CHROMA_PATH))
settings.UPLOAD_DIR = _ensure_writable(_resolve_backend_path(settings.UPLOAD_DIR))