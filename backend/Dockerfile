# ════════════════════════════════════════════════════════════
#  MedAssist AI – Backend (FastAPI)
# ════════════════════════════════════════════════════════════
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# libpq est requis pour psycopg2-binary ; on ne garde que le runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Les deps changent peu souvent — on les installe en premier pour
# profiter du cache Docker quand seul le code change.
COPY requirements.txt ./
RUN pip install --upgrade pip \
 && pip install -r requirements.txt

# Code de l'application.
COPY . .

# Script d'entrée : attend Postgres, applique les migrations,
# seed l'admin, puis lance Uvicorn.
RUN chmod +x entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["./entrypoint.sh"]
