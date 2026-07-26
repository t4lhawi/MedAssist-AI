# ════════════════════════════════════════════════════════════
#  MedAssist AI – Backend image (FastAPI + Alembic + RAG + MQTT)
#  LLM : Groq  ·  Embeddings : OpenRouter
# ════════════════════════════════════════════════════════════

# ── Stage 1 : build dependencies ────────────────────────────
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# build-essential kept around so any future native dep installs cleanly.
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
RUN pip install -r requirements.txt

# ── Stage 2 : minimal runtime ───────────────────────────────
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Runtime libs only (no compilers in the final image).
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --shell /bin/sh --uid 1001 app

# Pull in site-packages + console scripts from the builder.
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /app

COPY --chown=app:app . /app

# Normalize line endings on shell scripts so CRLF from Windows checkouts
# doesn't break the POSIX shell (e.g. "set -e" becoming "set -e\r").
RUN find /app -maxdepth 3 -type f -name "*.sh" -exec sed -i 's/\r$$//' {} + \
 && chmod +x /app/entrypoint.sh

# Pre-create the persistent data mount points and hand them to the
# unprivileged `app` user. Docker only mounts a volume on a directory
# that already exists inside the image, and the mount preserves the
# image's ownership — so if we created /data as root, the `app` user
# (UID 1001) would get PermissionError on upload/index writes.
RUN mkdir -p /data/uploads /data/chroma \
 && chown -R app:app /data

USER app

EXPOSE 8000

ENTRYPOINT ["sh", "/app/entrypoint.sh"]