# Référence de l'API

> Référence complète de chaque endpoint HTTP et WebSocket exposé par le backend FastAPI de MedAssist AI.

## Conventions

- **URL de base (dev) :** `http://localhost:8000`
- **Auth :** JWT Bearer dans l'en-tête `Authorization` (`Authorization: Bearer <token>`), *sauf* pour `/api/auth/login` et l'endpoint WebSocket (qui prend `?token=<JWT>`).
- **Content type :** `application/json` pour les corps, `multipart/form-data` pour l'upload de PDF.
- **Rôles :** `admin`, `hospital_staff`, `visitor`.
- **Documentation interactive :** `http://localhost:8000/docs` (Swagger UI, générée automatiquement par FastAPI).

> **Astuce :** toutes les gardes `require_*` sont appliquées au niveau de l'injection de dépendances de FastAPI. Les statuts 403/401 ci-dessous reflètent ce que le backend renvoie réellement.

---

## Démarrage rapide

```bash
# 1. Obtenir un token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chuoujda.ma","password":"Admin@2026!"}' \
  | jq -r .access_token)

# 2. Appeler un endpoint protégé
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Authentification

### `POST /api/auth/login`

Authentifie un utilisateur et renvoie un JWT.

- **Auth :** aucune
- **Corps :**
  ```json
  { "email": "admin@chuoujda.ma", "password": "Admin@2026!" }
  ```
- **Exemple de requête :**
  ```bash
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@chuoujda.ma","password":"Admin@2026!"}'
  ```
- **Exemple de réponse (`200 OK`) :**
  ```json
  { "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "token_type": "bearer" }
  ```
- **Codes de statut :** `200` · `401` (identifiants invalides)

---

### `POST /api/auth/register`

Crée un nouvel utilisateur (rôle `visitor` par défaut).

- **Auth :** aucune
- **Corps :**
  ```json
  { "nom": "Jean Dupont", "email": "j.dupont@chuoujda.ma", "password": "Motdepasse1!" }
  ```
- **Codes de statut :** `200` · `400` (email déjà utilisé)

---

### `GET /api/auth/me`

Renvoie l'utilisateur courant authentifié.

- **Auth :** JWT Bearer (tout rôle)
- **Exemple de réponse (`200 OK`) :**
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
- **Codes de statut :** `200` · `401`

---

## Capteurs (legacy)

### `GET /api/capteurs/`

Liste tous les devices ESP32 enregistrés (alias de `GET /api/admin/esp32/` pour rétro-compatibilité).

- **Auth :** `hospital_staff` ou `admin`
- **Réponse :** tableau de `Esp32DeviceOut`
- **Codes de statut :** `200` · `403`

---

## Mesures

### `GET /api/mesures/`

Liste les mesures avec filtres optionnels.

- **Auth :** `hospital_staff` ou `admin`
- **Paramètres de query :**

  | Nom       | Type   | Défaut | Description                                |
  | --------- | ------ | ------ | ------------------------------------------ |
  | `limite`  | int    | 100    | Nombre max d'éléments (≤ 500)              |
  | `esp32_id`| int    | —      | Filtrer par device                         |
  | `type`    | string | —      | `temperature` \| `humidite` \| `pression` \| `qualite_air` |
  | `salle`   | string | —      | Filtrer par salle (joint `esp32_devices`)  |

- **Exemple :**
  ```bash
  curl "http://localhost:8000/api/mesures/?limite=50&salle=salle-1" \
    -H "Authorization: Bearer $TOKEN"
  ```
- **Codes de statut :** `200` · `403`

---

## Alertes

### `GET /api/alertes/`

Liste les alertes (filtrées automatiquement sur les 24 dernières heures sauf si `traitee=true` est passé).

- **Auth :** `hospital_staff` ou `admin`
- **Paramètres de query :**

  | Nom       | Type | Défaut | Description                            |
  | --------- | ---- | ------ | -------------------------------------- |
  | `traitee` | bool | —      | Filtrer sur traitées / non traitées    |
  | `limit`   | int  | 50     | Nombre max d'éléments (≤ 200)          |

- **Codes de statut :** `200` · `403`

---

### `PATCH /api/alertes/{alerte_id}/traiter`

Marque une alerte comme traitée.

- **Auth :** `hospital_staff` ou `admin`
- **Codes de statut :** `200` · `404` · `403`

---

### `DELETE /api/alertes/{alerte_id}`

Supprime une alerte unique.

- **Auth :** `admin` uniquement
- **Codes de statut :** `204` · `404` · `403`

---

### `POST /api/alertes/bulk-delete`

Supprime plusieurs alertes en une fois.

- **Auth :** `admin` uniquement
- **Corps :**
  ```json
  { "ids": [12, 13, 17] }
  ```
- **Exemple de réponse :**
  ```json
  { "deleted": 3 }
  ```
- **Codes de statut :** `200` · `403`

---

## Documents (RAG)

### `POST /api/documents/`

Upload un PDF et l'indexe en arrière-plan dans ChromaDB.

- **Auth :** `admin` uniquement
- **Corps :** `multipart/form-data` avec le champ `file` (PDF uniquement)
- **Exemple :**
  ```bash
  curl -X POST http://localhost:8000/api/documents/ \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@protocole_temperature.pdf"
  ```
- **Codes de statut :** `200` · `400` (pas un PDF) · `403`

---

### `GET /api/documents/`

Liste les documents uploadés.

- **Auth :** `hospital_staff` ou `admin`
- **Codes de statut :** `200` · `403`

---

### `GET /api/documents/{doc_id}/file`

Télécharge le PDF original (attachment forcé).

- **Auth :** `hospital_staff` ou `admin`
- **Codes de statut :** `200` · `404` · `403`

---

### `PATCH /api/documents/{doc_id}`

Renomme un document et le ré-indexe sous le nouveau nom.

- **Auth :** `admin` uniquement
- **Corps :**
  ```json
  { "nom": "Protocole_Temperature_v2.pdf" }
  ```
- **Codes de statut :** `200` · `404` · `409` (collision de nom) · `403`

---

### `DELETE /api/documents/{doc_id}`

Supprime la ligne du document, le fichier sur disque et son index ChromaDB.

- **Auth :** `admin` uniquement
- **Exemple de réponse :** `{"message":"Document supprimé"}`
- **Codes de statut :** `200` · `404` · `403`

---

## Assistant IA (Chat)

### `POST /api/chat/`

Pose une question à l'assistant RAG, ancrée dans les PDF indexés.

- **Auth :** tout utilisateur authentifié (`admin`, `hospital_staff`, `visitor`)
- **Corps :**
  ```json
  {
    "question": "Quelle est la plage normale de température ?",
    "historique": [
      { "role": "user",      "content": "Bonjour" },
      { "role": "assistant", "content": "Bonjour, comment puis-je vous aider ?" }
    ]
  }
  ```
- **Exemple de réponse :**
  ```json
  {
    "reponse": "La plage normale de température en salle d'hospitalisation est de 18 à 26 °C. (Source: Document_Diabete_MedAssist_AI.pdf, page 3)",
    "sources": [
      { "document": "Document_Diabete_MedAssist_AI.pdf", "page": 3, "score": 0.421 }
    ]
  }
  ```
- **Codes de statut :** `200` · `403` · `500` (erreur LLM / embeddings)

---

### `GET /api/chat/historique`

Renvoie les 20 dernières conversations de l'utilisateur courant.

- **Auth :** tout utilisateur authentifié
- **Codes de statut :** `200` · `403`

---

### `DELETE /api/chat/historique/{conversation_id}`

Supprime une conversation appartenant à l'utilisateur courant.

- **Auth :** tout utilisateur authentifié
- **Codes de statut :** `200` · `404` · `403`

---

### `DELETE /api/chat/historique`

Supprime **toutes** les conversations de l'utilisateur courant.

- **Auth :** tout utilisateur authentifié
- **Codes de statut :** `200` · `403`

---

### `POST /api/chat/interpreter`

Demande au LLM d'interpréter une mesure de capteur unique au regard des protocoles indexés.

- **Auth :** `hospital_staff` ou `admin`
- **Paramètres de query :**

  | Nom           | Type   | Obligatoire | Description          |
  | ------------- | ------ | ----------- | -------------------- |
  | `capteur_type`| string | oui         | ex. `temperature`    |
  | `valeur`      | float  | oui         | La valeur mesurée    |
  | `unite`       | string | non         | ex. `°C`             |
  | `emplacement` | string | non         | Identifiant de salle |

- **Exemple :**
  ```bash
  curl -X POST "http://localhost:8000/api/chat/interpreter?capteur_type=temperature&valeur=29.2&unite=%C2%B0C&emplacement=salle-1" \
    -H "Authorization: Bearer $TOKEN"
  ```
- **Exemple de réponse :**
  ```json
  { "explication": "La valeur relevée (29.2 °C) est au-dessus du seuil de 26 °C. Il est recommandé de vérifier la ventilation de la salle." }
  ```
- **Codes de statut :** `200` · `403` · `500`

---

## Admin · ESP32

> Toutes les routes ci-dessous sont montées sous `/api/admin/esp32` et requièrent au minimum `hospital_staff` pour les `GET`, `admin` pour les mutations.

### `GET /api/admin/esp32/`

Liste tous les devices ESP32, triés par `salle`, puis `ip`.

- **Auth :** `hospital_staff` ou `admin`

---

### `POST /api/admin/esp32/`

Enregistre un nouveau device ESP32.

- **Auth :** `admin` uniquement
- **Corps :**
  ```json
  { "ip": "192.168.1.50", "salle": "salle-1", "note": "Étage 2", "actif": true }
  ```
- **Codes de statut :** `201` · `409` (IP déjà enregistrée) · `403`

---

### `PATCH /api/admin/esp32/{esp32_id}`

Met à jour les métadonnées du device. `clear_note=true` réinitialise explicitement la note.

- **Auth :** `admin` uniquement
- **Corps (tous les champs optionnels) :**
  ```json
  { "salle": "salle-2", "note": "Étage 3", "clear_note": false, "actif": true }
  ```
- **Codes de statut :** `200` · `404` · `403`

---

### `DELETE /api/admin/esp32/{esp32_id}`

Supprime un device. Provoque un cascade sur ses `mesures` et les `alertes` associées.

- **Auth :** `admin` uniquement
- **Codes de statut :** `204` · `404` · `403`

---

### `GET /api/admin/esp32/unregistered`

Liste les IP sources ayant publié des mesures mais non encore rattachées à un device.

- **Auth :** `admin` uniquement
- **Réponse :** tableau de `UnregisteredSource` (ip, last_seen, measurement_count, last_type, last_valeur, last_unite)

---

### `POST /api/admin/esp32/claim`

Rattache une IP non enregistrée à une salle, et rétro-remplit les mesures existantes.

- **Auth :** `admin` uniquement
- **Corps :**
  ```json
  { "ip": "192.168.1.77", "salle": "salle-3", "note": "Récupéré du seau 'non enregistrés'" }
  ```
- **Codes de statut :** `201` · `409` (IP déjà enregistrée) · `403`

---

### `GET /api/admin/esp32/salles-status`

Vue agrégée par salle (dernières valeurs par capteur, état en ligne, etc.) — consommée par le tableau de bord.

- **Auth :** `hospital_staff` ou `admin`
- **Codes de statut :** `200` · `403`

---

## Temps réel (WebSocket)

### `GET /api/realtime/ws?token=<JWT>`

Ouvre un WebSocket pour recevoir les événements `mesure` et `alerte` en temps réel.

- **Auth :** JWT passé comme paramètre de query `token`
- **Handshake :** le serveur envoie `{"kind":"hello","user":"<email>"}` une fois le socket ouvert
- **Types de trame :**

  | `kind`    | Forme de `data`                                                |
  | --------- | -------------------------------------------------------------- |
  | `hello`   | `{ "kind":"hello", "user":"<email>" }`                         |
  | `mesure`  | `{ "kind":"mesure", "data": { id, type, valeur, unite, timestamp, esp32_id, salle, source_ip, topic_salle } }` |
  | `alerte`  | `{ "kind":"alerte", "data": { id, type, niveau, message, traitee, cree_le, esp32_id, salle, explication, explication_cree_le } }` |

- **Codes de fermeture :**
  - `1008` — token invalide / manquant
  - `1005` — fermeture normale
- **Exemple (navigateur) :**
  ```js
  const ws = new WebSocket(`ws://localhost:8000/api/realtime/ws?token=${token}`);
  ws.onmessage = (ev) => {
    const { kind, data } = JSON.parse(ev.data);
    if (kind === "mesure") console.log("nouvelle mesure", data);
    if (kind === "alerte") console.warn("ALERTE", data);
  };
  ```

---

## Santé

### `GET /health`

Sonde de vivacité. Renvoie toujours `{"status":"ok"}` une fois le processus lancé.

### `GET /`

Bannière du service. Renvoie `{"message": "MedAssist AI est opérationnel", "docs": "/docs"}`.

---

## Modèle d'erreur

Les erreurs sont renvoyées sous la forme `{"detail": "<message lisible>"}` avec le code HTTP approprié :

| Statut | Quand                                                            |
| ------ | ---------------------------------------------------------------- |
| 400    | Erreur de validation (payload invalide, upload non-PDF, etc.)    |
| 401    | JWT manquant / invalide / expiré                                  |
| 403    | Authentifié mais le rôle ne satisfait pas la garde de la route    |
| 404    | Ressource cible introuvable                                      |
| 409    | Conflit (IP dupliquée, nom de document dupliqué, etc.)           |
| 500    | Exception non gérée (timeout LLM, erreur DB, etc.)               |
