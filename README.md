# MedAssist AI — Plateforme de Surveillance Hospitalière Intelligente

> **MedAssist AI** est une plateforme complète de surveillance hospitalière qui combine **ingestion de capteurs IoT** (ESP32/MQTT), **base de données relationnelle** (PostgreSQL), **recherche documentaire augmentée par IA** (RAG + ChromaDB) et **interface web temps réel** (React/Vite) pour assister le personnel du **CHU Mohammed VI d'Oujda**.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.4-FF6B6B)](https://www.trychroma.com/)
[![MQTT](https://img.shields.io/badge/MQTT-Mosquitto_2-660066?logo=mqtt)](https://mosquitto.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Proprietary-orange)](LICENSE)

---

## 📑 Sommaire

- [🎯 Vision & Objectifs](#-vision--objectifs)
- [✨ Fonctionnalités principales](#-fonctionnalités-principales)
- [🏗️ Architecture](#️-architecture)
- [🧰 Stack technique](#-stack-technique)
- [📂 Structure du projet](#-structure-du-projet)
- [⚡ Démarrage rapide (Docker)](#-démarrage-rapide-docker)
- [🔧 Configuration](#-configuration)
- [🗄️ Modèle de données](#️-modèle-de-données)
- [🔌 API REST](#-api-rest)
- [🔐 Authentification & Rôles](#-authentification--rôles)
- [🤖 Pipeline IA / RAG](#-pipeline-ia--rag)
- [📡 Ingestion IoT (MQTT)](#-ingestion-iot-mqtt)
- [🔌 Firmware ESP32](#-firmware-esp32)
- [🖥️ Frontend](#️-frontend)
- [📊 Tableau de bord temps réel](#-tableau-de-bord-temps-réel)
- [👤 Comptes par défaut](#-comptes-par-défaut)
- [🔧 Commandes utiles](#-commandes-utiles)
- [💾 Persistance & Volumes](#-persistance--volumes)
- [🛠️ Développement local sans Docker](#️-développement-local-sans-docker)
- [🚨 Dépannage](#-dépannage)
- [🛡️ Sécurité](#️-sécurité)
- [🗺️ Roadmap](#️-roadmap)
- [📜 Licence](#-licence)

---

## 🎯 Vision & Objectifs

MedAssist AI a pour ambition de **doter les établissements hospitaliers** d'une solution clé-en-main pour :

1. **Centraliser** les mesures environnementales et physiologiques provenant de capteurs IoT déployés dans les salles.
2. **Détecter automatiquement** les situations hors-normes (température, humidité, pression, qualité de l'air) et générer des **alertes explicables**.
3. **Augmenter la connaissance** du personnel via un **assistant IA conversationnel** s'appuyant sur les protocoles internes indexés (PDF).
4. **Administrer** simplement le parc de capteurs ESP32, avec appairage IP/salle et bascule rapide entre l'état *enregistré* et *non-enregistré*.

---

## ✨ Fonctionnalités principales

### 🩺 Pour le personnel hospitalier (`hospital_staff`)
- **Tableau de bord temps réel** : grille de toutes les salles avec leur état (`active` / `offline` / `not_installed`), dernière mesure de chaque capteur (température, humidité, pression, qualité de l'air) et étiquette *il y a X min*.
- **Graphiques de tendances** (Recharts) sur 24h / 7j / 30j par type de capteur.
- **Gestion des alertes** : visualiser, marquer comme traitées, supprimer en masse.
- **Assistant IA (RAG)** : interroger en français la base documentaire indexée.
- **Bibliothèque de documents** : lister, télécharger, supprimer des PDF.

### 🛠️ Pour les administrateurs (`admin`)
- Tout ce que peut faire `hospital_staff`, **plus** :
  - **Enregistrer / modifier / supprimer des ESP32** (par IP, salle, note interne, actif/inactif).
  - **Réclamer des IP non-enregistrées** : les mesures déjà collectées sont alors rattachées à la bonne salle en une opération atomique.
  - **Téléverser des PDF** pour enrichir le RAG (indexation automatique asynchrone).
  - **Gérer les utilisateurs** (promotion de rôle, activation/désactivation).

### 🌐 Pour les visiteurs (`visitor`)
- Vue **restreinte** du tableau de bord (sans métriques sensibles).
- Accès à l'**Assistant IA** uniquement (cas d'usage : patient qui interroge ses données via le chat).
- Pas d'accès aux alertes, ni aux documents.

### 🤖 IA explicable
- Chaque alerte **génère automatiquement** une explication en 3 sections (**Pourquoi** / **Risques** / **Action recommandée**).
- **Cache d'explications** : pour éviter des appels LLM redondants, les alertes du même couple `(type, niveau)` partagent leur explication pendant **24h**.
- Le modèle refuse explicitement d'**inventer** des informations médicales.

### 📡 IoT de bout en bout
- **ESP32 → Mosquitto (MQTT 1883) → Backend FastAPI → PostgreSQL** : ingestion automatique des mesures émises toutes les 3 secondes par les capteurs DHT11 (température + humidité), avec gestion d'autres capteurs (BMP280 pour la pression, SGP40 pour la qualité de l'air) prêts à être câblés.

### 📡 Diffusion temps réel
- **WebSocket** `/api/realtime/ws` : pousse instantanément chaque nouvelle mesure et chaque nouvelle alerte aux dashboards ouverts, avec **reconnexion exponentielle** côté client (1s → 5s max) et **heartbeat** toutes les 25s.

---

## 🏗️ Architecture

```
                ┌───────────────────────────────────────────────┐
                │              Capteurs IoT (LAN)               │
                │   ┌─────────┐  ┌─────────┐  ┌─────────┐     │
                │   │ ESP32-1 │  │ ESP32-2 │  │ ESP32-N │     │
                │   │ DHT11   │  │  BMP280 │  │  SGP40  │     │
                │   └────┬────┘  └────┬────┘  └────┬────┘     │
                └────────┼────────────┼────────────┼───────────┘
                         │            │            │
                  MQTT 1883 (publishers anonymes, sans auth)
                         │            │            │
                         ▼            ▼            ▼
                ┌───────────────────────────────────────────────┐
                │           Mosquitto 2 (broker MQTT)           │
                │       mqttdata volume (retained)              │
                └────────────────────────┬──────────────────────┘
                                         │ subscribe medassist/salle/+/+
                                         ▼
        ┌────────────────────────────────────────────────────────────────┐
        │                     FastAPI Backend                            │
        │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐   │
        │  │   MqttIngest     │→ │  CRUD + Models   │→ │  SQLAlchemy │   │
        │  │   Client         │  │  (PostgreSQL)    │  │             │   │
        │  └──────────────────┘  └──────────────────┘  └─────┬──────┘   │
        │           │                       │                  │         │
        │           │           ┌───────────▼─────────┐        │         │
        │           │           │   Realtime Bus      │        │         │
        │           │           │  (asyncio.Queue +   │        │         │
        │           │           │   loop.call_soon…)  │        │         │
        │           │           └───────────┬─────────┘        │         │
        │           │                       │                  │         │
        │           │                       ▼                  ▼         │
        │  ┌────────▼─────────┐   ┌──────────────────┐  ┌────────────┐   │
        │  │  WebSocket       │   │  RAG Pipeline    │  │   pgdata   │   │
        │  │  /api/realtime/ws│   │  ChromaDB + Groq │  │  volume    │   │
        │  └────────┬─────────┘   └──────────────────┘  └────────────┘   │
        └───────────┼────────────────────────────────────────────────────┘
                    │                                ▲
                    │                                │ REST (axios)
                    ▼                                │
        ┌───────────────────────────────────────────────┐
        │           React SPA + nginx (proxy /api)      │
        │   Dashboard · Admin Salles · Alertes ·         │
        │   Documents · Assistant IA · Profile          │
        └───────────────────────────────────────────────┘

   ─ Volumes persistants ─
   • pgdata            → /var/lib/postgresql/data
   • mqttdata          → /mosquitto/data
   • medassist-data    → /data/chroma + /data/uploads
```

---

## 🧰 Stack technique

| Couche                | Technologies                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Frontend**          | React 18 · Vite 7 · TypeScript · Tailwind CSS 3 · Recharts · Axios · React Router 6           |
| **Serveur statique**  | nginx 1.27 (SPA fallback + reverse proxy `/api/` + upgrade WebSocket)                          |
| **Backend**           | Python 3.11 · FastAPI 0.111 · Uvicorn 0.29 · SQLAlchemy 2 · Pydantic 2                       |
| **Migrations**        | Alembic 1.13 (versions versionnées du schéma)                                                 |
| **Auth**              | JWT (HS256 via python-jose) + bcrypt (SHA-256 → bcrypt)                                       |
| **Base relationnelle**| PostgreSQL 16 (Alpine)                                                                        |
| **Broker IoT**        | Eclipse Mosquitto 2 (sans authentification pour usage LAN hospitalier)                        |
| **Vector store**      | ChromaDB 0.4 (persisté sur `/data/chroma`)                                                    |
| **LLM**               | **Groq** · modèle `llama-3.3-70b-versatile` (API compatible OpenAI, base_url custom)          |
| **Embeddings**        | **OpenRouter** · modèle `nvidia/llama-nemotron-embed-vl-1b-v2:free`                           |
| **RAG pipeline**      | LangChain 0.2 + langchain-community 0.2 + langchain-openai 0.1.7 + langchain-groq 0.1.9       |
| **PDF parsing**       | pypdf 4.2 + RecursiveCharacterTextSplitter (chunk 800, overlap 100)                          |
| **MQTT client**       | paho-mqtt 2.1 (compatible 1.x et 2.x)                                                         |
| **Firmware**          | Arduino (.ino) — ESP32 + DHT11 + JSON + PubSubClient                                         |
| **Orchestration**     | Docker Compose v2 (réseau bridge `medassist`, 3 volumes nommés)                              |

---

## 📂 Structure du projet

```
medassist/
├── backend/                                # FastAPI + SQLAlchemy + RAG + MQTT
│   ├── app/                                # Code applicatif
│   │   ├── __init__.py
│   │   ├── main.py                         # Entrypoint FastAPI (lifespan, routers)
│   │   ├── config.py                       # Settings (Pydantic) + résolution paths
│   │   ├── database.py                     # engine, SessionLocal, get_db
│   │   ├── models.py                       # ORM (utilisateurs, esp32_devices, mesures, alertes…)
│   │   ├── schemas.py                      # Schémas Pydantic + validators
│   │   ├── crud.py                         # Logique métier (seuils, cache explications, agrégations)
│   │   ├── auth.py                         # JWT + bcrypt + dépendances de rôle
│   │   ├── mqtt_client.py                  # Ingestion temps réel depuis Mosquitto
│   │   ├── realtime.py                     # Bus pub/sub asyncio pour WebSocket
│   │   ├── routers/                        # Routeurs FastAPI
│   │   │   ├── auth.py
│   │   │   ├── capteurs.py                 # Legacy
│   │   │   ├── mesures.py
│   │   │   ├── alertes.py
│   │   │   ├── documents.py
│   │   │   ├── chat.py
│   │   │   ├── admin_esp32.py              # CRUD ESP32 + salles-status + claim IP
│   │   │   └── realtime.py                 # WebSocket /api/realtime/ws
│   │   └── rag/
│   │       └── pipeline.py                 # Chunking, indexation PDF, retrieval, prompt Groq
│   ├── alembic/                            # Migrations versionnées
│   │   ├── env.py
│   │   └── versions/
│   │       ├── 0001_initial_post_refactor.py
│   │       ├── 0002_add_alerte_explication.py
│   │       └── 0003_rename_roles.py
│   ├── chroma_db/                          # ⚠️ créé au runtime (volume)
│   ├── uploads/                            # ⚠️ créé au runtime (volume)
│   ├── conversations.db                    # ⚠️ SQLite de debug (optionnel)
│   ├── seed_roles.py                       # Seed idempotent des 3 comptes par défaut
│   ├── entrypoint.sh                       # wait Postgres → alembic → seed → uvicorn
│   ├── requirements.txt
│   ├── Dockerfile                          # multi-stage builder → runtime slim
│   ├── .env                                # Variables d'env backend (optionnel)
│   └── .dockerignore
│
├── frontend/                               # SPA React + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx                         # Routes + layout 3 colonnes
│   │   ├── main.tsx                        # Entrypoint React
│   │   ├── index.css                       # Tailwind + thème (light/dark)
│   │   ├── components/
│   │   │   ├── Admin/                      # AdminSallesPage fragments
│   │   │   ├── Alerts/                     # Cartes d'alerte
│   │   │   ├── Auth/                       # LoginPage, RequireAuth
│   │   │   ├── Charts/                     # Wrappers Recharts
│   │   │   ├── Chat/                       # ChatInterface (Markdown, sessionStorage)
│   │   │   ├── Dashboard/                  # Navbar, Sidebar
│   │   │   ├── Documents/                  # Upload + liste PDF
│   │   │   ├── Sensors/                    # Cartes de capteurs
│   │   │   └── ui/                         # Boutons, modales, …
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   └── LiveSocketContext.tsx
│   │   ├── hooks/
│   │   │   └── usePermissions.ts
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx           # Grille de salles
│   │   │   ├── AdminSallesPage.tsx         # CRUD ESP32 + salles-status
│   │   │   ├── AlertesPage.tsx
│   │   │   ├── DocumentsPage.tsx
│   │   │   ├── AssistantPage.tsx           # Chat IA (Markdown)
│   │   │   ├── CapteursPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── services/
│   │   │   ├── api.ts                      # axios + intercepteurs
│   │   │   └── realtime.ts                 # LiveSocket (WS + backoff)
│   │   ├── lib/, types/, utils/, styles/   # Helpers partagés
│   │   └── monitoring.ts                   # Sentry / logs front
│   ├── public/
│   ├── index.html                          # Flash-theme (anti-FOUC)
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts                      # Dev: proxy /api → :8000
│   ├── tailwind.config.js                  # Tokens sémantiques (light/dark)
│   ├── postcss.config.js
│   ├── Dockerfile                          # multi-stage node:20 → nginx:1.27
│   ├── nginx.conf                          # SPA + proxy /api/ + WS upgrade
│   └── .dockerignore
│
├── firmware/                               # Arduino / ESP32
│   └── firmware.ino                        # DHT11 + Wi-Fi + MQTT publish 3s
│
├── docker-compose.yml                      # 4 services (postgres, mosquitto, backend, frontend)
├── .env                                    # ⚠️ Variables partagées (NE PAS COMMITER les secrets)
├── .env.example                            # Template sans secrets
├── .dockerignore
├── LICENSE
└── README.md                               # ← ce fichier
```

---

## ⚡ Démarrage rapide (Docker)

### Prérequis
- **Docker ≥ 24** (avec Compose v2 intégré)
- **2 Go** de RAM disponibles (Postgres + Chroma + LLM calls)
- Ports hôtes libres : **8000** (API), **8080** (SPA), **1883** (MQTT), **5432** (Postgres, exposé si debug)

### 1. Configuration initiale

```bash
# Cloner le dépôt
git clone https://github.com/votre-org/medassist.git
cd medassist

# Éditer le fichier .env à la racine (les clés Groq + OpenRouter sont déjà
# injectées dans le dépôt pour le dev — à remplacer pour la production)
# Variables importantes à personnaliser :
#   SECRET_KEY           → regénérer (au moins 32 caractères random)
#   POSTGRES_PASSWORD    → changer
#   GROQ_API_KEY         → votre clé Groq
#   OPENROUTER_API_KEY   → votre clé OpenRouter

cp .env.example .env  # si un template est fourni
```

### 2. Lancer la stack complète

```bash
docker compose up -d --build
```

Docker Compose va :
1. Construire l'image **backend** (multi-stage Python 3.11 slim).
2. Construire l'image **frontend** (multi-stage Node 20 → nginx 1.27).
3. Démarrer **postgres:16-alpine** et attendre le `pg_isready`.
4. Démarrer **eclipse-mosquitto:2**.
5. Démarrer **backend** qui :
   - attend Postgres (jusqu'à 60s),
   - applique les migrations Alembic (`alembic upgrade head`),
   - seed les 3 utilisateurs par défaut,
   - démarre Uvicorn sur `0.0.0.0:8000`.
6. Démarrer **frontend** sur `:80` (mappé sur `:8080`).

### 3. Suivre la convergence

```bash
docker compose logs -f backend
```

Vous devriez voir :
```
[entrypoint] Postgres joignable.
[entrypoint] Application des migrations Alembic...
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Running upgrade  -> 0001_initial_post_refactor, ...
[entrypoint] Création des utilisateurs de départ (si absents)...
[OK]   admin@chuoujda.ma             admin           password=Admin@2026!
[OK]   staff@chuoujda.ma             hospital_staff  password=Staff@2026!
[OK]   visitor@chuoujda.ma           visitor         password=Visitor@2026!
[entrypoint] Démarrage d'Uvicorn sur 0.0.0.0:8000...
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     MQTT client démarré (broker=mosquitto:1883, abonnement=medassist/salle/+/+)
```

### 4. Ouvrir l'application

| Service       | URL                                  | Description                                |
| ------------- | ------------------------------------ | ------------------------------------------ |
| **App web**   | http://localhost:8080                | Interface utilisateur (SPA + nginx)        |
| **API REST**  | http://localhost:8000/docs           | Documentation Swagger interactive          |
| **Health**    | http://localhost:8000/health         | `{"status":"ok"}`                          |
| **Root**      | http://localhost:8000/               | `{"message":"MedAssist AI est opérationnel"}` |
| **Broker**    | `mqtt://localhost:1883`              | MQTT pour ESP32 et outils (`mosquitto_sub`) |

---

## 🔧 Configuration

Toute la configuration vit dans `.env` à la racine (lu par `env_file:` dans Compose). Les variables clés :

```dotenv
# ── Base de données Postgres ─────────────
POSTGRES_DB=medassist
POSTGRES_USER=postgres
POSTGRES_PASSWORD=admin                  # ⚠️ changer pour la production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:admin@postgres:5432/medassist

# ── Sécurité JWT ─────────────────────────
SECRET_KEY=                              # 32+ caractères random (obligatoire en prod)
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ── LLM : Groq ───────────────────────────
GROQ_API_KEY=gsk_...
LLM_MODEL=llama-3.3-70b-versatile
LLM_MAX_TOKENS=256
LLM_TIMEOUT_SECONDS=60

# ── Embeddings : OpenRouter ───────────────
OPENROUTER_API_KEY=sk-or-v1-...
EMBEDDING_MODEL=nvidia/llama-nemotron-embed-vl-1b-v2:free

# ── RAG ──────────────────────────────────
RAG_RETRIEVAL_K=4                        # nb de chunks retournés par similarité
RAG_HISTORY_MESSAGES=4                   # nb de messages passés gardés en contexte

CHROMA_PATH=/data/chroma                 # persisté sur volume `medassist-data`
UPLOAD_DIR=/data/uploads                 # persisté sur volume `medassist-data`

# ── MQTT ─────────────────────────────────
MQTT_HOST=mosquitto                      # ⚠️ = nom du service Compose
MQTT_PORT=1883
MQTT_TOPIC_PREFIX=medassist/salle        # préfixe des topics écoutés par le backend
MQTT_CLIENT_ID=medassist-backend
MQTT_USERNAME=                           # vide = anonyme (LAN hospitalier)
MQTT_PASSWORD=
MQTT_KEEPALIVE=30
```

**Pour la production**, changez au minimum :
1. `SECRET_KEY` → regénérer avec `openssl rand -hex 32`.
2. `POSTGRES_PASSWORD` → mot de passe robuste.
3. `GROQ_API_KEY` et `OPENROUTER_API_KEY` → vos propres clés.
4. Activez HTTPS via un reverse-proxy (Caddy, Traefik, etc.) en amont.

---

## 🗄️ Modèle de données

```
┌──────────────────────┐         ┌──────────────────────────┐
│     utilisateurs     │         │        documents         │
├──────────────────────┤         ├──────────────────────────┤
│ id (PK)              │         │ id (PK)                  │
│ nom                  │         │ nom                      │
│ email (UNIQUE)       │         │ chemin                   │
│ mdp_hash             │         │ taille                   │
│ role                 │         │ indexe                   │
│ actif                │         │ uploade_par (FK → users) │
│ cree_le              │         │ uploade_le               │
└──────────┬───────────┘         └──────────────────────────┘
           │
           │ upload
           ▼
   documents / conversations

┌──────────────────────┐         ┌──────────────────────────┐
│      esp32_devices   │ 1     * │        mesures           │
├──────────────────────┤─────────├──────────────────────────┤
│ id (PK)              │         │ id (PK)                  │
│ ip (UNIQUE)          │         │ esp32_id (FK)            │
│ salle                │         │ type (temperature/…)     │
│ note                 │         │ source_ip                │
│ actif                │         │ topic_salle              │
│ cree_le              │         │ valeur                   │
│ derniere_mesure_le   │         │ unite                    │
└──────────┬───────────┘         │ timestamp                │
           │                     │ INDEX(esp32_id, type,    │
           │                     │       timestamp)         │
       *   │ mesures             └──────────┬───────────────┘
           │ alertes                        │
           ▼                                ▼
┌──────────────────────┐         ┌──────────────────────────┐
│       alertes        │ *     1 │        mesures           │
├──────────────────────┤─────────├──────────────────────────┤
│ id (PK)              │         └──────────────────────────┘
│ esp32_id (FK)        │
│ mesure_id (FK)       │    ← aussi lié via mesure → esp32
│ niveau (info/        │
│    attention/        │
│    critique)         │
│ type                 │
│ message              │
│ traitee              │
│ cree_le              │
│ explication          │  ← générée par Groq, cachée 24h
│ explication_cree_le  │
└──────────────────────┘

┌──────────────────────┐
│     conversations    │
├──────────────────────┤
│ id (PK)              │
│ utilisateur_id (FK)  │
│ question             │
│ reponse              │
│ sources (JSON)       │
│ cree_le              │
└──────────────────────┘
```

### Seuils d'alerte par défaut (`crud.SEUILS`)

| Type        | Min     | Max     | Niveau "critique" si |
| ----------- | ------- | ------- | -------------------- |
| temperature | 18 °C   | 26 °C   | > max × 1.10         |
| humidite    | 30 %    | 70 %    | > max × 1.10         |
| pression    | 950 hPa | 1050 hPa| > max × 1.10         |
| qualite_air | —       | 1000 ppm| > max × 1.10         |

> Une mesure `> max` → **attention** ; `> max × 1.10` → **critique**. Une mesure `< min` → **attention** systématique.

### Rétention
- **Alertes** : purgées automatiquement par un sweeper toutes les heures si plus de **24h** *et* non traitées (`crud.purge_old_alertes`).
- **Mesures & documents** : conservés indéfiniment (à purger manuellement si besoin).

---

## 🔌 API REST

> Base URL : `http://localhost:8000`  
> Documentation interactive Swagger : **http://localhost:8000/docs**  
> Schéma OpenAPI JSON : **http://localhost:8000/openapi.json**

Toutes les routes (sauf `/`, `/health`, `/api/auth/login`, `/api/auth/register`) nécessitent un **JWT Bearer** dans `Authorization: Bearer <token>`.

### Sommaire des routes

| Méthode | Route                                | Rôle requis          | Description |
| ------- | ------------------------------------ | -------------------- | ----------- |
| `POST`  | `/api/auth/login`                    | public               | Obtient un JWT |
| `POST`  | `/api/auth/register`                 | public               | Crée un compte `visitor` |
| `GET`   | `/api/auth/me`                       | authentifié          | Profil courant |
| `GET`   | `/api/capteurs/`                     | staff+               | Liste des ESP32 (legacy) |
| `GET`   | `/api/mesures/`                      | staff+               | Historique de mesures |
| `GET`   | `/api/alertes/`                      | staff+               | Liste des alertes |
| `PATCH` | `/api/alertes/{id}/traiter`          | staff+               | Marquer comme traitée |
| `DELETE`| `/api/alertes/{id}`                  | admin                | Supprimer une alerte |
| `POST`  | `/api/alertes/bulk-delete`           | admin                | Suppression en masse |
| `GET`   | `/api/documents/`                    | staff+               | Liste des PDF |
| `POST`  | `/api/documents/`                    | admin                | Téléverser un PDF (async) |
| `GET`   | `/api/documents/{id}/file`           | staff+               | Télécharger |
| `DELETE`| `/api/documents/{id}`                | admin                | Supprimer (et son index Chroma) |
| `POST`  | `/api/chat/`                         | authentifié          | Poser une question au RAG |
| `GET`   | `/api/chat/historique`               | authentifié          | Historique de chat |
| `DELETE`| `/api/chat/historique/{id}`          | authentifié          | Supprimer une conversation |
| `DELETE`| `/api/chat/historique`               | authentifié          | Tout supprimer |
| `POST`  | `/api/chat/interpreter`              | staff+               | Interprétation libre d'une mesure |
| `GET`   | `/api/admin/esp32/`                  | staff+               | Liste des ESP32 |
| `POST`  | `/api/admin/esp32/`                  | admin                | Enregistrer un ESP32 |
| `PATCH` | `/api/admin/esp32/{id}`              | admin                | Modifier |
| `DELETE`| `/api/admin/esp32/{id}`              | admin                | Supprimer (et ses mesures/alertes) |
| `GET`   | `/api/admin/esp32/unregistered`      | admin                | IPs non enregistrées |
| `POST`  | `/api/admin/esp32/claim`             | admin                | Réclamer une IP |
| `GET`   | `/api/admin/esp32/salles-status`     | staff+               | Grille agrégée des salles |
| `WS`    | `/api/realtime/ws?token=<JWT>`       | authentifié          | WebSocket live |

### Exemples curl

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@chuoujda.ma","password":"Admin@2026!"}' \
  | jq -r .access_token)

# Liste des ESP32
curl -s http://localhost:8000/api/admin/esp32/ -H "Authorization: Bearer $TOKEN"

# Enregistrer un nouvel ESP32
curl -s -X POST http://localhost:8000/api/admin/esp32/ \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"ip":"192.168.1.50","salle":"salle-3","note":"3e étage – cardio"}'

# Poser une question à l'assistant
curl -s -X POST http://localhost:8000/api/chat/ \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"question":"Quels sont les seuils de température acceptables ?"}'

# WebSocket (avec `wscat` ou tout client WS)
wscat -c "ws://localhost:8000/api/realtime/ws?token=$TOKEN"
```

---

## 🔐 Authentification & Rôles

### Trois rôles canoniques

| Rôle               | Droits                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| `admin`            | Tout (CRUD ESP32, CRUD users, CRUD documents, alertes, chat, dashboard complet)         |
| `hospital_staff`   | Dashboard complet, alertes, documents (lecture), chat, interprétation de mesures        |
| `visitor`          | Dashboard restreint, chat (cas d'usage : patient qui interroge ses propres données)     |

### Normalisation
Le backend **reçoit** d'éventuels rôles legacy (`Admin`, `Technicien`, `Soignant`, `Patient`, `patient`, etc.) et les **normalise** vers les 3 rôles canoniques via `auth.normalize_role` + `auth.LEGACY_ROLES`.

### Hachage des mots de passe
- **SHA-256** du mot de passe en clair
- **bcrypt** sur ce SHA-256 (pré-hash pour éviter la limite de 72 caractères de bcrypt)
- Stocké au format `sha256$<bcrypt-hash>` (`auth.hacher_mdp`)

### JWT
- Algorithme : **HS256**
- Claims : `sub` (email), `role` (canonique), `exp` (par défaut `ACCESS_TOKEN_EXPIRE_MINUTES = 60`)
- Envoyé via header `Authorization: Bearer <token>` (pour REST) **ou** query string `?token=<token>` (pour WebSocket).

---

## 🤖 Pipeline IA / RAG

### Architecture du RAG

```
question
   │
   ▼
┌────────────────────────────────────────────────────────────┐
│       1. Embedding (OpenRouter, llama-nemotron)            │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  2. Similarity search (Chroma, k=RAG_RETRIEVAL_K=4)       │
│     + purge automatique des chunks null (détection erreurs)│
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  3. Construction du prompt (SYSTEM_PROMPT)                │
│     • Règle stricte : "réponds UNIQUEMENT d'après docs"   │
│     • Refus explicite d'inventer                           │
│     • Citations en français                                │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  4. LLM (Groq, llama-3.3-70b-versatile)                   │
│     Temperature 0.1 / max_tokens 256 / timeout 60s        │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
                      {reponse, sources[]}
```

### Indexation des PDF

1. **Upload** : `POST /api/documents/` (admin uniquement).
2. **Sauvegarde** sur disque dans `/data/uploads/`.
3. **Indexation asynchrone** via `BackgroundTasks` :
   - `PyPDFLoader` lit les pages.
   - `RecursiveCharacterTextSplitter` chunk en blocs de 800 caractères (overlap 100).
   - Méta-donnée `source_document` attachée à chaque chunk.
   - Insertion dans Chroma, écrasement de l'index précédent pour ce document.
   - Mise à jour du flag `indexe=True` en base.
4. **Suppression** : `DELETE /api/documents/{id}` → supprime le fichier **et** l'index Chroma associé (`where={"source_document": nom}`).

### Explication automatique des alertes

À chaque seuil franchi, un thread daemon :
1. Cherche d'abord une **explication en cache** dans la fenêtre `EXPLICATION_CACHE_HOURS = 24h` pour le même couple `(type, niveau)`. Si trouvée → on l'applique telle quelle (très économe en appels LLM).
2. Sinon, interroge le LLM avec un prompt structuré en 3 sections (**Pourquoi** / **Risques** / **Action recommandée**), contextualisé par les chunks RAG pertinents.
3. Stocke le résultat dans `alerte.explication` + timestamp.

### Mode "interprétation libre"

`POST /api/chat/interpreter?capteur_type=…&valeur=…&unite=…&emplacement=…` renvoie une interprétation de mesure en **2-3 phrases** en français, basée sur les protocoles indexés. Réservé à `staff+`.

---

## 📡 Ingestion IoT (MQTT)

### Forme des topics

```
<MQTT_TOPIC_PREFIX>/<salle>/<type>

Exemples :
  medassist/salle/salle-1/temperature
  medassist/salle/salle-1/humidite
  medassist/salle/salle-3/pression
  medassist/salle/salle-cardio/qualite_air
```

`<type>` ∈ `{temperature, humidite, pression, qualite_air}`. Si le topic et le champ `type` du payload sont en désaccord, **le topic gagne** (le segment est la source de vérité pour la salle).

### Forme du payload (JSON)

```json
{
  "ip":     "192.168.1.50",
  "type":   "temperature",
  "valeur": 22.4,
  "unite":  "°C"
}
```

### Cycle de vie de l'ingestion (`mqtt_client.py`)

1. **Connexion** : `connect_async` (non bloquant) + `loop_start()` (thread réseau paho).
2. **Abonnement** : `medassist/salle/+/+` à la connexion (`on_connect`).
3. **Message reçu** :
   - Validation UTF-8 + JSON dict.
   - Parsing du topic (salle, type).
   - Validation `valeur` (float), `unite` (string), `type` (parmi `SENSOR_TYPES`).
   - **Match device** : `_match_device(db, topic_salle, source_ip, …)` cherche d'abord un ESP32 enregistré dont l'IP correspond exactement dans la salle.
     - ✅ trouvé → `esp32_id` renseigné → mesure liée au dispositif → **alerte possible**.
     - ❌ non trouvé → mesure insérée avec `esp32_id = NULL` → **en attente de réclamation admin** (rien n'est perdu).
4. **Insertion** en base + **broadcast WebSocket** temps réel.

### Déduplication des warnings
Pour éviter le spam de logs quand un ESP32 non-enregistré inonde le bus, `_warn_unknown_source` applique un **cooldown de 60 secondes par IP**.

---

## 🔌 Firmware ESP32

**`firmware/firmware.ino`** — Arduino sketch pour ESP32 + DHT11, prêt à flasher via Arduino IDE / PlatformIO.

### Configuration à ajuster

```cpp
const char* WIFI_SSID     = "M-LINK";
const char* WIFI_PASSWORD = "22092005";

const char* MQTT_BROKER     = "192.168.1.100";   // IP du PC qui héberge Mosquitto
const int   MQTT_PORT       = 1883;
const char* MQTT_CLIENT_ID  = "esp32-sensor-1";
#define SALLE "salle-1"                          // ⚠️ DOIT correspondre à l'enregistrement admin

const unsigned long INTERVAL_MS = 3000;          // 3 secondes entre deux mesures
#define DHT_PIN 4
```

### Dépendances Arduino (à installer via Library Manager)

| Bibliothèque   | Usage                       |
| -------------- | --------------------------- |
| `WiFi.h`       | (built-in ESP32 core)       |
| `PubSubClient` | Client MQTT                 |
| `ArduinoJson`  | Sérialisation JSON du payload |
| `DHTesp`       | Lecture du capteur DHT11    |

### Fonctionnement

1. **`connecterWiFi()`** : désactive le power-save Wi-Fi (sinon le CONNACK MQTT peut être perdu), puis bloque jusqu'à `WL_CONNECTED`.
2. **`diagnosticReseau()`** : affiche SSID, RSSI, IP ESP32, masque, gateway, DNS, et tente un **test TCP brut** sur le port 1883 — utile pour debug.
3. **`connecterMQTT()`** : reconnecte avec backoff 2s en cas de `rc != 0`.
4. **`loop()`** : toutes les `INTERVAL_MS` ms, lit le DHT11 → publie 2 messages (`temperature`, `humidite`) sur `medassist/salle/<SALLE>/<type>` au format JSON.

### Étendre avec d'autres capteurs

```cpp
// Brancher un BMP280 (I²C) :
envoyerMesure("pression", readBmp(), "hPa");

// Brancher un SGP40 / SGP30 (qualité d'air) :
envoyerMesure("qualite_air", readSgp(), "ppm");
```

Les types `pression` et `qualite_air` sont déjà supportés côté backend (modèle, validation, seuils d'alerte).

---

## 🖥️ Frontend

### Stack
- **React 18 + TypeScript + Vite 7**
- **Tailwind CSS 3** avec tokens sémantiques (`bg-bg`, `text-text-primary`, etc.) — fonctionne en **light/dark automatique** via la classe `dark` sur `<html>` (définie au plus tôt dans `index.html` pour éviter tout FOUC).
- **React Router 6** : routing côté client (SPA).
- **Axios** : intercepteurs `Authorization` + auto-redirect sur 401.
- **Recharts** : graphiques de tendances 24h/7j/30j (température, humidité, etc.).
- **LiveSocket** : un **singleton** WebSocket partagé via `LiveSocketContext`. Backoff exponentiel (1s → 5s) + heartbeat 25s.

### Layout général

```
┌─────────────────────────────────────────────────────────────────┐
│ Navbar (alertes badge • utilisateur • thème)                    │
├──────────────┬──────────────────────────────────────────────────┤
│ Sidebar      │ Page courante                                    │
│ • Dashboard  │  - DashboardPage (grille de salles)               │
│ • Salles     │  - AdminSallesPage (admin only)                   │
│ • Alertes    │  - AlertesPage (staff only)                      │
│ • Documents  │  - DocumentsPage                                 │
│ • Assistant  │  - AssistantPage (Markdown, sessionStorage)       │
│ • Profile    │  - ProfilePage                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

Les visiteurs ne voient que l'Assistant IA (sidebar masquée).

### Routes & permissions

| Route              | admin | staff | visitor |
| ------------------ | :---: | :---: | :-----: |
| `/`                | ✅    | ✅    | ✅ restreint |
| `/admin/salles`    | ✅    | ❌    | ❌     |
| `/alertes`         | ✅    | ✅    | ❌     |
| `/documents`       | ✅    | ✅    | ❌     |
| `/assistant`       | ✅    | ✅    | ✅     |
| `/profile`         | ✅    | ✅    | ✅     |

> Implémenté via le hook `usePermissions` + le composant `RequireAuth can="…"`.

### Thème
- Défini par `localStorage['medassist:theme']` (override utilisateur) ou `prefers-color-scheme` (système).
- Bascule depuis la Navbar (`<Sun/Moon icon>`).
- **Flash-theme bootstrap** dans `index.html` (script inline synchrone avant React) → évite le flash blanc en mode sombre.

---

## 📊 Tableau de bord temps réel

`DashboardPage` + `salles-status` agrègent l'état de **toutes les salles** en une seule requête :

```json
[
  {
    "esp32_id": 1,
    "salle": "salle-1",
    "ip": "192.168.1.50",
    "actif": true,
    "online": true,
    "derniere_mesure_le": "2026-07-30T16:21:44Z",
    "note": "3e étage – cardio",
    "sensors": [
      { "type": "temperature", "state": "active", "last_value": 22.4, "last_unite": "°C", "last_timestamp": "...", "last_seen_label": "à l'instant" },
      { "type": "humidite",    "state": "active", "last_value": 48.1, "last_unite": "%",  "last_timestamp": "...", "last_seen_label": "il y a 1 min" },
      { "type": "pression",    "state": "not_installed", "last_value": null },
      { "type": "qualite_air", "state": "offline", "last_value": 950, "last_unite": "ppm", "last_seen_label": "il y a 3 min" }
    ]
  }
]
```

- `state` d'un capteur :
  - `active` → dernière mesure ≤ `OFFLINE_THRESHOLD_SECONDS = 60s`.
  - `offline` → plus de mesure depuis 60s.
  - `not_installed` → aucune mesure enregistrée pour ce capteur sur ce device.
- `online` (salle) = `active` sur **au moins un capteur** dans les 60 dernières secondes.
- Une **carte synthétique "ESP32 non enregistrés"** apparaît en tête si des mesures arrivent depuis des IPs jamais réclamées (avec lien direct vers `/admin/salles`).

### Mises à jour live
- Le WebSocket `LiveSocket` publie deux familles d'événements :
  - `mesure` → la grille met à jour le `last_value` / `last_seen_label`.
  - `alerte` → la Navbar incrémente son badge, `/alertes` ajoute une carte.

---

## 👤 Comptes par défaut

Créés par `seed_roles.py` (idempotent : skip si l'email existe déjà) lors du premier démarrage :

| Rôle              | Email                  | Mot de passe   |
| ----------------- | ---------------------- | -------------- |
| `admin`           | admin@chuoujda.ma      | `Admin@2026!`  |
| `hospital_staff`  | staff@chuoujda.ma      | `Staff@2026!`  |
| `visitor`         | visitor@chuoujda.ma    | `Visitor@2026!`|

> ⚠️ **Changez ces mots de passe immédiatement** après le premier déploiement en production. Tous les mots de passe seed se terminent par `@2026!`.

---

## 🔧 Commandes utiles

```bash
# Lifecycle de la stack
docker compose up -d --build         # Démarrer / reconstruire
docker compose down                  # Arrêter (conserve les volumes)
docker compose down -v               # Arrêter + purger TOUTES les données (reset complet)
docker compose restart backend       # Redémarrer un service

# Inspection
docker compose ps                    # État courant des services
docker compose logs -f backend       # Logs temps réel du backend
docker compose logs -f --tail=100    # 100 dernières lignes, tous services
docker compose logs -f mosquitto     # Logs broker MQTT
docker compose exec backend bash     # Shell interactif dans le conteneur backend
docker compose exec postgres psql -U postgres -d medassist   # psql direct

# Migrations
docker compose exec backend alembic current         # Version actuelle
docker compose exec backend alembic upgrade head    # Appliquer toutes les migrations
docker compose exec backend alembic revision -m "<description>"   # Nouvelle migration

# Seed (idempotent)
docker compose exec backend python seed_roles.py

# Espionner le bus MQTT depuis l'hôte
docker compose exec mosquitto mosquitto_sub -h mosquitto -t 'medassist/salle/#' -v
mosquitto_sub -h localhost -t 'medassist/salle/#' -v   # depuis l'extérieur

# Reconstruire un seul service
docker compose build --no-cache backend
docker compose up -d --no-deps backend
```

---

## 💾 Persistance & Volumes

| Volume             | Contenu                                                       | Source                |
| ------------------ | ------------------------------------------------------------- | --------------------- |
| `pgdata`           | `/var/lib/postgresql/data` — base PostgreSQL complète         | service `postgres`    |
| `mqttdata`         | `/mosquitto/data` — retained messages et config Mosquitto     | service `mosquitto`   |
| `medassist-data`   | `/data/chroma` + `/data/uploads` — ChromaDB et PDF uploadés  | service `backend`     |

Les volumes **survivent** à `docker compose down`. Ils sont **détruits** par `docker compose down -v`.

### Sauvegarder

```bash
# Snapshot PostgreSQL
docker compose exec -T postgres pg_dump -U postgres medassist > medassist-$(date +%F).sql

# Snapshot ChromaDB + uploads
docker run --rm -v medassist_medassist-data:/data -v $PWD:/backup alpine \
  tar czf /backup/medassist-data-$(date +%F).tgz /data
```

### Restaurer

```bash
cat medassist-2026-07-30.sql | docker compose exec -T postgres psql -U postgres -d medassist

docker run --rm -v medassist_medassist-data:/data -v $PWD:/backup alpine \
  tar xzf /backup/medassist-data-2026-07-30.tgz -C
```

---

## 🛠️ Développement local sans Docker

Vous pouvez lancer Postgres + Mosquitto via Docker, et tourner backend/frontend sur l'hôte :

```bash
# 1. Postgres + Mosquitto uniquement
docker compose up -d postgres mosquitto

# 2. Backend (Python 3.11+)
cd backend
python -m venv .venv
. .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Adapter .env : DATABASE_URL et MQTT_HOST → localhost
alembic upgrade head
python seed_roles.py
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd ../frontend
npm install
npm run dev    # http://localhost:5173 (proxy /api → :8000)
```

---

## 🚨 Dépannage

### Le backend ne démarre pas

| Symptôme                                              | Cause probable                                | Solution                                                  |
| ----------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `Postgres indisponible après 60s`                     | Postgres pas encore prêt ou service pas lancé  | `docker compose logs postgres`, vérifier `pg_isready`      |
| `Alembic upgrade` échoue                              | Schéma déjà à un état partiel                 | Backup + `alembic stamp head`, puis `alembic upgrade head` |
| `MODULE_NOT_FOUND: app.auth`                          | CWD ≠ `/app` ou PYTHONPATH non défini         | Toujours lancer via l'`entrypoint.sh`                     |
| `Permission denied: '/data/uploads'`                  | Volume monté sur un dossier créé par `root`   | Le Dockerfile crée `/data` avec chown `app:app` (UID 1001) |

### L'ingestion MQTT ne marche pas

| Symptôme                                              | Cause probable                                | Solution                                                  |
| ----------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| Logs backend : `MQTT message d'un salle non enregistré`| Salle pas encore créée dans l'admin           | Enregistrer l'ESP32 dans `/admin/salles`                  |
| Logs : `MQTT 'ip' manquant`                           | Payload firmware sans `WiFi.localIP()`        | Vérifier la version du firmware                           |
| ESP32 : `rc=-2`                                       | Power-save Wi-Fi coupe la radio avant CONNACK | `WiFi.setSleep(false)` (déjà dans le firmware)            |
| Connexion OK mais aucune mesure en base               | Topic hors préfixe `medassist/salle/`         | Aligner `MQTT_TOPIC_PREFIX` entre backend et firmware     |
| ESP32 hors réseau                                     | Mauvaise IP broker ou firewall                | Utiliser `diagnosticReseau()` au boot, vérifier le port 1883 |

### Le RAG ne répond rien

- **"Aucun document n'a encore été indexé"** → téléverser un PDF depuis `/documents` (admin).
- **"Cette information ne figure pas dans les documents disponibles"** → réponse **correcte** du LLM, qui refuse d'inventer.
- Timeout `LLM_TIMEOUT_SECONDS = 60s` atteint → augmenter la valeur ou vérifier la clé Groq.

### Le frontend ne charge rien

- `VITE_API_URL` mal configuré → vérifier `frontend/.env` ou la valeur par défaut `http://localhost:8000`.
- 401 systématique → token expiré, se reconnecter.
- Thème noir flash → le script `index.html` a échoué, vérifier que `localStorage` est activé.

---

## 🛡️ Sécurité

| Domaine            | État actuel                                                                 | À faire avant prod                                     |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Auth JWT**       | HS256, expiration 60 min, signé avec `SECRET_KEY`                           | Passer en RS256, rotation de clé, refresh tokens       |
| **Mots de passe**  | SHA-256 → bcrypt (réputé sûr)                                               | Imposer une politique de complexité                    |
| **CORS**           | Wildcard `allow_origins=["*"]` (dev)                                        | Restreindre aux origines connues                       |
| **MQTT**           | Sans authentification (`MQTT_USERNAME=""`)                                  | Activer `mosquitto-no-auth.conf` → `mosquitto.conf` avec auth |
| **HTTPS**          | Non (HTTP derrière nginx)                                                   | Mettre Caddy/Traefik en frontal avec Let's Encrypt     |
| **Clés secrètes**  | Présentes dans le `.env` *commit* du dépôt (à usage dev)                    | Retirer du dépôt, utiliser un vault (Doppler, Vault)   |
| **Uploads PDF**    | Validation extension + taille `client_max_body_size 50m`                   | Scan antivirus (ClamAV) sur le volume `medassist-data` |
| **CWE prompt**     | SYSTEM_PROMPT strict (refuse d'inventer), temperature 0.1                   | Audit + jailbreaks tests sur les prompts prod         |
| **Logs**           | Peut contenir des emails en clair                                           | Masquer dans les handlers logging                      |

---

## 🗺️ Roadmap

- [ ] **HTTPS frontaux** (Caddy intégré au Compose).
- [ ] **OAuth2** pour les comptes hospitaliers (SSO Keycloak).
- [ ] **Notifications push** (alertes sur mobile via PWA + VAPID).
- [ ] **Multi-établissement** (multi-tenant — champ `etablissement_id`).
- [ ] **Capteurs additionnels** (CO₂, particules fines, luminosité).
- [ ] **Dashboards Grafana** temps long (downsampling des mesures).
- [ ] **Versionning des documents** (chunks Chroma horodatés).
- [ ] **Audit log complet** (qui a supprimé quoi, quand).
- [ ] **Internationalisation** (FR / AR / EN).
- [ ] **PWA offline** pour le mode visiteurs.

---

## 📜 Licence

Voir le fichier [`LICENSE`](LICENSE).

---

## 🤝 Contributing

1. Fork le repo.
2. Créez une branche (`git checkout -b feat/ma-feature`).
3. Respectez la structure existante : tests `pytest` côté backend, ESLint/TS côté frontend.
4. Avant push : `docker compose up -d --build` doit booter sans erreur et `alembic upgrade head` doit être idempotent.
5. PR avec description claire + captures si UI.

---

## 📞 Support

| Canal                          | Adresse                                       |
| ------------------------------ | --------------------------------------------- |
| Issues GitHub                  | https://github.com/votre-org/medassist/issues |
| Documentation Swagger          | http://localhost:8000/docs                    |
| Équipe MedAssist (CHU Oujda)   | mohamed.talhaoui@chuoujda.ma                  |

---

<p align="center">
  Conçu avec ❤️ pour le <strong>CHU Mohammed VI d'Oujda</strong> · 2026
</p>
