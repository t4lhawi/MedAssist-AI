# MedAssist AI — Documentation

Bienvenue dans la documentation de **MedAssist AI**. Ce dossier est la référence canonique pour les développeurs, les intégrateurs et les opérateurs travaillant sur la plateforme.

> MedAssist AI est une plateforme de surveillance hospitalière intelligente : des capteurs ESP32 diffusent les données environnementales via MQTT, FastAPI les persiste et les analyse, ChromaDB alimente un assistant conversationnel ancré sur les documents, et un tableau de bord React affiche l'état en direct de chaque salle surveillée.

---

## Index de la documentation

| Document | Contenu |
| -------- | ------- |
| [README.md](README.md)                       | Cette page — vue d'ensemble et navigation   |
| [architecture.md](architecture.md)           | Composants, communication, pipeline IA      |
| [api.md](api.md)                             | Chaque endpoint REST + WebSocket            |
| [database.md](database.md)                   | Diagramme ER, tables, colonnes, relations   |
| [rag.md](rag.md)                             | Ingestion, retrieval, prompts, LLM         |
| [firmware.md](firmware.md)                   | Sketch ESP32, Wi-Fi, MQTT, reconnexion      |
| [deployment.md](deployment.md)               | Docker, environnement, production          |
| [security.md](security.md)                   | JWT, hachage, RBAC, CORS                   |
| [troubleshooting.md](troubleshooting.md)     | Problèmes courants et solutions            |

---

## Par où commencer

- **Nouveau sur le projet ?** Lisez le [README](../README.md) du projet pour une visite en 60 secondes, puis [architecture.md](architecture.md) pour la vue d'ensemble.
- **Vous voulez intégrer l'API ?** Ouvrez [api.md](api.md) — chaque endpoint est documenté avec sa méthode, ses paramètres, ses payloads et des exemples de réponse.
- **Vous installez la stack ?** Suivez [deployment.md](deployment.md).
- **Vous dépannez ?** Consultez d'abord [troubleshooting.md](troubleshooting.md).

---

## Organisation du projet (racine)

```
MedAssist-AI/
├── backend/         FastAPI + SQLAlchemy + Alembic + pipeline RAG
├── frontend/        React 18 + Vite + Tailwind + Recharts
├── firmware/        Sketch Arduino ESP32
├── docs/            Cette documentation
├── docker-compose.yml
├── .env.example
├── LICENSE
└── README.md
```

---

## Conventions utilisées dans cette documentation

- Tous les exemples supposent un environnement de développement local (Docker Compose sur `localhost`).
- Tous les ports sont ceux par défaut : API `8000`, UI `8080`, MQTT `1883`, Postgres `5432`.
- Les rôles cités dans les exemples d'API suivent le modèle RBAC : `admin`, `hospital_staff`, `visitor`.
- Les blocs de code sont copier-coller. Les diagrammes Mermaid se rendent nativement sur GitHub et dans la plupart des visualiseurs Markdown.

> **Note :** vous constatez un manque ou une ambiguïté ? Ouvrez une issue sur GitHub — la documentation fait partie du code.
