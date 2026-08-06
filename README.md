# MedAssist AI — Plateforme de Surveillance Hospitalière Intelligente

> Plateforme de surveillance hospitalière combinant ingestion IoT (ESP32/MQTT), base de données relationnelle, assistant IA documentaire (RAG + ChromaDB) et tableau de bord temps réel — développée dans le cadre d'un stage au **CHU Mohammed VI d'Oujda**.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Sommaire

- [Vision](#vision)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation & démarrage (Docker)](#installation--démarrage-docker)
- [Utilisation](#utilisation)
- [Configuration](#configuration)
- [Modèle de données](#modèle-de-données)
- [Structure du projet](#structure-du-projet)
- [Commandes utiles](#commandes-utiles)
- [Développement local (sans Docker)](#développement-local-sans-docker)
- [Sécurité](#sécurité)
- [Roadmap](#roadmap)
- [Contribution](#contribution)
- [Licence](#licence)
- [Contact](#contact)

---

## Vision

MedAssist AI centralise les données environnementales et physiologiques des salles hospitalières, détecte automatiquement les anomalies (température, humidité, pression, qualité de l'air) et assiste le personnel via un chatbot IA basé sur les protocoles internes.

## Fonctionnalités

**Personnel hospitalier**
- Tableau de bord temps réel par salle, avec historique et graphiques de tendances (24h / 7j / 30j)
- Gestion des alertes : visualisation, traitement, suppression
- Assistant IA (RAG) interrogeant la documentation interne en français

**Administrateurs** — en plus de ce qui précède :
- Enregistrement et gestion des capteurs ESP32 (IP, salle, statut)
- Rattachement des mesures d'IP non enregistrées à une salle
- Import de documents PDF pour enrichir la base de connaissance
- Gestion des comptes utilisateurs

**Visiteurs (patients)**
- Accès restreint au tableau de bord et à l'assistant IA uniquement

**IA explicable** — chaque alerte génère automatiquement une explication en trois volets (*Pourquoi / Risques / Action recommandée*), mise en cache 24h pour limiter les appels LLM. Le système refuse explicitement d'inventer des informations médicales.

## Stack technique

| Couche            | Technologie                                          |
| ----------------- | ---------------------------------------------------- |
| Frontend          | React 18, Vite, TypeScript, Tailwind CSS, Recharts  |
| Backend           | Python 3.11, FastAPI 0.111, SQLAlchemy 2, Alembic    |
| Base de données   | PostgreSQL 16                                        |
| Broker IoT        | Eclipse Mosquitto 2                                  |
| Vector store      | ChromaDB                                             |
| LLM               | Groq (`llama-3.3-70b-versatile`)                     |
| Embeddings        | OpenRouter (`nvidia/llama-nemotron-embed-vl-1b-v2`)  |
| Firmware          | Arduino / ESP32 (DHT11)                              |
| Orchestration     | Docker Compose                                       |

## Architecture

Les conteneurs Docker forment un réseau privé `medassist` :

```
┌─────────────┐        ┌─────────────┐
│   ESP32     │──MQTT──▶  Mosquitto  │ :1883
└─────────────┘        └──────┬──────┘
                              │
                              ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  Frontend   │──HTTP──▶   Backend   │──SQL──▶│  PostgreSQL │
│   (nginx)   │ :8080    (FastAPI)   │        │     :5432   │
└─────────────┘ :8000     └────┬──────┘        └─────────────┘
                               │
                        ┌──────┴──────┐
                        │  ChromaDB   │  (vector store RAG)
                        └─────────────┘
```

## Prérequis

- **Docker** ≥ 24 et **Docker Compose** v2
- 2 Go de RAM disponibles pour l'ensemble des conteneurs
- Ports hôtes libres : `1883` (MQTT), `8000` (API), `8080` (UI)

## Installation & démarrage (Docker)

```bash
# 1. Cloner le dépôt
git clone https://github.com/t4lhawi/MedAssist-AI.git
cd medassist

# 2. Copier le modèle d'environnement et renseigner les secrets
cp .env.example .env
# Éditer : POSTGRES_PASSWORD, SECRET_KEY, GROQ_API_KEY, OPENROUTER_API_KEY

# 3. Construire les images et démarrer tous les services
docker compose up -d --build
```

L'entrypoint du backend attend Postgres, applique les migrations Alembic, crée les comptes par défaut, puis démarre Uvicorn.

| Service     | URL                                          |
| ----------- | -------------------------------------------- |
| Application | http://localhost:8080                        |
| API / Swagger | http://localhost:8000/docs                  |
| Health check | http://localhost:8000/health                |
| Broker MQTT | `mqtt://localhost:1883`                      |

### Comptes par défaut (dev)

| Rôle             | Email                 | Mot de passe      |
| ---------------- | --------------------- | ----------------- |
| admin            | admin@chuoujda.ma     | `Admin@2026!`     |
| hospital_staff   | staff@chuoujda.ma     | `Staff@2026!`     |
| visitor          | visitor@chuoujda.ma   | `Visitor@2026!`   |

> ⚠️ À changer immédiatement avant déploiement en production.

## Utilisation

### 1. Tableau de bord

Ouvrir http://localhost:8080, se connecter avec un compte de test, puis sélectionner une salle dans la barre latérale. Les graphiques sont alimentés par le flux temps réel `/api/realtime/ws?token=<JWT>`.

### 2. Authentification API

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chuoujda.ma","password":"Admin@2026!"}' \
  | jq -r .access_token)
```

### 3. Interroger l'assistant IA

```bash
curl -X POST http://localhost:8000/api/chat/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Quelle est la plage normale de température ?","historique":[]}'
```

### 4. Enregistrer un capteur ESP32 (admin)

```bash
curl -X POST http://localhost:8000/api/admin/esp32/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.50","salle":"salle-1","statut":"actif"}'
```

### 5. Indexer un PDF pour le RAG

```bash
curl -X POST http://localhost:8000/api/documents/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@protocole_temperature.pdf"
```

### 6. ESP32 → MQTT

Le firmware `firmware/firmware.ino` publie toutes les 3 secondes sur `medassist/salle/<salle>/<type>` :

```json
{ "ip": "192.168.1.50", "type": "temperature", "valeur": 22.4, "unite": "°C" }
```

Si l'IP correspond à un capteur enregistré, la mesure est rattachée à la salle et peut déclencher une alerte. Sinon, elle reste en attente de validation par un administrateur — aucune donnée n'est perdue.

## Configuration

Toutes les variables sont centralisées dans `.env` (voir `.env.example` pour le modèle).

### Variables principales

| Variable                  | Description                                                 | Exemple                                            |
| ------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `POSTGRES_DB`             | Nom de la base PostgreSQL                                   | `medassist`                                        |
| `POSTGRES_USER`           | Utilisateur PostgreSQL                                      | `postgres`                                         |
| `POSTGRES_PASSWORD`       | Mot de passe PostgreSQL                                     | `change-me`                                        |
| `DATABASE_URL`            | URL SQLAlchemy complète                                     | `postgresql://postgres:change-me@postgres:5432/medassist` |
| `SECRET_KEY`              | Clé HMAC pour signer les JWT (32+ caractères)               | `change-me-to-a-long-random-string`                |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée de vie du JWT                                     | `60`                                               |
| `GROQ_API_KEY`            | Clé API Groq (inférence LLM)                                | `gsk_...`                                          |
| `LLM_MODEL`               | Modèle Groq utilisé                                         | `llama-3.3-70b-versatile`                          |
| `OPENROUTER_API_KEY`      | Clé API OpenRouter (embeddings)                             | `sk-or-v1-...`                                     |
| `EMBEDDING_MODEL`         | Modèle d'embedding                                          | `nvidia/llama-nemotron-embed-vl-1b-v2:free`         |
| `CHROMA_PATH`             | Chemin du vector store                                      | `/data/chroma`                                     |
| `UPLOAD_DIR`              | Dossier d'upload des PDFs                                   | `/data/uploads`                                    |
| `MQTT_HOST`               | Hôte du broker Mosquitto                                    | `mosquitto`                                        |
| `MQTT_PORT`               | Port MQTT                                                   | `1883`                                             |
| `MQTT_TOPIC_PREFIX`       | Préfixe des topics                                          | `medassist/salle`                                  |
| `RAG_RETRIEVAL_K`         | Nombre de chunks récupérés par requête                      | `4`                                                |
| `RAG_HISTORY_MESSAGES`    | Fenêtre d'historique injectée dans le prompt                | `4`                                                |

### Ports et volumes (docker-compose)

| Service   | Port hôte | Volume hôte          | Cible conteneur          |
| --------- | --------- | -------------------- | ------------------------ |
| postgres  | —         | `pgdata`             | `/var/lib/postgresql/data` |
| mosquitto | `1883`    | `mqttdata`           | `/mosquitto/data`        |
| backend   | `8000`    | `medassist-data`     | `/data`                  |
| frontend  | `8080`    | —                    | nginx `/usr/share/nginx/html` |

### Seuils d'alerte par défaut

| Type              | Min   | Max   |
| ----------------- | ----- | ----- |
| Température       | 18 °C | 26 °C |
| Humidité          | 30 %  | 70 %  |
| Pression          | 950 hPa | 1050 hPa |
| Qualité de l'air  | —     | 1000 ppm |

Une valeur `> max` déclenche une alerte *attention* ; au-delà de `max × 1.10`, elle passe *critique*.

## Modèle de données

- **utilisateurs** — comptes et rôles (`admin`, `hospital_staff`, `visitor`)
- **esp32_devices** — capteurs enregistrés (IP, salle, statut)
- **mesures** — relevés horodatés (température, humidité, pression, qualité de l'air)
- **alertes** — anomalies détectées, avec explication IA mise en cache
- **documents** — PDF indexés pour le RAG
- **conversations** — historique de l'assistant IA

Les migrations sont versionnées avec **Alembic** (`backend/alembic/versions`).

## Structure du projet

```
medassist/
├── backend/                  # API FastAPI
│   ├── app/
│   │   ├── routers/          # auth, capteurs, mesures, alertes, chat, ...
│   │   ├── rag/pipeline.py   # chaîne RAG (ChromaDB + Groq)
│   │   ├── mqtt_client.py    # ingestion MQTT
│   │   ├── realtime.py       # WebSocket live stream
│   │   ├── models.py         # ORM SQLAlchemy
│   │   └── main.py           # point d'entrée FastAPI
│   ├── alembic/              # migrations
│   ├── seed_roles.py         # comptes par défaut
│   ├── Dockerfile            # image multi-stage python:3.11-slim
│   ├── entrypoint.sh         # wait DB → migrate → seed → uvicorn
│   └── requirements.txt
├── frontend/                 # SPA React
│   ├── src/                  # pages, components, services, hooks
│   ├── Dockerfile            # multi-stage node → nginx
│   ├── nginx.conf            # proxy /api → backend:8000
│   └── package.json
├── firmware/
│   └── firmware.ino          # croquis Arduino ESP32 (DHT11)
├── docker-compose.yml        # 4 services : postgres, mosquitto, backend, frontend
├── .env.example              # modèle d'environnement
└── README.md
```

## Commandes utiles

```bash
# Cycle de vie
docker compose up -d --build         # démarrer / reconstruire
docker compose down                  # arrêter (conserve les volumes)
docker compose down -v               # arrêter et purger les volumes

# Inspection
docker compose ps                    # état des services
docker compose logs -f backend       # logs en direct du backend
docker compose logs -f mosquitto     # logs MQTT
docker compose exec backend bash     # shell dans le conteneur backend

# Maintenance
docker compose exec backend alembic upgrade head                 # migrations
docker compose exec backend alembic revision --autogenerate -m "..."  # nouvelle migration
docker compose exec backend python seed_roles.py                 # (re)créer les comptes par défaut

# Observer le bus MQTT depuis l'hôte
mosquitto_sub -h localhost -t 'medassist/salle/#' -v

# Reconstruire un seul service
docker compose build backend
docker compose up -d backend
```

### Scripts npm (frontend)

```bash
cd frontend
npm run dev       # serveur de dev Vite (http://localhost:5173)
npm run build     # build de production → dist/
npm run preview   # prévisualisation du bundle
```

## Développement local (sans Docker)

Backend :

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # ou .venv\Scripts\activate sous Windows
pip install -r requirements.txt
# démarrer manuellement Postgres + Mosquitto, puis :
alembic upgrade head
python seed_roles.py
uvicorn app.main:app --reload
```

Frontend :

```bash
cd frontend
npm install
npm run dev                                              # http://localhost:5173
```

> Sous Windows, `venv/` et `.venv/` sont déjà créés à la racine — activer celui qui correspond à votre shell.

## Sécurité

| Domaine         | État actuel                         | Avant production                          |
| --------------- | ----------------------------------- | ----------------------------------------- |
| JWT             | HS256, expiration 60 min            | RS256 + rotation des clés                 |
| Mots de passe   | SHA-256 + bcrypt                    | Politique de complexité                   |
| CORS            | Ouvert (`*`)                        | Restreindre aux origines connues          |
| MQTT            | Sans authentification               | Activer l'auth Mosquitto                  |
| HTTPS           | Non activé                          | Reverse-proxy (Caddy / Traefik)           |
| Secrets         | Présents dans `.env` du dépôt (dev) | Externaliser (Vault, AWS Secrets, etc.)   |

## Roadmap

- HTTPS et SSO (Keycloak)
- Notifications push mobiles
- Support multi-établissement
- Capteurs additionnels (CO₂, particules fines)
- Tableaux de bord Grafana long terme
- Internationalisation (FR / AR / EN)

## Contribution

Ce projet a été réalisé dans un cadre pédagogique. Pour proposer une amélioration :

1. Forker le dépôt
2. Créer une branche : `git checkout -b feature/ma-fonctionnalite`
3. Commiter : `git commit -m "feat: courte description"`
4. Pousser : `git push origin feature/ma-fonctionnalite`
5. Ouvrir une Pull Request

Aucune directive CONTRIBUTING.md formelle n'est publiée — merci de garder les commits atomiques et de décrire clairement les changements.

## Licence

Projet sous licence **MIT** — voir le fichier [LICENSE](LICENSE).

```
MIT License
Copyright (c) 2026 Mohamed Talhaoui
```

## Contact

- Documentation Swagger interactive : http://localhost:8000/docs
- Email : t4lhawi@gmail.com
- Auteur : [Mohamed Talhaoui](https://github.com/t4lhawi)

---

<p align="center">Projet de stage réalisé pour le <strong>CHU Mohammed VI d'Oujda</strong> · 2026</p>
