from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:admin@postgres:5432/medassist"
    SECRET_KEY: str = "medassist_secret_key_changez_moi_svp_2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Provider IA — par défaut Ollama (gratuit, local)
    LLM_PROVIDER: Literal["ollama", "gemini", "groq", "openai"] = "ollama"
    LLM_MODEL: str = "llama3.2"
    OLLAMA_BASE_URL: str = "http://ollama:11434"

    # Clés optionnelles (alternatives gratuites)
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    CHROMA_PATH: str = "./chroma_db"
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"

settings = Settings()
