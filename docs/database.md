# :card_file_box: Database

> Reference for the PostgreSQL 16 schema used by MedAssist AI.

The schema is managed with **SQLAlchemy 2** as the ORM and **Alembic** as the migration tool. Migrations live in [`backend/alembic/versions/`](https://github.com/t4lhawi/MedAssist-AI/tree/main/backend/alembic/versions).

---

## :diamond_shape_with_a_dot_inside: Entity-Relationship Diagram

```mermaid
erDiagram
  UTILISATEURS ||--o{ CONVERSATIONS : "writes"
  UTILISATEURS ||--o{ DOCUMENTS     : "uploads"
  ESP32_DEVICES ||--o{ MESURES      : "produces"
  ESP32_DEVICES ||--o{ ALERTES      : "triggers"
  MESURES      ||--o{ ALERTES      : "causes"

  UTILISATEURS {
    int    id PK
    string nom
    string email UK
    string mdp_hash
    string role
    bool   actif
    timestamp cree_le
  }

  ESP32_DEVICES {
    int      id PK
    string   ip UK
    string   salle
    string   note
    bool     actif
    timestamp cree_le
    timestamp derniere_mesure_le
  }

  MESURES {
    int       id PK
    int       esp32_id FK
    string    type
    string    source_ip
    string    topic_salle
    float     valeur
    string    unite
    timestamp timestamp
  }

  ALERTES {
    int       id PK
    int       esp32_id FK
    int       mesure_id FK
    string    niveau
    string    type
    text      message
    bool      traitee
    timestamp cree_le
    text      explication
    timestamp explication_cree_le
  }

  DOCUMENTS {
    int       id PK
    string    nom
    string    chemin
    int       taille
    bool      indexe
    int       uploade_par FK
    timestamp uploade_le
  }

  CONVERSATIONS {
    int       id PK
    int       utilisateur_id FK
    text      question
    text      reponse
    json      sources
    timestamp cree_le
  }
```

---

## :open_file_folder: Tables

### `utilisateurs`

Application users. Roles are normalised to one of: `admin`, `hospital_staff`, `visitor`. Legacy role strings (`Admin`, `Soignant`, `Technicien`, `Patient`, `Visiteur`) are mapped at the boundary in `auth.normalize_role`.

| Column     | Type                     | Constraints                | Description                                |
| ---------- | ------------------------ | -------------------------- | ------------------------------------------ |
| `id`       | `Integer`                | **PK**, indexed            | Surrogate primary key                      |
| `nom`      | `String(100)`            | NOT NULL                   | Display name                               |
| `email`    | `String(150)`            | NOT NULL, **UNIQUE**, idx  | Login identifier                           |
| `mdp_hash` | `String(255)`            | NOT NULL                   | `sha256$<bcrypt>`                          |
| `role`     | `String(30)`             | default `visitor`          | `admin` \| `hospital_staff` \| `visitor`   |
| `actif`    | `Boolean`                | default `true`             | Soft-disable flag                          |
| `cree_le`  | `DateTime(timezone=True)`| server default `now()`     | Creation timestamp                         |

---

### `esp32_devices`

The source-of-truth device registry. One row per physical ESP32.

| Column               | Type                     | Constraints                  | Description                                  |
| -------------------- | ------------------------ | ---------------------------- | -------------------------------------------- |
| `id`                 | `Integer`                | **PK**, indexed              | Surrogate primary key                        |
| `ip`                 | `String(45)`             | NOT NULL, **UNIQUE**, idx    | IPv4 (or future IPv6) of the device          |
| `salle`              | `String(100)`            | NOT NULL, indexed            | Room name — drives topic parsing             |
| `note`               | `String(200)`            | nullable                     | Free-form operator note                      |
| `actif`              | `Boolean`                | default `true`               | Soft-disable flag                            |
| `cree_le`            | `DateTime(timezone=True)`| server default `now()`       | Creation timestamp                           |
| `derniere_mesure_le` | `DateTime(timezone=True)`| nullable                     | Updated whenever a matching mesure is stored |

---

### `mesures`

Time-series of sensor readings. `esp32_id` is nullable to support the **unregistered** bucket — a measure can be stored before the admin claims the IP.

| Column        | Type                     | Constraints                                | Description                                                            |
| ------------- | ------------------------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| `id`          | `Integer`                | **PK**, indexed                            | Surrogate primary key                                                  |
| `esp32_id`    | `Integer`                | **FK → esp32_devices.id** (nullable), idx  | Device the measure was attributed to (null until admin claims the IP)  |
| `type`        | `String(30)`             | NOT NULL, indexed                          | `temperature` \| `humidite` \| `pression` \| `qualite_air`             |
| `source_ip`   | `String(45)`             | nullable, indexed                          | IP that sent the MQTT message                                          |
| `topic_salle` | `String(100)`            | nullable, indexed                          | Room segment parsed from the MQTT topic (source of truth for `salle`)  |
| `valeur`      | `Float`                  | NOT NULL                                   | The measured value                                                     |
| `unite`       | `String(20)`             | nullable                                   | Unit string (e.g. `°C`, `%`, `hPa`, `ppm`)                             |
| `timestamp`   | `DateTime(timezone=True)`| server default `now()`, indexed            | Server-side receipt time                                               |

**Composite index:** `ix_mesures_esp32_type_ts (esp32_id, type, timestamp)` — used by the per-room last-value query and by 24h / 7d / 30d trend queries.

---

### `alertes`

Threshold-violation events, optionally enriched with a cached LLM explanation.

| Column                 | Type                     | Constraints                                 | Description                                                |
| ---------------------- | ------------------------ | ------------------------------------------- | ---------------------------------------------------------- |
| `id`                   | `Integer`                | **PK**, indexed                             | Surrogate primary key                                      |
| `esp32_id`             | `Integer`                | **FK → esp32_devices.id** (nullable), idx   | Device the alert pertains to                               |
| `mesure_id`            | `Integer`                | **FK → mesures.id** (nullable)              | Measurement that caused the alert                          |
| `niveau`               | `String(20)`             | NOT NULL                                    | `info` \| `attention` \| `critique`                        |
| `type`                 | `String(30)`             | nullable                                    | Sensor type (`temperature`, …)                             |
| `message`              | `Text`                   | NOT NULL                                    | Human-readable alert message                              |
| `traitee`              | `Boolean`                | default `false`                             | Marked as handled by a staff member                        |
| `cree_le`              | `DateTime(timezone=True)`| server default `now()`                      | Alert creation time                                        |
| `explication`          | `Text`                   | nullable                                    | Cached LLM explanation (markdown)                          |
| `explication_cree_le`  | `DateTime(timezone=True)`| nullable                                    | When `explication` was generated (used by the 24 h cache)  |

> :information_source: Untreated alerts older than 24 h are purged by the background sweeper (`purge_old_alertes`).

---

### `documents`

PDFs uploaded by admins to be indexed in ChromaDB. The file itself lives on disk (`UPLOAD_DIR`); the row holds metadata.

| Column        | Type                     | Constraints                            | Description                                 |
| ------------- | ------------------------ | -------------------------------------- | ------------------------------------------- |
| `id`          | `Integer`                | **PK**, indexed                        | Surrogate primary key                       |
| `nom`         | `String(255)`            | NOT NULL                               | Filename                                    |
| `chemin`      | `String(500)`            | NOT NULL                               | Absolute path on disk                       |
| `taille`      | `Integer`                | nullable                               | File size in bytes                          |
| `indexe`      | `Boolean`                | default `false`                        | `true` once the Chroma indexing finished   |
| `uploade_par` | `Integer`                | **FK → utilisateurs.id**               | Uploader user                               |
| `uploade_le`  | `DateTime(timezone=True)`| server default `now()`                 | Upload time                                 |

---

### `conversations`

Chat history with the RAG assistant, scoped per user.

| Column            | Type                     | Constraints                                | Description                                       |
| ----------------- | ------------------------ | ------------------------------------------ | ------------------------------------------------- |
| `id`              | `Integer`                | **PK**, indexed                            | Surrogate primary key                             |
| `utilisateur_id`  | `Integer`                | **FK → utilisateurs.id**                   | Owner of the conversation                         |
| `question`        | `Text`                   | NOT NULL                                   | The user's question                               |
| `reponse`         | `Text`                   | NOT NULL                                   | The assistant's reply                             |
| `sources`         | `JSON`                   | default `[]`                               | Cited document chunks (per-question)             |
| `cree_le`         | `DateTime(timezone=True)`| server default `now()`                     | When the exchange happened                        |

---

## :key: Keys & Relationships — at a glance

| Relationship                       | Cardinality | Notes                                                                  |
| ---------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `utilisateurs` → `conversations`   | 1 → N       | One user has many conversations                                        |
| `utilisateurs` → `documents`       | 1 → N       | One user can upload many PDFs                                          |
| `esp32_devices` → `mesures`        | 1 → N       | Mesures can be unattributed (`esp32_id IS NULL`) until an admin claims |
| `esp32_devices` → `alertes`        | 1 → N       | `esp32_id` may also be null on a mesure-driven alert                   |
| `mesures` → `alertes`              | 1 → N       | One mesure can trigger at most one alert per pass                      |

---

## :wrench: Migrations (Alembic)

| Revision                           | Description                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `0001_initial_post_refactor`       | Refactor: introduce `esp32_devices`, add `topic_salle`, backfill legacy data  |
| `0002_add_alerte_explication`      | Add `explication` + `explication_cree_le` columns to `alertes`                |
| `0003_rename_roles`                | Normalise role strings to the canonical `{admin, hospital_staff, visitor}`    |

```bash
# Apply all pending migrations
docker compose exec backend alembic upgrade head

# Generate a new migration after a model change
docker compose exec backend alembic revision --autogenerate -m "describe the change"
```

---

## :warning: Operational notes

- **Backups:** `pgdata` is a Docker named volume. Snapshot it from the host with `docker run --rm -v medassist_pgdata:/from -v $(pwd):/to alpine tar czf /to/pgdata.tgz -C /from .`
- **Alert retention:** untreated alerts > 24 h are auto-purged by `_alertes_sweeper` (see `backend/app/main.py`).
- **Cascade on device delete:** deleting an `esp32_device` removes its `mesures` and the related `alertes` (`crud.delete_esp32`).
