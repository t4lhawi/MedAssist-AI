#!/bin/bash
# ════════════════════════════════════════════════════════════
#  MedAssist AI – Script d'installation des modèles Ollama
#  À exécuter UNE SEULE FOIS après "docker compose up -d"
# ════════════════════════════════════════════════════════════

set -e

echo ""
echo "════════════════════════════════════════════"
echo "  MedAssist AI – Installation des modèles"
echo "════════════════════════════════════════════"
echo ""

echo "⏳ Attente du démarrage d'Ollama..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 3
  echo "   ...en attente"
done
echo "✅ Ollama est prêt !"
echo ""

echo "📥 Téléchargement de llama3.2 (modèle principal, ~2 Go)..."
docker exec medassist_ollama ollama pull llama3.2
echo "✅ llama3.2 téléchargé"
echo ""

echo "📥 Téléchargement de nomic-embed-text (embeddings, ~274 Mo)..."
docker exec medassist_ollama ollama pull nomic-embed-text
echo "✅ nomic-embed-text téléchargé"
echo ""

echo "📥 Création du compte administrateur..."
docker exec medassist_api python seed_admin.py
echo ""

echo "════════════════════════════════════════════"
echo "  ✅ Installation terminée !"
echo "════════════════════════════════════════════"
echo ""
echo "  → Application web : http://localhost:3000"
echo "  → API (Swagger)   : http://localhost:8000/docs"
echo "  → Email admin     : admin@medassist.ma"
echo "  → Mot de passe    : Admin@2026!"
echo ""
echo "  ⚠️  Changez ce mot de passe après la 1ère connexion."
echo ""
