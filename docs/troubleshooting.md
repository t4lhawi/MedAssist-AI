# Dépannage

> Modes de défaillance courants et comment les résoudre. Utilisez la table des matières (ou les titres ci-dessous) pour aller directement au symptôme que vous constatez.

---

## Broker MQTT injoignable

**Symptômes**

- Console série ESP32 : `MQTT publish échoué (topic=…)` ou codes `rc=…` répétés.
- Logs backend : `MQTT connexion refusée (reason_code=…)`.

**Vérifier que le broker tourne**

```bash
docker compose ps mosquitto
docker compose logs mosquitto
# depuis l'hôte :
mosquitto_sub -h localhost -p 1883 -t 'medassist/salle/#' -v
```

**Vérifier l'état de connexion du backend**

```bash
docker compose logs backend | grep -i mqtt
# Chercher : "MQTT connecté, abonnement à medassist/salle/+/+"
```

**Causes courantes**

| Cause                                       | Correctif                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Conteneur broker non démarré                | `docker compose up -d mosquitto`                                                       |
| Mauvais port publié                         | `docker-compose.yml` doit mapper `1883:1883` sur l'hôte                               |
| ESP32 pointe sur `localhost` / `127.0.0.1`  | Changer `MQTT_BROKER` vers l'IPv4 LAN de l'hôte Docker (par ex. `192.168.1.100`)      |
| Pare-feu bloque le port 1883                | Ouvrir le port sur l'hôte Docker et sur le réseau Wi-Fi de l'ESP32                    |
| Incohérence `MQTT_TOPIC_PREFIX`             | La macro `SALLE` du firmware doit produire un topic sous le préfixe backend            |

**Inspecter un message en direct**

```bash
# depuis l'hôte, s'abonner à tous les topics MedAssist
mosquitto_sub -h localhost -p 1883 -t 'medassist/salle/#' -v
```

Vous devriez voir un message JSON par (salle, type) toutes les 3 secondes.

---

## Problèmes de connexion PostgreSQL

**Symptômes**

- Logs backend : `psycopg2.OperationalError: could not connect to server`
- `entrypoint.sh` affiche `Postgres indisponible après 60s`

**Vérifications**

```bash
# Le conteneur tourne ?
docker compose ps postgres
# Healthcheck
docker compose exec postgres pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
# Ouvrir un shell psql
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

**Causes courantes**

| Cause                                | Correctif                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------- |
| Incohérence `POSTGRES_PASSWORD`      | Assurez-vous que la valeur dans `.env` correspond au premier boot           |
| Mauvais host dans `DATABASE_URL`     | Dans Compose, le host est `postgres` (nom du service), pas `localhost`      |
| Permissions de volume sur Linux      | Le volume `pgdata` doit appartenir à l'UID 999 (utilisateur de l'image postgres) |
| Migrations désynchronisées           | `docker compose exec backend alembic upgrade head`                          |

**Réinitialiser la base de données (DÉTRUIT TOUTES LES DONNÉES)**

```bash
docker compose down -v
docker compose up -d --build
```

---

## Problèmes Docker

| Symptôme                                            | Correctif                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `bind: address already in use` sur `1883` / `8000` / `8080` | Arrêtez le processus en conflit ou changez le port hôte dans `docker-compose.yml`   |
| Le conteneur backend sort immédiatement             | `docker compose logs backend` — cherchez les erreurs Alembic / Python               |
| `permission denied` sur `/data/uploads`             | L'image crée `/data/{uploads,chroma}` en tant qu'UID 1001 — ne pas surcharger sur bind-mount sans matcher l'UID |
| Le frontend affiche une page blanche                | Ouvrez les devtools du navigateur — vérifiez que les appels `/api/...` sont bien proxifiés vers backend:8000 |
| Plus d'espace disque                                | Postgres + ChromaDB peuvent grossir vite — élaguez les vieilles `mesures` et ne ré-indexez que les PDF nécessaires |

**Option nucléaire**

```bash
docker compose down -v          # détruit les volumes
docker system prune -a --volumes
docker compose up -d --build
```

---

## WebSocket déconnecté

**Symptômes**

- Le frontend arrête de recevoir les mises à jour temps réel ; le tableau de bord gèle sur la dernière valeur.
- Console navigateur : `WebSocket connection to 'ws://localhost:8000/api/realtime/ws?token=…' failed`.

**Vérifications**

```bash
# 1. Tester avec un client Python rapide
python - <<'PY'
import asyncio, json, websockets
async def go():
    async with websockets.connect("ws://localhost:8000/api/realtime/ws?token=YOUR_TOKEN") as ws:
        print(await ws.recv())
asyncio.run(go())
PY
```

**Causes courantes**

| Cause                                                  | Correctif                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `?token=` manquant ou expiré                           | Re-login pour rafraîchir le JWT (TTL 1 h par défaut)                                       |
| Le reverse proxy strip les en-têtes `Upgrade` / `Connection` | Ajoutez `proxy_set_header Upgrade $http_upgrade;` et `proxy_set_header Connection "upgrade";` (déjà fait dans le `nginx.conf` fourni) |
| Backend non démarré                                    | `docker compose ps backend` — vérifiez qu'il est `running`                                |
| CORS rejette l'upgrade                                 | Côté navigateur uniquement — ouvrez l'URL directement dans `wscat` pour confirmer        |

---

## ESP32 hors ligne

**Symptômes**

- La salle affiche `offline` dans le tableau de bord pendant plus de quelques minutes.
- Aucune nouvelle ligne `mesures` dans PostgreSQL.

**Triage rapide**

1. **Alimentation :** l'ESP32 est-il toujours alimenté ? LED bleue allumée ?
2. **Wi-Fi :** lire la console Série — `connecterWiFi` réussit-il ?
3. **MQTT :** `MQTT publish` réussit-il, ou `MQTT publish échoué` ?
4. **Réseau :** que dit `diagnosticReseau` au boot ?

**Causes courantes**

| Cause                                            | Correctif                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Mot de passe Wi-Fi changé                        | Reflashez le sketch avec les nouveaux identifiants                                        |
| IP de l'hôte Docker changée                      | La constante `MQTT_BROKER` de l'ESP32 doit être mise à jour                               |
| Câblage DHT11 (pas de pull-up, mauvaise broche)  | Le DHT11 nécessite une pull-up de 10 kΩ entre DATA et VCC                                |
| ESP32 en modem-sleep                             | Vérifiez que `WiFi.setSleep(false)` est appelé *avant* `WiFi.begin`                      |
| Mode économie d'énergie sur l'AP                | Certains AP déconnectent agressivement les clients — essayez un autre réseau Wi-Fi       |
| L'IP n'est pas revendiquée dans l'UI admin       | La mesure est quand même stockée (`esp32_id=null`) — revendiquez via `POST /api/admin/esp32/claim` |

**Si rien n'y fait**, reflashez le sketch avec `MQTT_BROKER` défini sur le nom du conteneur broker (par ex. `mosquitto`) **et** un serveur sur le même réseau — cela permet d'isoler si le problème est la joignabilité LAN ou le broker.

---

## Erreurs ChromaDB

**Symptômes**

- `POST /api/chat/` renvoie `Aucun document n'a encore été indexé.` malgré des PDF uploadés.
- Logs backend : `L'indexation a échoué silencieusement`.

**Vérifications**

```bash
# Le volume est-il monté ?
docker compose exec backend ls -la /data/chroma
# Forcer une réindexation
docker compose exec backend python - <<'PY'
from app.database import SessionLocal
from app.rag.pipeline import indexer_pdf
db = SessionLocal()
PY
```

**Causes courantes**

| Cause                                                 | Correctif                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `CHROMA_PATH` non inscriptible                        | L'image pré-crée `/data/chroma` en UID 1001 — garder le volume nommé                       |
| PDF scanné (pas de texte sélectionnable)              | Passez-le par un OCR (par ex. `ocrmypdf`) avant de l'uploader                             |
| `OPENROUTER_API_KEY` manquant / invalide              | Les logs backend montreront un 401 d'OpenRouter                                            |
| Chunks mélangés de runs précédents                    | `indexer_pdf` supprime par `source_document` d'abord, donc ré-uploadez avec le même nom de fichier pour ré-indexer proprement |

> **Note :** après un upload réussi, `GET /api/documents/` doit afficher `indexe: true` en quelques secondes.

---

## Erreurs API

### `401 Unauthorized`

- Le JWT est manquant, mal formé, ou expiré.
- L'utilisateur a été désactivé doucement (`actif = false`).

**Correctif :** reconnectez-vous avec `POST /api/auth/login`.

### `403 Forbidden`

- Votre rôle ne satisfait pas la garde de la route.
- Exemple : un `visitor` qui essaie d'appeler `/api/admin/esp32/`.

**Correctif :** connectez-vous avec le rôle approprié, ou demandez à un admin de vous accorder un rôle plus privilégié.

### `409 Conflict`

- Tentative d'enregistrer un ESP32 avec une IP déjà connue.
- Tentative de renommer un document vers un nom déjà utilisé.

**Correctif :** choisissez une autre IP / un autre nom, ou supprimez d'abord la ligne existante.

### `500` sur le chat

Les logs backend afficheront une trace. Les causes les plus courantes :

| Cause                                          | Correctif                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GROQ_API_KEY` manquant ou rate-limited        | Re-vérifiez la clé sur le dashboard Groq                                                 |
| Échec de la requête ChromaDB                   | `indexer_pdf` aurait dû tourner — `GET /api/documents/` et cherchez `indexe: true`      |
| Timeout réseau vers le provider LLM            | Augmentez `LLM_TIMEOUT_SECONDS`                                                         |

### `500` sur l'explication d'alerte

Le thread d'arrière-plan `_run_explication` log silencieusement les échecs. L'alerte existe toujours, elle n'a juste pas de champ `explication` pour l'instant. Vérifiez `docker compose logs backend | grep -i explication`.

---

## Les migrations de base de données ne tournent pas

**Symptômes**

- `alembic upgrade head` échoue avec `Can't locate revision identified by '…'`
- Fichiers de migration obsolètes après un `git pull`

**Correctif**

```bash
# Voir l'état courant
docker compose exec backend alembic current
docker compose exec backend alembic history

# Stample la base à la révision head (saute l'exécution des migrations — dernier recours)
docker compose exec backend alembic stamp head
```

> **Avertissement :** `alembic stamp head` ne doit être utilisé que si vous savez que le schéma est déjà à la révision cible. Faites toujours un backup Postgres d'abord.

---

## Recettes générales de debug

**Suivre le log backend en temps réel**

```bash
docker compose logs -f backend
```

**Filtrer les logs backend par mot-clé**

```bash
docker compose logs backend | grep -iE 'mqtt|alerte|explication|chat'
```

**Suivre le bus MQTT depuis l'hôte**

```bash
mosquitto_sub -h localhost -t 'medassist/salle/#' -v
```

**Ouvrir un shell psql**

```bash
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

**Ouvrir un shell dans le conteneur backend**

```bash
docker compose exec backend bash
```

**Inspecter ChromaDB sur disque**

```bash
docker compose exec backend ls -la /data/chroma
```

Si tout le reste échoue, capturez la stack trace complète du backend :

```bash
docker compose logs backend > /tmp/backend.log
docker compose exec backend python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > /tmp/openapi.json
```

…et ouvrez une issue sur GitHub avec les deux fichiers attachés.
