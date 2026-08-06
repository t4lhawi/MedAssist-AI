# :wrench: Troubleshooting

> Common failure modes and how to fix them. Use the table of contents on the right (or the headings below) to jump straight to the symptom you're seeing.

---

## :satellite: MQTT broker unreachable

**Symptoms**

- ESP32 Serial console: `MQTT publish échoué (topic=…)` or repeated `rc=…` codes.
- Backend logs: `MQTT connexion refusée (reason_code=…)`.

**Check the broker is up**

```bash
docker compose ps mosquitto
docker compose logs mosquitto
# from the host:
mosquitto_sub -h localhost -p 1883 -t 'medassist/salle/#' -v
```

**Check backend connection state**

```bash
docker compose logs backend | grep -i mqtt
# Look for: "MQTT connecté, abonnement à medassist/salle/+/+"
```

**Common causes**

| Cause                                    | Fix                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Broker container not started             | `docker compose up -d mosquitto`                                                 |
| Wrong port published                     | `docker-compose.yml` must map `1883:1883` on the host                           |
| ESP32 points at `localhost` / `127.0.0.1` | Change `MQTT_BROKER` to the Docker host's LAN IPv4 (e.g. `192.168.1.100`)       |
| Firewall blocks port 1883               | Open the port on the Docker host and on the ESP32's Wi-Fi network                |
| `MQTT_TOPIC_PREFIX` mismatch             | The firmware's `SALLE` macro must produce a topic under the backend's prefix     |

**Inspect a live message manually**

```bash
# from the host, subscribe to all MedAssist topics
mosquitto_sub -h localhost -p 1883 -t 'medassist/salle/#' -v
```

You should see one JSON message per (salle, type) every 3 seconds.

---

## :elephant: PostgreSQL connection issues

**Symptoms**

- Backend logs: `psycopg2.OperationalError: could not connect to server`
- `entrypoint.sh` prints `Postgres indisponible après 60s`

**Checks**

```bash
# Container running?
docker compose ps postgres
# Healthcheck
docker compose exec postgres pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
# Open a psql shell
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

**Common causes**

| Cause                                | Fix                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `.env` `POSTGRES_PASSWORD` mismatch  | Make sure the value in `.env` matches what you used on first boot          |
| `DATABASE_URL` wrong host            | Inside Compose, the host is `postgres` (the service name), not `localhost`  |
| Volume permissions on Linux          | The `pgdata` volume must be owned by UID 999 (the postgres image user)      |
| Migrations out of sync               | `docker compose exec backend alembic upgrade head`                          |

**Reset the database (DESTROYS ALL DATA)**

```bash
docker compose down -v
docker compose up -d --build
```

---

## :whale: Docker problems

| Symptom                                            | Fix                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `bind: address already in use` on `1883` / `8000` / `8080` | Stop the conflicting process or change the host port in `docker-compose.yml`   |
| Backend container exits immediately                | `docker compose logs backend` — look for Alembic / Python errors               |
| `permission denied` on `/data/uploads`             | The image creates `/data/{uploads,chroma}` as UID 1001 — don't override on bind-mount without matching the UID |
| Frontend shows blank page                          | Open browser devtools — check that `/api/...` calls are proxied to backend:8000 |
| Out of disk space                                  | Postgres + ChromaDB can grow fast — prune old `mesures` and re-index only the PDFs you need |

**Nuclear option**

```bash
docker compose down -v          # destroys volumes
docker system prune -a --volumes
docker compose up -d --build
```

---

## :satellite_antenna: WebSocket disconnected

**Symptoms**

- Frontend stops receiving live updates; dashboard freezes on the last value.
- Browser console: `WebSocket connection to 'ws://localhost:8000/api/realtime/ws?token=…' failed`.

**Checks**

```bash
# 1. Test with a quick Python client
python - <<'PY'
import asyncio, json, websockets
async def go():
    async with websockets.connect("ws://localhost:8000/api/realtime/ws?token=YOUR_TOKEN") as ws:
        print(await ws.recv())
asyncio.run(go())
PY
```

**Common causes**

| Cause                                                  | Fix                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `?token=` missing or expired                           | Re-login to refresh the JWT (1 h TTL by default)                                     |
| Reverse proxy strips the `Upgrade` / `Connection` headers | Add `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` (already done in the bundled `nginx.conf`) |
| Backend not running                                    | `docker compose ps backend` — check it's `running`                                    |
| CORS rejects the upgrade                               | Browser-side only — open the URL directly in `wscat` to confirm                      |

---

## :electric_plug: ESP32 offline

**Symptoms**

- Room shows `offline` in the dashboard for more than a few minutes.
- No new `mesures` rows in PostgreSQL.

**Quick triage**

1. **Power:** is the ESP32 still powered? Blue LED on?
2. **Wi-Fi:** read the Serial console — does `connecterWiFi` succeed?
3. **MQTT:** does `MQTT publish` succeed, or `MQTT publish échoué`?
4. **Network:** what does `diagnosticReseau` say at boot?

**Common causes**

| Cause                                            | Fix                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Wi-Fi password changed                           | Re-flash the sketch with the new credentials                                        |
| Docker host IP changed                           | ESP32's `MQTT_BROKER` constant must be updated                                      |
| DHT11 wiring (no pull-up, wrong pin)             | DHT11 needs a 10 kΩ pull-up between DATA and VCC                                    |
| ESP32 in modem-sleep                             | Verify `WiFi.setSleep(false)` is called *before* `WiFi.begin`                       |
| Power-saving mode on the AP                      | Some APs aggressively idle clients — try a different Wi-Fi network for testing      |
| The IP isn't claimed in the admin UI             | The measure is still stored (`esp32_id=null`) — claim it via `POST /api/admin/esp32/claim` |

**If nothing helps**, reflash the sketch with `MQTT_BROKER` set to the broker's container name (e.g. `mosquitto`) **and** a server on the same network — this isolates whether the issue is the LAN reachability or the broker.

---

## :card_file_box: ChromaDB errors

**Symptoms**

- `POST /api/chat/` returns `Aucun document n'a encore été indexé.` despite uploaded PDFs.
- Backend logs: `L'indexation a échoué silencieusement`.

**Checks**

```bash
# Is the volume mounted?
docker compose exec backend ls -la /data/chroma
# Force a reindex
docker compose exec backend python - <<'PY'
from app.database import SessionLocal
from app.rag.pipeline import indexer_pdf
import os
db = SessionLocal()
for d in db.execute(db.query().__class__): ...
PY
```

**Common causes**

| Cause                                                 | Fix                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `CHROMA_PATH` not writable                            | The image pre-creates `/data/chroma` as UID 1001 — keep the named volume              |
| PDF is a scan (no selectable text)                    | Run it through OCR (e.g. `ocrmypdf`) before uploading                                |
| `OPENROUTER_API_KEY` missing / invalid                | Backend logs will show a 401 from OpenRouter                                          |
| Mixed chunks from previous runs                       | `indexer_pdf` deletes by `source_document` first, so re-upload the same filename to re-index cleanly |

> :information_source: After a successful upload, `GET /api/documents/` should show `indexe: true` within a few seconds.

---

## :electric_plug: API errors

### `401 Unauthorized`

- The JWT is missing, malformed, or expired.
- The user has been soft-disabled (`actif = false`).

**Fix:** re-login with `POST /api/auth/login`.

### `403 Forbidden`

- Your role doesn't satisfy the route guard.
- Example: a `visitor` trying to call `/api/admin/esp32/`.

**Fix:** log in as the appropriate role, or ask an admin to grant you a higher-privileged role.

### `409 Conflict`

- Trying to register an ESP32 with an IP that is already known.
- Trying to rename a document to a name that's already in use.

**Fix:** choose a different IP / name, or `DELETE` the existing row first.

### `500` on chat

Backend logs will show a traceback. The most common causes:

| Cause                                          | Fix                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `GROQ_API_KEY` missing or rate-limited         | Re-check the key on the Groq dashboard                                             |
| ChromaDB query fails                           | `indexer_pdf` should have run — `GET /api/documents/` and look for `indexe: true`  |
| Network timeout to the LLM provider            | Increase `LLM_TIMEOUT_SECONDS`                                                     |

### `500` on alert explanation

The background `_run_explication` thread silently logs failures. The alert still exists, it just doesn't have an `explication` field yet. Check `docker compose logs backend | grep -i explication`.

---

## :card_file_box: Database migrations won't run

**Symptoms**

- `alembic upgrade head` fails with `Can't locate revision identified by '…'`
- Stale migration files after a `git pull`

**Fix**

```bash
# See current state
docker compose exec backend alembic current
docker compose exec backend alembic history

# Stamp the DB to the head revision (skips running migrations — last resort)
docker compose exec backend alembic stamp head
```

> :warning: `alembic stamp head` should only be used when you know the schema is already at the target revision. Always take a Postgres backup first.

---

## :mag: General debug recipes

**Watch the backend log in real time**

```bash
docker compose logs -f backend
```

**Filter backend logs by keyword**

```bash
docker compose logs backend | grep -iE 'mqtt|alerte|explication|chat'
```

**Tail the MQTT bus from the host**

```bash
mosquitto_sub -h localhost -t 'medassist/salle/#' -v
```

**Open a psql shell**

```bash
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

**Open a shell in the backend container**

```bash
docker compose exec backend bash
```

**Inspect ChromaDB on disk**

```bash
docker compose exec backend ls -la /data/chroma
```

If everything else fails, capture the full backend stack trace:

```bash
docker compose logs backend > /tmp/backend.log
docker compose exec backend python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > /tmp/openapi.json
```

…and open an issue on GitHub with both files attached.
