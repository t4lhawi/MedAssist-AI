# Déploiement

> Tout ce dont vous avez besoin pour faire tourner la stack MedAssist AI en local, sur un serveur privé, ou sur Internet.

---

## Prérequis

| Prérequis            | Version                         | Notes                                            |
| -------------------- | ------------------------------- | ------------------------------------------------ |
| **Docker**           | ≥ 24                            | Toute version moderne                            |
| **Docker Compose**   | v2 (`docker compose …`)         | Inclus dans les Docker Desktop récents            |
| **RAM**              | ≥ 2 Go libres pour la stack     | Postgres + Mosquitto + backend + nginx           |
| **Disque**           | ≥ 5 Go libres                   | Surtout Postgres + ChromaDB + PDFs uploadés      |
| **Ports LAN (prod)** | `1883` (MQTT), `8000` (API), `8080` (UI) | Tous configurables via `.env` / `docker-compose.yml` |
| **APIs externes**    | Clé API Groq, clé API OpenRouter | Requis pour le RAG et les fonctionnalités LLM     |

> **Note :** un HTTPS sortant vers `api.groq.com` et `openrouter.ai` est obligatoire pour les fonctionnalités IA. Sans ces clés, les endpoints de chat et d'explication d'alerte échoueront.

---

## Développement local (Docker Compose)

```bash
# 1. Cloner
git clone https://github.com/t4lhawi/MedAssist-AI.git
cd MedAssist-AI

# 2. Configurer les secrets
cp .env.example .env
# Éditer .env : POSTGRES_PASSWORD, SECRET_KEY, GROQ_API_KEY, OPENROUTER_API_KEY

# 3. Construire les images et démarrer la stack
docker compose up -d --build
```

### Ce qui démarre

| Service     | Image                  | Port hôte | Conteneur           |
| ----------- | ---------------------- | --------- | ------------------- |
| `postgres`  | `postgres:16-alpine`   | —         | `:5432`             |
| `mosquitto` | `eclipse-mosquitto:2`  | `1883`    | `:1883`             |
| `backend`   | local (multi-stage)    | `8000`    | `:8000`             |
| `frontend`  | local (multi-stage)    | `8080`    | nginx `:80`         |

Une fois que `docker compose ps` affiche les quatre services en `healthy` / `running`, la stack est prête.

| Endpoint            | URL                              |
| ------------------- | -------------------------------- |
| Application web     | http://localhost:8080            |
| API + Swagger UI    | http://localhost:8000/docs       |
| Sonde de santé      | http://localhost:8000/health     |
| Broker MQTT         | `mqtt://localhost:1883`          |

### Comptes par défaut (développement)

| Rôle             | Email                 | Mot de passe      |
| ---------------- | --------------------- | ----------------- |
| `admin`          | admin@chuoujda.ma     | `Admin@2026!`     |
| `hospital_staff` | staff@chuoujda.ma     | `Staff@2026!`     |
| `visitor`        | visitor@chuoujda.ma   | `Visitor@2026!`   |

> **Avertissement :** **Changez impérativement tous les mots de passe par défaut avant tout déploiement hors développement.**

---

## Développement local (sans Docker)

Backend :

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # .venv\Scripts\activate sous Windows
pip install -r requirements.txt
alembic upgrade head
python seed_roles.py
uvicorn app.main:app --reload
```

Frontend :

```bash
cd frontend
npm install
npm run dev                                          # http://localhost:5173
```

> Dans ce mode vous avez aussi besoin d'un PostgreSQL et d'un Mosquitto qui tournent (en local ou dans leurs propres conteneurs). Le backend lit sa configuration depuis le `.env` à la racine du projet.

---

## Variables d'environnement

Tous les paramètres sont lus depuis le fichier `.env` à la racine du projet. `docker-compose.yml` les transmet au service backend.

### Base de données

| Variable            | Défaut                                                | Description                              |
| ------------------- | ------------------------------------------------------ | ---------------------------------------- |
| `POSTGRES_DB`       | `medassist`                                            | Nom de la base                           |
| `POSTGRES_USER`     | `postgres`                                             | Utilisateur de la base                   |
| `POSTGRES_PASSWORD` | `change-me`                                            | Mot de passe de la base                  |
| `DATABASE_URL`      | `postgresql://postgres:change-me@postgres:5432/medassist` | URL SQLAlchemy complète                |

### Authentification

| Variable                       | Défaut | Description                                                |
| ------------------------------ | ------ | ---------------------------------------------------------- |
| `SECRET_KEY`                   | `""`   | Clé de signature HS256 — **au moins 32 caractères aléatoires** |
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | `60`   | Durée de vie du JWT                                        |

### LLM (Groq)

| Variable                | Défaut                      | Description                |
| ----------------------- | --------------------------- | -------------------------- |
| `GROQ_API_KEY`          | *(obligatoire)*            | Clé API                    |
| `LLM_MODEL`             | `llama-3.3-70b-versatile`   | Nom du modèle              |
| `LLM_MAX_TOKENS`        | `256`                       | Tokens max en réponse      |
| `LLM_TIMEOUT_SECONDS`   | `60`                        | Timeout de la requête      |

### Embeddings (OpenRouter)

| Variable              | Défaut                                       | Description        |
| --------------------- | -------------------------------------------- | ------------------ |
| `OPENROUTER_API_KEY`  | *(obligatoire)*                             | Clé API            |
| `EMBEDDING_MODEL`     | `nvidia/llama-nemotron-embed-vl-1b-v2:free`  | Nom du modèle      |

### RAG

| Variable               | Défaut | Description                                |
| ---------------------- | ------ | ------------------------------------------ |
| `RAG_RETRIEVAL_K`      | `4`    | Top-k chunks récupérés par requête        |
| `RAG_HISTORY_MESSAGES` | `4`    | Messages passés injectés dans le prompt    |

### Stockage

| Variable      | Défaut              | Description                                    |
| ------------- | ------------------- | ---------------------------------------------- |
| `CHROMA_PATH` | `/data/chroma`      | Où ChromaDB persiste ses vecteurs              |
| `UPLOAD_DIR`  | `/data/uploads`     | Où les PDF uploadés sont écrits                |

### MQTT

| Variable            | Défaut                  | Description                                |
| ------------------- | ----------------------- | ------------------------------------------ |
| `MQTT_HOST`         | `mosquitto`             | Nom du service dans `docker-compose.yml`   |
| `MQTT_PORT`         | `1883`                  | Port TCP                                   |
| `MQTT_TOPIC_PREFIX` | `medassist/salle`       | Préfixe des topics de mesures              |
| `MQTT_CLIENT_ID`    | `medassist-backend`     | Identifiant client unique du backend       |
| `MQTT_USERNAME`     | `""`                    | Optionnel (broker actuellement ouvert)     |
| `MQTT_PASSWORD`     | `""`                    | Optionnel                                  |
| `MQTT_KEEPALIVE`    | `30`                    | Secondes                                   |

> **Astuce :** `MQTT_HOST` est défini sur `mosquitto` (le nom du service) à l'intérieur de la stack pour que le DNS du réseau Docker le résolve. Depuis un ESP32 sur le LAN, c'est l'IPv4 réelle de l'hôte (par ex. `192.168.1.100`) qui est utilisée.

---

## Ports

| Service     | Port hôte | Conteneur | Bind sur          | Notes                                          |
| ----------- | --------- | --------- | ----------------- | ---------------------------------------------- |
| postgres    | —         | `5432`    | interne           | Non exposé par défaut                          |
| mosquitto   | `1883`    | `1883`    | `0.0.0.0`         | Accessible depuis les ESP32 sur le LAN         |
| backend     | `8000`    | `8000`    | `0.0.0.0`         | Accès direct également possible                |
| frontend    | `8080`    | `80`      | `0.0.0.0`         | nginx sert la SPA + proxy `/api/`              |

---

## Ordre de démarrage

Le `entrypoint.sh` du backend impose un ordre de boot strict :

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
  BE->>PG: Attente TCP (max 60s)
  BE->>BE: alembic upgrade head
  BE->>BE: python seed_roles.py
  BE->>BE: uvicorn app.main:app
  DC->>FE: start
```

> Le frontend ne dépend que du fait que le backend est **started**, pas healthy. Si vous avez besoin d'une orchestration plus stricte, changez `depends_on` pour utiliser `condition: service_healthy` et ajoutez une healthcheck au Dockerfile du backend.

---

## Déploiement en production

> **Avertissement :** les défauts de développement **ne doivent pas** être utilisés en production. Appliquez la checklist suivante avant d'exposer la stack à un réseau non fiable.

### Checklist de pré-vol

- [ ] `SECRET_KEY` est une chaîne aléatoire à haute entropie (≥ 32 caractères)
- [ ] `POSTGRES_PASSWORD` est fort
- [ ] `GROQ_API_KEY` et `OPENROUTER_API_KEY` sont définis
- [ ] Tous les comptes par défaut ont de nouveaux mots de passe (ou sont supprimés)
- [ ] L'allowlist CORS est restreinte à l'origine de votre frontend
- [ ] Le broker MQTT a l'authentification activée (voir `security.md`)
- [ ] HTTPS est terminé devant le frontend (Caddy / Traefik / nginx + Let's Encrypt)
- [ ] La base de données est sauvegardée hors hôte (voir ci-dessous)
- [ ] `/data`, `pgdata`, et `mqttdata` sont montés sur un volume durable

### Topologie recommandée

```mermaid
flowchart LR
  Internet --> TLS[Reverse proxy TLS<br/>Caddy / Traefik]
  TLS -- "/ → :80" --> FE[frontend:8080]
  TLS -- "/api → :8000" --> BE[backend:8000]
  BE --> PG[(postgres:5432)]
  BE --> CH[(chroma: /data/chroma)]
  BE --> GQ[API Groq]
  BE --> OR[API OpenRouter]
  LAN[Capteurs ESP32] -- "1883/tcp" --> MQ[(mosquitto:1883)]
  BE --> MQ
```

### Sauvegardes

Les données Postgres vivent dans le volume nommé `pgdata`. Pour le snapshotter depuis l'hôte :

```bash
docker run --rm \
  -v medassist_pgdata:/from \
  -v $(pwd):/to \
  alpine:3.20 tar czf /to/pgdata.tgz -C /from .
```

ChromaDB et les PDF uploadés vivent dans le volume `medassist-data` (`/data/chroma` et `/data/uploads`).

### HTTPS (exemple Caddy)

Un `Caddyfile` minimal devant la stack :

```caddy
medassist.example.org {
    encode zstd gzip
    reverse_proxy localhost:8080
}
```

Une fois ceci en place, vous pouvez retirer les mappings de ports hôte `8080` / `8000` et laisser Caddy terminer le TLS.

### Dimensionnement

| Charge                              | VM / hôte recommandé                                  |
| ----------------------------------- | ----------------------------------------------------- |
| Démo / pilote mono-salle            | 2 vCPU, 2 Go RAM, 20 Go disque                        |
| Département (10–30 salles)          | 4 vCPU, 4–8 Go RAM, 50 Go disque                      |
| Échelle hospitalière (multi-services) | 8+ vCPU, 16 Go RAM, 200 Go SSD, hôte DB séparé     |

---

## Déploiement sur Internet

Si vous voulez que des capteurs sur un site distant publient directement vers un MedAssist AI hébergé dans le cloud :

1. **Mettez Mosquitto derrière TLS** (port `8883`) avec certificats client ou un couple user/password.
2. **N'exposez que le frontend** (`:8080`) et l'API (`:8000`) sur un hostname public via un reverse proxy terminant le TLS.
3. **Restreignez le port MQTT** aux IP sources des ESP32 connus (pare-feu / security group).
4. **Utilisez un VPN privé / tunnel WireGuard** entre le LAN de l'hôpital et le cloud si la politique de l'hôpital l'autorise — c'est généralement l'option la plus simple en exploitation.
5. **Verrouillez CORS** sur votre origine frontend réelle (actuellement `*`).

> **Astuce :** pour la plupart des pilotes, héberger l'ensemble dans le data center de l'hôpital et n'exposer que le tableau de bord via HTTPS est le chemin le moins frictionnel.

---

## Mise à jour de la stack

```bash
git pull
docker compose pull                       # pull des images de base
docker compose build --no-cache           # rebuild des images locales
docker compose up -d                      # redémarrage
```

> **Note :** le `entrypoint.sh` exécute `alembic upgrade head` à chaque boot, donc les migrations de schéma sont appliquées automatiquement.

---

## Démolition

```bash
docker compose down          # arrêt, conserve les volumes
docker compose down -v       # arrêt, **efface tous les volumes** (Postgres, Chroma, PDF, MQTT)
```
