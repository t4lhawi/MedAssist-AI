# MedAssist

Professional remote monitoring and document-assisted AI for healthcare environments.

MedAssist is an open-source prototype that integrates IoT sensor monitoring (ESP32),
real-time visualization, alerting, document ingestion, and a retrieval-augmented
generation (RAG) assistant for question-answering over uploaded documents.

This repository contains a Docker-based development stack that runs the API backend,
an Ollama-based local LLM service by default, and a Vite React frontend.

## Key Features

- IoT data ingestion: ESP32-based sensors send temperature, humidity and air-quality readings.
- Real-time dashboard with charts and alerts.
- Document upload and indexing for RAG-powered Q&A.
- Role-based authentication with JWTs.
- Configurable LLM provider: Ollama (local), Groq, or Google Gemini.

## Architecture Overview

- backend/: FastAPI application that exposes the REST API, authentication, and RAG pipeline.
- frontend/: Vite + React UI for monitoring, documents, and assistant interaction.
- firmware/: ESP32 sensor firmware for data collection.
- chroma_db/: Local Chroma vector DB used for document embeddings.

## Quick Start (Development)

Prerequisites

- Docker Desktop (or Docker Engine)
- 4 GB RAM minimum (8 GB recommended for local LLMs)
- ~5 GB free disk space for model artifacts

1) Copy the environment template

```bash
cp .env.example .env
```

2) Build and start services

```bash
docker compose up --build -d
```

3) Install default models (one-time)

On macOS / Linux:

```bash
chmod +x setup_ollama.sh
./setup_ollama.sh
```

On Windows (PowerShell), wait for the Ollama container to be ready, then run:

```powershell
docker exec medassist_ollama ollama pull llama3.2
docker exec medassist_ollama ollama pull nomic-embed-text
docker exec medassist_api python seed_admin.py
```

4) Access the services

- Web UI: http://localhost:3000
- API docs: http://localhost:8000/docs

Default admin credentials (for development)

- Email: admin@medassist.ma
- Password: Admin@2026!

Note: change these defaults in production.

## Local Development (without Docker)

Backend

```bash
python -m venv .venv
source .venv/bin/activate   # or .venv\\Scripts\\activate on Windows
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuring LLM Providers

The default configuration uses Ollama locally. Alternatives include Groq and
Google Gemini. Configure the provider and credentials in the `.env` file:

Examples

```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2

# or for Groq
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_key

# or for Google Gemini
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
```

After changing `.env`, restart the backend:

```bash
docker compose restart backend
```

## ESP32 Firmware

- Open `firmware/esp32_sensor.ino` in the Arduino IDE or PlatformIO.
- Install dependencies (`DHTesp`, `ArduinoJson`) via the Library Manager.
- Configure Wi‑Fi credentials and `SERVER_URL` to point to your API host.

## Document Ingestion & Assistant

1. Upload PDFs via the Documents page in the web UI.
2. Wait until indexing completes (status: Indexed).
3. Use the Assistant page to ask questions based on uploaded documents.

## Useful Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View backend logs
docker compose logs -f backend

# Restart backend only
docker compose restart backend

# List Ollama models
docker exec medassist_ollama ollama list
```

## Default Alert Thresholds

- Temperature: 18 °C — 26 °C
- Humidity: 30% — 70%
- Air quality: up to 1000 ppm

Thresholds are defined in `backend/app/crud.py` as the `SEUILS` dictionary.

## Security & Disclaimer

This project is a pedagogical prototype and is not a medical device. It is
intended for research and demonstration purposes only and must not replace
certified medical equipment or professional judgement.

## Contributing

Contributions are welcome. Please open issues or pull requests with clear
descriptions of changes and testing instructions.

## License

This project is provided under the terms of the repository LICENSE.

---

If you'd like, I can also add a short CONTRIBUTING.md, update the `.env.example`,
or local development scripts. What would you like next?
