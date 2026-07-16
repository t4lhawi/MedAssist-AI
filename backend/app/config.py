from pathlib import Path
from typing import Literal

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

    # Provider IA — par défaut Ollama (gratuit, local)
    LLM_PROVIDER: Literal["ollama", "gemini", "groq", "openai"] = "ollama"
    LLM_MODEL: str = "llama3.2"
    LLM_MAX_TOKENS: int = 256
    LLM_TIMEOUT_SECONDS: int = 60
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_KEEP_ALIVE: str = "30m"
    RAG_RETRIEVAL_K: int = 4
    RAG_HISTORY_MESSAGES: int = 4

    # Clés optionnelles (alternatives gratuites)
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

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
