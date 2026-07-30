# MedAssist AI — Plateforme de Surveillance Hospitalière Intelligente

**MedAssist AI** est une plateforme de surveillance hospitalière qui combine ingestion de capteurs IoT (ESP32/MQTT), base de données relationnelle (PostgreSQL), assistant IA documentaire (RAG + ChromaDB) et tableau de bord temps réel (React), développée dans le cadre d'un **stage** réalisé au **CHU Mohammed VI d'Oujda**.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## Vision

MedAssist AI centralise les données environnementales et physiologiques des salles hospitalières, détecte automatiquement les anomalies (température, humidité, pression, qualité de l'air) et assiste le personnel via un chatbot IA basé sur les protocoles internes.

## Fonctionnalités clés

**Personnel hospitalier**
- Tableau de bord temps réel par salle, avec historique et graphiques de tendances (24h/7j/30j)
- Gestion des alertes (visualisation, traitement, suppression)
- Assistant IA (RAG) interrogeant la documentation interne en français

**Administrateurs** — en plus de ce qui précède :
- Enregistrement et gestion des capteurs ESP32 (IP, salle, statut)
- Rattachement des mesures d'IP non enregistrées à une salle
- Import de documents PDF pour enrichir la base de connaissance
- Gestion des comptes utilisateurs

**Visiteurs (patients)**
- Accès restreint au tableau de bord et à l'assistant IA uniquement

**IA explicable** — chaque alerte génère automatiquement une explication en 3 volets (*Pourquoi / Risques / Action recommandée*), avec mise en cache 24h pour limiter les appels au LLM et refus explicite d'inventer des informations médicales.

---

## Architecture

<img width="1536" height="1024" alt="arch" src="https://github.com/user-attachments/assets/061179f0-3019-416c-94b3-e8dbf3a973ff" />


---

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Recharts |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2, Alembic |
| Base de données | PostgreSQL 16 |
| Broker IoT | Eclipse Mosquitto 2 |
| Vector store | ChromaDB |
| LLM | Groq (llama-3.3-70b-versatile) |
| Embeddings | OpenRouter (llama-nemotron-embed) |
| Firmware | Arduino / ESP32 |
| Orchestration | Docker Compose |

---

## Démarrage rapide

**Prérequis :** Docker ≥ 24, 2 Go RAM, ports 8000/8080/1883 libres.

```bash
git clone https://github.com/votre-org/medassist.git
cd medassist
# Créer/éditer le fichier .env à la racine et renseigner au minimum :
#   SECRET_KEY, POSTGRES_PASSWORD, GROQ_API_KEY, OPENROUTER_API_KEY

docker compose up -d --build
```

Docker Compose construit les images, démarre PostgreSQL et Mosquitto, applique les migrations Alembic, crée les comptes par défaut, puis lance le backend et le frontend.

| Service | URL |
|---|---|
| Application web | http://localhost:8080 |
| API + documentation Swagger | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |
| Broker MQTT | mqtt://localhost:1883 |

### Comptes par défaut

| Rôle | Email | Mot de passe |
|---|---|---|
| admin | admin@chuoujda.ma | `Admin@2026!` |
| hospital_staff | staff@chuoujda.ma | `Staff@2026!` |
| visitor | visitor@chuoujda.ma | `Visitor@2026!` |

> ⚠️ À changer immédiatement en production.

---

## Configuration essentielle (`.env`)

```dotenv
DATABASE_URL=postgresql://postgres:admin@postgres:5432/medassist
SECRET_KEY=                 # 32+ caractères aléatoires, obligatoire en prod
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
MQTT_HOST=mosquitto
MQTT_TOPIC_PREFIX=medassist/salle
```

Pour la production : régénérer `SECRET_KEY`, changer `POSTGRES_PASSWORD`, utiliser vos propres clés API et activer HTTPS via un reverse-proxy.

---

## Modèle de données (résumé)

- **utilisateurs** — comptes et rôles (`admin`, `hospital_staff`, `visitor`)
- **esp32_devices** — capteurs enregistrés (IP, salle, statut)
- **mesures** — relevés horodatés (température, humidité, pression, qualité de l'air)
- **alertes** — anomalies détectées, avec explication IA mise en cache
- **documents** — PDF indexés pour le RAG
- **conversations** — historique de l'assistant IA

**Seuils par défaut :**

| Type | Min | Max |
|---|---|---|
| Température | 18 °C | 26 °C |
| Humidité | 30 % | 70 % |
| Pression | 950 hPa | 1050 hPa |
| Qualité de l'air | — | 1000 ppm |

Une valeur `> max` déclenche une alerte *attention* ; au-delà de `max × 1.10`, elle passe *critique*.

---

## API REST (aperçu)

Base URL : `http://localhost:8000` · Documentation interactive : `/docs`
Toutes les routes (hors login/register/health) requièrent un JWT (`Authorization: Bearer <token>`).

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Obtenir un token |
| GET | `/api/alertes/` | staff+ | Liste des alertes |
| POST | `/api/chat/` | authentifié | Interroger l'assistant IA |
| POST | `/api/admin/esp32/` | admin | Enregistrer un capteur |
| POST | `/api/admin/esp32/claim` | admin | Rattacher une IP non enregistrée |
| WS | `/api/realtime/ws?token=<JWT>` | authentifié | Flux temps réel |

---

## Ingestion IoT

Les ESP32 publient sur `medassist/salle/<salle>/<type>` toutes les 3 secondes :

```json
{ "ip": "192.168.1.50", "type": "temperature", "valeur": 22.4, "unite": "°C" }
```

Si l'IP correspond à un capteur enregistré, la mesure est liée à la salle et peut déclencher une alerte. Sinon, elle reste en attente de validation par un administrateur — aucune donnée n'est perdue.

---

## Commandes utiles

```bash
docker compose up -d --build         # démarrer / reconstruire
docker compose logs -f backend       # logs en direct
docker compose exec backend alembic upgrade head   # migrations
docker compose exec backend python seed_roles.py   # recréer les comptes par défaut
mosquitto_sub -h localhost -t 'medassist/salle/#' -v   # observer le bus MQTT
```

---

## Sécurité — état actuel et recommandations

| Domaine | État actuel | À faire avant production |
|---|---|---|
| JWT | HS256, expiration 60 min | RS256 + rotation des clés |
| Mots de passe | SHA-256 + bcrypt | Politique de complexité |
| CORS | Ouvert (`*`) | Restreindre aux origines connues |
| MQTT | Sans authentification | Activer l'auth Mosquitto |
| HTTPS | Non activé | Reverse-proxy (Caddy/Traefik) |
| Secrets | Présents dans `.env` du dépôt (dev) | Externaliser (vault) |

---

## Roadmap

- HTTPS et SSO (Keycloak)
- Notifications push mobiles
- Support multi-établissement
- Capteurs additionnels (CO₂, particules fines)
- Tableaux de bord Grafana long terme
- Internationalisation (FR / AR / EN)

---

## Contact

- Documentation Swagger : http://localhost:8000/docs
- Contact : t4lhawi@gmail.com

---

<h3 align="center">Créé par <a href="https://github.com/t4lhawi">Mohamed Talhaoui</a></h3>
<p align="center">Projet de stage réalisé pour le <strong>CHU Mohammed VI d'Oujda</strong> · 2026</p>
