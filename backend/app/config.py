from pathlib import Path
from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parents[1]

def _resolve_backend_path(value: str) -> str:
    path = Path(value)
    if path.is_absolute():
        return str(path)
    return str((BACKEND_DIR / path).resolve())

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:admin@postgres:5432/medassist"
    SECRET_KEY: str = "medassist_secret_key_changez_moi_svp_2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # LLM
    GROQ_API_KEY: str = "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"
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    LLM_MAX_TOKENS: int = 256
    LLM_TIMEOUT_SECONDS: int = 60

    # Embedding
    OPENROUTER_API_KEY: str = "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"
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
        env_file = str(BACKEND_DIR / ".env")

settings = Settings()
settings.CHROMA_PATH = _resolve_backend_path(settings.CHROMA_PATH)
settings.UPLOAD_DIR = _resolve_backend_path(settings.UPLOAD_DIR)