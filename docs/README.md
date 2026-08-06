# MedAssist AI — Documentation

Welcome to the **MedAssist AI** documentation. This folder is the canonical reference for developers, integrators, and operators working on the platform.

> MedAssist AI is an intelligent hospital surveillance platform: ESP32 sensors stream environmental data over MQTT, FastAPI persists and analyses it, ChromaDB powers a documentation-grounded chatbot, and a React dashboard displays the live state of every monitored room.

---

## :world_map: Documentation Index

| Document | What you'll find |
| -------- | ---------------- |
| :book: [README.md](README.md)                       | This page — overview and navigation          |
| :building_construction: [architecture.md](architecture.md) | Components, communication, AI pipeline  |
| :electric_plug: [api.md](api.md)                   | Every REST + WebSocket endpoint               |
| :card_file_box: [database.md](database.md)         | ER diagram, tables, columns, relationships    |
| :brain: [rag.md](rag.md)                           | Document ingestion, retrieval, prompts, LLM   |
| :satellite: [firmware.md](firmware.md)             | ESP32 sketch, Wi-Fi, MQTT, reconnection       |
| :rocket: [deployment.md](deployment.md)            | Docker, environment, production checklist    |
| :closed_lock_with_key: [security.md](security.md)  | JWT, hashing, RBAC, CORS                      |
| :wrench: [troubleshooting.md](troubleshooting.md) | Common issues and fixes                       |

---

## :rocket: Where to start

- **New here?** Read the project [README](../README.md) for a 60-second tour, then jump to [architecture.md](architecture.md) for the big picture.
- **Want to integrate the API?** Open [api.md](api.md) — every endpoint is documented with method, parameters, payloads, and example responses.
- **Setting up the stack?** Follow [deployment.md](deployment.md).
- **Debugging an issue?** Check [troubleshooting.md](troubleshooting.md) first.

---

## :package: Project Layout (top-level)

```
MedAssist-AI/
├── backend/         FastAPI + SQLAlchemy + Alembic + RAG pipeline
├── frontend/        React 18 + Vite + Tailwind + Recharts
├── firmware/        ESP32 Arduino sketch
├── docs/            This documentation
├── docker-compose.yml
├── .env.example
├── LICENSE
└── README.md
```

---

## :handshake: Conventions used in this documentation

- All examples assume a local dev environment (Docker Compose on `localhost`).
- All ports are the defaults: API `8000`, UI `8080`, MQTT `1883`, Postgres `5432`.
- Roles referenced in API examples follow the RBAC model: `admin`, `hospital_staff`, `visitor`.
- Code blocks are copy-pasteable. Mermaid diagrams render natively on GitHub and most Markdown viewers.

> :bulb: Found something missing or unclear? Open an issue on GitHub — the docs are part of the codebase.
