# MedAssist AI

Plateforme d'assistance médicale pour hôpital (CHU) : backend FastAPI + RAG (Chroma), frontend React/Vite, ingestion MQTT depuis un capteur ESP32, le tout orchestré par Docker Compose.

## Stack

| Couche           | Tech                                              |
| ---------------- | ------------------------------------------------- |
| Frontend         | React 18 · Vite · Tailwind · nginx (SPA + proxy)  |
| Backend          | FastAPI · SQLAlchemy · Alembic · paho-mqtt        |
| Vector store     | ChromaDB (persistant sur volume)                  |
| LLM              | **Groq** (`llama-3.3-70b-versatile`)              |
| Embeddings       | **OpenRouter** (`nvidia/llama-nemotron-embed-vl-1b-v2:free`) |
| BDD relationnelle| PostgreSQL 16                                     |
| Bus IoT          | Eclipse Mosquitto 2                               |
| Firmware         | `firmware/firmware.ino` (Arduino/ESP32)           |

## Démarrage rapide (Docker)

Prérequis : Docker ≥ 24 et Docker Compose v2.

```bash
# 1. Stack complète (Postgres, Mosquitto, backend, frontend)
docker compose up -d --build

# 2. Suivre les logs du backend (migrations + seed admin + uvicorn)
docker compose logs -f backend
```

L'application est alors disponible sur :

- **App** : http://localhost:8080
- **API** : http://localhost:8000/docs (Swagger UI)

> LLM et embeddings sont **SaaS** (Groq + OpenRouter) — aucune clé locale à tirer, juste `GROQ_API_KEY` et `OPENROUTER_API_KEY` dans `.env`.

### Comptes seed (créés par `backend/entrypoint.sh`)

| Rôle            | Email                  | Mot de passe |
| --------------- | ---------------------- | ------------ |
| admin           | admin@chuoujda.ma      | `Admin@2026!`  |
| hospital\_staff | staff@chuoujda.ma      | `Staff@2026!`  |
| visitor         | visitor@chuoujda.ma    | `Visitor@2026!`|

### Commandes utiles

```bash
docker compose ps                 # état des services
docker compose logs -f backend    # logs temps réel
docker compose exec backend bash  # shell dans le conteneur backend
docker compose down               # arrêt (conserve les volumes)
docker compose down -v            # arrêt + purge des volumes (reset complet)
```

### Persistance

Trois volumes nommés survivent aux redémarrages :

- `pgdata` — base PostgreSQL
- `mqttdata` — retained messages Mosquitto
- `medassist-data` — ChromaDB (`/data/chroma`) et uploads (`/data/uploads`)

## Configuration

Toute la configuration vit dans le `.env` à la racine. Pour passer en production, changer au minimum :

- `SECRET_KEY` (regénérer)
- `POSTGRES_PASSWORD`
- `GROQ_API_KEY` et `OPENROUTER_API_KEY`

## Développement sans Docker

Voir `backend/requirements.txt` et `frontend/package.json`. Les services Postgres et Mosquitto doivent alors tourner sur l'hôte (ou via Docker, sans les services `backend` / `frontend`) et le `.env` est à adapter sur `localhost`.

## Structure du repo

```
.
├── backend/           # FastAPI + Alembic + RAG + MQTT client
│   ├── app/           # modèles, routes, schemas, RAG
│   ├── alembic/       # migrations versionnées
│   ├── entrypoint.sh  # attend Postgres → migrations → seed → uvicorn
│   └── requirements.txt
├── frontend/          # SPA React/Vite servie par nginx
│   ├── src/
│   ├── nginx.conf     # proxy /api/ → http://backend:8000
│   └── package.json
├── firmware/          # firmware.ino (capteur ESP32 → MQTT)
├── docker-compose.yml # 4 services : postgres, mosquitto, backend, frontend
├── .env               # vars partagées par tous les services (root context)
└── .dockerignore
```

## Licence

Voir `LICENSE`.