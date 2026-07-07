import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, capteurs, mesures, alertes, documents, chat
from . import models

# Créer les tables au démarrage
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MedAssist AI",
    description="Plateforme intelligente de surveillance hospitalière basée sur l'IA",
    version="1.0.0",
)

# CORS – autoriser le frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure tous les routers
app.include_router(auth.router)
app.include_router(capteurs.router)
app.include_router(mesures.router)
app.include_router(alertes.router)
app.include_router(documents.router)
app.include_router(chat.router)

@app.get("/")
def root():
    return {"message": "MedAssist AI est opérationnel 🏥", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
