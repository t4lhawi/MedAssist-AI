# :rocket: Deployment

> Everything you need to bring the MedAssist AI stack up locally, on a private server, or on the public Internet.

---

## :clipboard: Requirements

| Requirement         | Version                          | Notes                                          |
| ------------------- | -------------------------------- | ---------------------------------------------- |
| **Docker**          | ≥ 24                             | Any modern release                             |
| **Docker Compose**  | v2 (`docker compose …`)          | Bundled with recent Docker Desktop             |
| **RAM**             | ≥ 2 GB free for the stack        | Postgres + Mosquitto + backend + nginx         |
| **Disk**            | ≥ 5 GB free                      | Mostly Postgres + ChromaDB + uploaded PDFs     |
| **LAN ports (prod)**| `1883` (MQTT), `8000` (API), `8080` (UI) | All configurable via `.env` / `docker-compose.yml` |
| **External APIs**   | Groq API key, OpenRouter API key | Required for RAG and LLM features              |

> :information_source: Outbound HTTPS to `api.groq.com` and `openrouter.ai` is mandatory for the AI features. Without those keys, the chat and alert-explanation endpoints will fail.

---

## :wrench: Local development (Docker Compose)

```bash
# 1. Clone
git clone https://github.com/t4lhawi/MedAssist-AI.git
cd MedAssist-AI

# 2. Configure secrets
cp .env.example .env
# Edit .env: POSTGRES_PASSWORD, SECRET_KEY, GROQ_API_KEY, OPENROUTER_API_KEY

# 3. Build images and start the stack
docker compose up -d --build
```

### What comes up

| Service     | Image                  | Host port | Container            |
| ----------- | ---------------------- | --------- | -------------------- |
| `postgres`  | `postgres:16-alpine`   | —         | `:5432`              |
| `mosquitto` | `eclipse-mosquitto:2`  | `1883`    | `:1883`              |
| `backend`   | local (multi-stage)    | `8000`    | `:8000`              |
| `frontend`  | local (multi-stage)    | `8080`    | nginx `:80`          |

Once `docker compose ps` shows all four services as `healthy` / `running`, the stack is ready.

| Endpoint            | URL                              |
| ------------------- | -------------------------------- |
| Web application     | http://localhost:8080            |
| API + Swagger UI    | http://localhost:8000/docs       |
| Health probe        | http://localhost:8000/health     |
| MQTT broker         | `mqtt://localhost:1883`          |

### Default accounts (development)

| Role            | Email                 | Password         |
| --------------- | --------------------- | ---------------- |
| `admin`         | admin@chuoujda.ma     | `Admin@2026!`    |
| `hospital_staff`| staff@chuoujda.ma     | `Staff@2026!`    |
| `visitor`       | visitor@chuoujda.ma   | `Visitor@2026!`  |

> :warning: **Change all default credentials before any non-development deployment.**

---

## :sparkles: Local development (no Docker)

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # .venv\Scripts\activate on Windows
pip install -r requirements.txt
alembic upgrade head
python seed_roles.py
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev                                          # http://localhost:5173
```

> In this mode you also need a running PostgreSQL and a running Mosquitto (locally or in their own containers). The backend reads its configuration from the project-root `.env`.

---

## :closed_lock_with_key: Environment variables

All settings are read from the project-root `.env` file. `docker-compose.yml` forwards them to the backend service.

### Database

| Variable            | Default                                                | Description                          |
| ------------------- | ------------------------------------------------------ | ------------------------------------ |
| `POSTGRES_DB`       | `medassist`                                            | Database name                        |
| `POSTGRES_USER`     | `postgres`                                             | Database user                        |
| `POSTGRES_PASSWORD` | `change-me`                                            | Database password                    |
| `DATABASE_URL`      | `postgresql://postgres:change-me@postgres:5432/medassist` | Full SQLAlchemy URL              |

### Authentication

| Variable                       | Default | Description                              |
| ------------------------------ | ------- | ---------------------------------------- |
| `SECRET_KEY`                   | `""`    | HS256 signing key — **set to ≥ 32 random chars** |
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | `60`    | JWT lifetime                             |

### LLM (Groq)

| Variable                | Default                      | Description        |
| ----------------------- | ---------------------------- | ------------------ |
| `GROQ_API_KEY`          | *(required)*                 | API key            |
| `LLM_MODEL`             | `llama-3.3-70b-versatile`    | Model name         |
| `LLM_MAX_TOKENS`        | `256`                        | Max response tokens|
| `LLM_TIMEOUT_SECONDS`   | `60`                         | Request timeout    |

### Embeddings (OpenRouter)

| Variable              | Default                                       | Description     |
| --------------------- | --------------------------------------------- | --------------- |
| `OPENROUTER_API_KEY`  | *(required)*                                  | API key         |
| `EMBEDDING_MODEL`     | `nvidia/llama-nemotron-embed-vl-1b-v2:free`   | Model name      |

### RAG

| Variable               | Default | Description                          |
| ---------------------- | ------- | ------------------------------------ |
| `RAG_RETRIEVAL_K`      | `4`     | Top-k chunks to retrieve per query   |
| `RAG_HISTORY_MESSAGES` | `4`     | Past messages injected into prompt   |

### Storage

| Variable      | Default              | Description                          |
| ------------- | -------------------- | ------------------------------------ |
| `CHROMA_PATH` | `/data/chroma`       | Where ChromaDB persists its vectors  |
| `UPLOAD_DIR`  | `/data/uploads`      | Where uploaded PDFs are written      |

### MQTT

| Variable            | Default                  | Description                            |
| ------------------- | ------------------------ | -------------------------------------- |
| `MQTT_HOST`         | `mosquitto`              | Service name in `docker-compose.yml`   |
| `MQTT_PORT`         | `1883`                   | TCP port                               |
| `MQTT_TOPIC_PREFIX` | `medassist/salle`        | Topic prefix for sensor publications   |
| `MQTT_CLIENT_ID`    | `medassist-backend`      | Unique client id for the backend       |
| `MQTT_USERNAME`     | `""`                     | Optional (broker is currently open)    |
| `MQTT_PASSWORD`     | `""`                     | Optional                               |
| `MQTT_KEEPALIVE`    | `30`                     | Seconds                                |

> :bulb: `MQTT_HOST` is set to `mosquitto` (the service name) inside the stack so DNS inside the Docker network resolves it. From an ESP32 on the LAN, the host's actual IPv4 (e.g. `192.168.1.100`) is used.

---

## :electric_plug: Ports

| Service     | Host port | Container | Bound on          | Notes                              |
| ----------- | --------- | --------- | ----------------- | ---------------------------------- |
| postgres    | —         | `5432`    | internal          | Not exposed by default             |
| mosquitto   | `1883`    | `1883`    | `0.0.0.0`         | Reachable from ESP32 devices on LAN|
| backend     | `8000`    | `8000`    | `0.0.0.0`         | Direct access also possible        |
| frontend    | `8080`    | `80`      | `0.0.0.0`         | nginx serves SPA + proxies `/api/`  |

---

## :arrows_counterclockwise: Startup order

The backend's `entrypoint.sh` enforces a strict boot order:

```mermaid
sequenceDiagram
  participant DC as docker compose
  participant PG as postgres
  participant MQ as mosquitto
  participant BE as backend
  participant FE as frontend

  DC->>PG: start
  PG-->>DC: pg_isready OK (healthcheck)
  DC->>MQ: start
  DC->>BE: start
  BE->>PG: TCP wait (max 60s)
  BE->>BE: alembic upgrade head
  BE->>BE: python seed_roles.py
  BE->>BE: uvicorn app.main:app
  DC->>FE: start
```

> The frontend only depends on `backend` being **started**, not healthy. If you need stricter orchestration, you can change `depends_on` to use `condition: service_healthy` and add a healthcheck to the backend Dockerfile.

---

## :factory: Production deployment

> :warning: The dev defaults **must not** be used in production. Apply the following checklist before exposing the stack to a non-trusted network.

### Pre-flight checklist

- [ ] `SECRET_KEY` is a high-entropy random string (≥ 32 chars)
- [ ] `POSTGRES_PASSWORD` is strong
- [ ] `GROQ_API_KEY` and `OPENROUTER_API_KEY` are set
- [ ] All default accounts have new passwords (or are deleted)
- [ ] CORS allowlist is restricted to your frontend origin
- [ ] MQTT broker has authentication enabled (see `security.md`)
- [ ] HTTPS is terminated in front of the frontend (Caddy / Traefik / nginx + Let's Encrypt)
- [ ] Database is backed up off-host (see below)
- [ ] `/data`, `pgdata`, and `mqttdata` are mounted on a durable volume

### Recommended topology

```mermaid
flowchart LR
  Internet --> TLS[TLS reverse proxy<br/>Caddy / Traefik]
  TLS -- "/ → :80" --> FE[frontend:8080]
  TLS -- "/api → :8000" --> BE[backend:8000]
  BE --> PG[(postgres:5432)]
  BE --> CH[(chroma: /data/chroma)]
  BE --> GQ[Groq API]
  BE --> OR[OpenRouter API]
  LAN[ESP32 sensors] -- "1883/tcp" --> MQ[(mosquitto:1883)]
  BE --> MQ
```

### Backups

Postgres data lives in the `pgdata` named volume. To snapshot it from the host:

```bash
docker run --rm \
  -v medassist_pgdata:/from \
  -v $(pwd):/to \
  alpine:3.20 tar czf /to/pgdata.tgz -C /from .
```

ChromaDB and uploaded PDFs live in the `medassist-data` volume (`/data/chroma` and `/data/uploads`).

### HTTPS (Caddy example)

A minimal `Caddyfile` in front of the stack:

```caddy
medassist.example.org {
    encode zstd gzip
    reverse_proxy localhost:8080
}
```

With this in place, drop the direct `8080` / `8000` host port mappings and let Caddy terminate TLS.

### Resource sizing

| Workload                          | Recommended VM / host                                |
| --------------------------------- | ---------------------------------------------------- |
| Demo / single-room pilot          | 2 vCPU, 2 GB RAM, 20 GB disk                        |
| Department (10–30 rooms)          | 4 vCPU, 4–8 GB RAM, 50 GB disk                      |
| Hospital-scale (multi-services)   | 8+ vCPU, 16 GB RAM, 200 GB SSD, separate DB host     |

---

## :globe_with_meridians: Internet deployment

If you want sensors on a remote site to publish directly to a cloud-hosted MedAssist AI:

1. **Put Mosquitto behind TLS** (port `8883`) with client certificates or a username/password.
2. **Expose only the frontend** (`:8080`) and the API (`:8000`) on a public hostname via a TLS-terminating reverse proxy.
3. **Restrict the MQTT port** to known ESP32 source IPs (firewall / security group).
4. **Use a private VPN / WireGuard tunnel** between the hospital LAN and the cloud if the hospital policy allows it — this is usually the most operationally simple option.
5. **Lock CORS** to your real frontend origin (currently `*`).

> :bulb: For most pilots, hosting everything in the hospital's data centre and exposing only the dashboard over HTTPS is the lowest-friction path.

---

## :arrows_counterclockwise: Updating the stack

```bash
git pull
docker compose pull                       # pull base images
docker compose build --no-cache           # rebuild local images
docker compose up -d                      # restart
```

> :information_source: The `entrypoint.sh` runs `alembic upgrade head` on every boot, so schema migrations are applied automatically.

---

## :wastebasket: Tear down

```bash
docker compose down          # stop, keep volumes
docker compose down -v       # stop, **wipe all volumes** (Postgres, Chroma, PDFs, MQTT)
```
