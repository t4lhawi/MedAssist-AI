# :electric_plug: API Reference

> Complete reference for every HTTP and WebSocket endpoint exposed by the MedAssist AI FastAPI backend.

## :information_source: Conventions

- **Base URL (dev):** `http://localhost:8000`
- **Auth:** Bearer JWT in the `Authorization` header (`Authorization: Bearer <token>`), *except* for `/api/auth/login` and the WebSocket endpoint (which takes `?token=<JWT>`).
- **Content type:** `application/json` for bodies, `multipart/form-data` for PDF uploads.
- **Roles:** `admin`, `hospital_staff`, `visitor`.
- **Interactive docs:** `http://localhost:8000/docs` (Swagger UI, generated automatically by FastAPI).

> :bulb: All `require_*` guards are applied at the FastAPI dependency-injection level. The 403/401 statuses below reflect what the backend actually returns.

---

## :seedling: Quick start

```bash
# 1. Get a token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chuoujda.ma","password":"Admin@2026!"}' \
  | jq -r .access_token)

# 2. Call a protected endpoint
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## :closed_lock_with_key: Authentification

### `POST /api/auth/login`

Authenticate a user and obtain a JWT.

- **Auth:** none
- **Body:**
  ```json
  { "email": "admin@chuoujda.ma", "password": "Admin@2026!" }
  ```
- **Example request:**
  ```bash
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@chuoujda.ma","password":"Admin@2026!"}'
  ```
- **Example response (`200 OK`):**
  ```json
  { "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "token_type": "bearer" }
  ```
- **Status codes:** `200` · `401` (bad credentials)

---

### `POST /api/auth/register`

Create a new user (visitor role by default).

- **Auth:** none
- **Body:**
  ```json
  { "nom": "Jean Dupont", "email": "j.dupont@chuoujda.ma", "password": "Motdepasse1!" }
  ```
- **Status codes:** `200` · `400` (email already used)

---

### `GET /api/auth/me`

Return the current authenticated user.

- **Auth:** Bearer JWT (any role)
- **Example response (`200 OK`):**
  ```json
  {
    "id": 1,
    "nom": "Admin",
    "email": "admin@chuoujda.ma",
    "role": "admin",
    "actif": true,
    "cree_le": "2026-01-12T08:33:21.123456+00:00"
  }
  ```
- **Status codes:** `200` · `401`

---

## :satellite: Capteurs (legacy)

### `GET /api/capteurs/`

List all registered ESP32 devices (alias of `GET /api/admin/esp32/` for backward compatibility).

- **Auth:** `hospital_staff` or `admin`
- **Response:** array of `Esp32DeviceOut`
- **Status codes:** `200` · `403`

---

## :bar_chart: Mesures

### `GET /api/mesures/`

List measurements with optional filters.

- **Auth:** `hospital_staff` or `admin`
- **Query parameters:**

  | Name      | Type   | Default | Description                              |
  | --------- | ------ | ------- | ---------------------------------------- |
  | `limite`  | int    | 100     | Max items (≤ 500)                        |
  | `esp32_id`| int    | —       | Filter by device                         |
  | `type`    | string | —       | `temperature` \| `humidite` \| `pression` \| `qualite_air` |
  | `salle`   | string | —       | Filter by room (joins `esp32_devices`)   |

- **Example:**
  ```bash
  curl "http://localhost:8000/api/mesures/?limite=50&salle=salle-1" \
    -H "Authorization: Bearer $TOKEN"
  ```
- **Status codes:** `200` · `403`

---

## :rotating_light: Alertes

### `GET /api/alertes/`

List alerts (auto-filtered to the last 24h unless `traitee=true` is passed).

- **Auth:** `hospital_staff` or `admin`
- **Query parameters:**

  | Name      | Type | Default | Description                            |
  | --------- | ---- | ------- | -------------------------------------- |
  | `traitee` | bool | —       | Filter on handled/unhandled            |
  | `limit`   | int  | 50      | Max items (≤ 200)                      |

- **Status codes:** `200` · `403`

---

### `PATCH /api/alertes/{alerte_id}/traiter`

Mark an alert as handled.

- **Auth:** `hospital_staff` or `admin`
- **Status codes:** `200` · `404` · `403`

---

### `DELETE /api/alertes/{alerte_id}`

Delete a single alert.

- **Auth:** `admin` only
- **Status codes:** `204` · `404` · `403`

---

### `POST /api/alertes/bulk-delete`

Delete several alerts at once.

- **Auth:** `admin` only
- **Body:**
  ```json
  { "ids": [12, 13, 17] }
  ```
- **Example response:**
  ```json
  { "deleted": 3 }
  ```
- **Status codes:** `200` · `403`

---

## :page_facing_up: Documents (RAG)

### `POST /api/documents/`

Upload a PDF and asynchronously index it into ChromaDB.

- **Auth:** `admin` only
- **Body:** `multipart/form-data` with field `file` (PDF only)
- **Example:**
  ```bash
  curl -X POST http://localhost:8000/api/documents/ \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@protocole_temperature.pdf"
  ```
- **Status codes:** `200` · `400` (not a PDF) · `403`

---

### `GET /api/documents/`

List uploaded documents.

- **Auth:** `hospital_staff` or `admin`
- **Status codes:** `200` · `403`

---

### `GET /api/documents/{doc_id}/file`

Download the original PDF (force-attachment).

- **Auth:** `hospital_staff` or `admin`
- **Status codes:** `200` · `404` · `403`

---

### `PATCH /api/documents/{doc_id}`

Rename a document and re-index it under the new name.

- **Auth:** `admin` only
- **Body:**
  ```json
  { "nom": "Protocole_Temperature_v2.pdf" }
  ```
- **Status codes:** `200` · `404` · `409` (name collision) · `403`

---

### `DELETE /api/documents/{doc_id}`

Delete the document row, the file on disk, and its ChromaDB index.

- **Auth:** `admin` only
- **Example response:** `{"message":"Document supprimé"}`
- **Status codes:** `200` · `404` · `403`

---

## :robot: Assistant IA (Chat)

### `POST /api/chat/`

Ask the RAG assistant a question grounded in the indexed PDFs.

- **Auth:** any authenticated user (`admin`, `hospital_staff`, `visitor`)
- **Body:**
  ```json
  {
    "question": "Quelle est la plage normale de température ?",
    "historique": [
      { "role": "user",      "content": "Bonjour" },
      { "role": "assistant", "content": "Bonjour, comment puis-je vous aider ?" }
    ]
  }
  ```
- **Example response:**
  ```json
  {
    "reponse": "La plage normale de température en salle d'hospitalisation est de 18 à 26 °C. (Source: Document_Diabete_MedAssist_AI.pdf, page 3)",
    "sources": [
      { "document": "Document_Diabete_MedAssist_AI.pdf", "page": 3, "score": 0.421 }
    ]
  }
  ```
- **Status codes:** `200` · `403` · `500` (LLM/embedding error)

---

### `GET /api/chat/historique`

Return the last 20 conversations for the current user.

- **Auth:** any authenticated user
- **Status codes:** `200` · `403`

---

### `DELETE /api/chat/historique/{conversation_id}`

Delete a single conversation belonging to the current user.

- **Auth:** any authenticated user
- **Status codes:** `200` · `404` · `403`

---

### `DELETE /api/chat/historique`

Delete **all** conversations for the current user.

- **Auth:** any authenticated user
- **Status codes:** `200` · `403`

---

### `POST /api/chat/interpreter`

Ask the LLM to interpret a single sensor measurement against the indexed protocols.

- **Auth:** `hospital_staff` or `admin`
- **Query parameters:**

  | Name          | Type   | Required | Description          |
  | ------------- | ------ | -------- | -------------------- |
  | `capteur_type`| string | yes      | e.g. `temperature`   |
  | `valeur`      | float  | yes      | The measured value   |
  | `unite`       | string | no       | e.g. `°C`            |
  | `emplacement` | string | no       | Room identifier      |

- **Example:**
  ```bash
  curl -X POST "http://localhost:8000/api/chat/interpreter?capteur_type=temperature&valeur=29.2&unite=%C2%B0C&emplacement=salle-1" \
    -H "Authorization: Bearer $TOKEN"
  ```
- **Example response:**
  ```json
  { "explication": "La valeur relevée (29.2 °C) est au-dessus du seuil de 26 °C. Il est recommandé de vérifier la ventilation de la salle." }
  ```
- **Status codes:** `200` · `403` · `500`

---

## :shield: Admin · ESP32

> All routes below are mounted under `/api/admin/esp32` and require at least `hospital_staff` for `GET`, `admin` for mutations.

### `GET /api/admin/esp32/`

List all ESP32 devices, ordered by `salle`, then `ip`.

- **Auth:** `hospital_staff` or `admin`

---

### `POST /api/admin/esp32/`

Register a new ESP32 device.

- **Auth:** `admin` only
- **Body:**
  ```json
  { "ip": "192.168.1.50", "salle": "salle-1", "note": "Étage 2", "actif": true }
  ```
- **Status codes:** `201` · `409` (IP already registered) · `403`

---

### `PATCH /api/admin/esp32/{esp32_id}`

Update device metadata. `clear_note=true` explicitly resets the note.

- **Auth:** `admin` only
- **Body (all fields optional):**
  ```json
  { "salle": "salle-2", "note": "Étage 3", "clear_note": false, "actif": true }
  ```
- **Status codes:** `200` · `404` · `403`

---

### `DELETE /api/admin/esp32/{esp32_id}`

Delete a device. Cascades to its `mesures` and related `alertes`.

- **Auth:** `admin` only
- **Status codes:** `204` · `404` · `403`

---

### `GET /api/admin/esp32/unregistered`

List source IPs that have published measurements but are not yet linked to any device.

- **Auth:** `admin` only
- **Response:** array of `UnregisteredSource` (ip, last_seen, measurement_count, last_type, last_valeur, last_unite)

---

### `POST /api/admin/esp32/claim`

Bind an unregistered IP to a room, and back-fill the existing measurements.

- **Auth:** `admin` only
- **Body:**
  ```json
  { "ip": "192.168.1.77", "salle": "salle-3", "note": "Récupéré du seau 'non enregistrés'" }
  ```
- **Status codes:** `201` · `409` (IP already registered) · `403`

---

### `GET /api/admin/esp32/salles-status`

Aggregated view per room (last values per sensor, online state, etc.) — consumed by the dashboard.

- **Auth:** `hospital_staff` or `admin`
- **Status codes:** `200` · `403`

---

## :satellite_antenna: Realtime (WebSocket)

### `GET /api/realtime/ws?token=<JWT>`

Open a WebSocket to receive `mesure` and `alerte` events in real time.

- **Auth:** JWT passed as the `token` query parameter
- **Handshake:** server sends `{"kind":"hello","user":"<email>"}` once the socket is open
- **Frame types:**

  | `kind`    | `data` shape                                                |
  | --------- | ----------------------------------------------------------- |
  | `hello`   | `{ "kind":"hello", "user":"<email>" }`                      |
  | `mesure`  | `{ "kind":"mesure", "data": { id, type, valeur, unite, timestamp, esp32_id, salle, source_ip, topic_salle } }` |
  | `alerte`  | `{ "kind":"alerte", "data": { id, type, niveau, message, traitee, cree_le, esp32_id, salle, explication, explication_cree_le } }` |

- **Close codes:**
  - `1008` — invalid / missing token
  - `1005` — normal closure
- **Example (browser):**
  ```js
  const ws = new WebSocket(`ws://localhost:8000/api/realtime/ws?token=${token}`);
  ws.onmessage = (ev) => {
    const { kind, data } = JSON.parse(ev.data);
    if (kind === "mesure") console.log("new mesure", data);
    if (kind === "alerte") console.warn("ALERTE", data);
  };
  ```

---

## :heart: Health

### `GET /health`

Liveness probe. Always `{"status":"ok"}` once the process is up.

### `GET /`

Service banner. Returns `{"message": "MedAssist AI est opérationnel", "docs": "/docs"}`.

---

## :warning: Error model

Errors are returned as `{"detail": "<human-readable message>"}` with the appropriate HTTP status:

| Status | When                                                            |
| ------ | --------------------------------------------------------------- |
| 400    | Validation error (bad payload, non-PDF upload, …)               |
| 401    | Missing / invalid / expired JWT                                 |
| 403    | Authenticated but role does not satisfy the route guard         |
| 404    | Target resource not found                                       |
| 409    | Conflict (duplicate IP, duplicate document name, …)             |
| 500    | Unhandled exception (LLM timeout, DB error, …)                  |
