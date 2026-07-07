# 🏥 MedAssist AI

**Plateforme intelligente de surveillance hospitalière — 100% Gratuite**

> Projet de stage d'initiation · ENSA Oujda · CHU Mohammed VI  
> Aucune clé API payante requise — fonctionne entièrement en local avec Ollama

---

## ✨ Fonctionnalités

| Module | Description |
|---|---|
| **IoT (ESP32)** | Collecte automatique temp / humidité / qualité de l'air |
| **Tableau de bord** | Visualisation temps réel avec graphiques |
| **Alertes** | Déclenchement automatique selon des seuils |
| **Documents PDF** | Téléversement et indexation dans la base IA |
| **Assistant IA (RAG)** | Questions-réponses fondées sur vos documents — GRATUIT avec Ollama |
| **Authentification** | JWT sécurisé avec gestion des rôles |

---

## 🆓 Solutions IA gratuites disponibles

| Solution | Coût | Vitesse | Confidentialité | Qualité |
|---|---|---|---|---|
| **Ollama** ✅ (défaut) | 💚 Gratuit | Dépend de votre PC | 💚 100% local | ⭐⭐⭐ |
| **Groq** | 💚 Gratuit | 💚 Très rapide | ☁️ Cloud | ⭐⭐⭐⭐ |
| **Google Gemini** | 💚 Gratuit (1500 req/j) | 💚 Rapide | ☁️ Cloud | ⭐⭐⭐⭐ |

---

## 🚀 Démarrage rapide

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et lancé
- **4 Go de RAM minimum** (8 Go recommandés pour Ollama)
- **5 Go d'espace disque** (pour les modèles IA)

### Étape 1 — Copier la configuration

```bash
cp .env.example .env
```

Le fichier `.env` est déjà configuré pour Ollama. Vous pouvez le laisser tel quel.

### Étape 2 — Lancer les services

```bash
docker compose up --build -d
```

La première fois, cette commande peut prendre **5 à 10 minutes** (téléchargement des images Docker).

### Étape 3 — Installer les modèles IA (une seule fois)

**Sur Mac / Linux :**
```bash
chmod +x setup_ollama.sh
./setup_ollama.sh
```

**Sur Windows (PowerShell) :**
```powershell
# Attendre qu'Ollama soit prêt, puis :
docker exec medassist_ollama ollama pull llama3.2
docker exec medassist_ollama ollama pull nomic-embed-text
docker exec medassist_api python seed_admin.py
```

> ⏳ `llama3.2` pèse environ **2 Go** — le téléchargement peut prendre quelques minutes selon votre connexion.

### Étape 4 — Ouvrir l'application

| Service | Adresse |
|---|---|
| **Application web** | http://localhost:3000 |
| **API documentation** | http://localhost:8000/docs |

**Identifiants :**
- Email : `admin@medassist.ma`
- Mot de passe : `Admin@2026!`

---

## 🔄 Utiliser Groq à la place (option gratuite plus rapide)

Groq est une alternative cloud gratuite, beaucoup plus rapide qu'Ollama sur un PC peu puissant.

1. Créer un compte gratuit sur https://console.groq.com
2. Créer une clé API (gratuit, pas de carte bancaire requise)
3. Modifier `.env` :

```env
LLM_PROVIDER=groq
LLM_MODEL=llama3-8b-8192
GROQ_API_KEY=votre_cle_groq_ici
```

4. Redémarrer le backend :
```bash
docker compose restart backend
```

---

## 🔄 Utiliser Google Gemini (option gratuite)

Google Gemini Flash est gratuit jusqu'à 1500 requêtes par jour.

1. Aller sur https://aistudio.google.com/app/apikey
2. Cliquer "Create API Key" (gratuit, compte Google requis)
3. Modifier `.env` :

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
GEMINI_API_KEY=votre_cle_ici
```

4. Redémarrer :
```bash
docker compose restart backend
```

---

## 🔌 Configurer l'ESP32

1. Ouvrir `firmware/esp32_sensor.ino` dans l'IDE Arduino
2. Installer les bibliothèques (Library Manager) :
   - `DHTesp` par Bernd Giesecke
   - `ArduinoJson` par Benoit Blanchon
3. Modifier les valeurs en haut du fichier :

```cpp
const char* WIFI_SSID     = "NOM_WIFI";
const char* WIFI_PASSWORD = "MOT_DE_PASSE_WIFI";
const char* SERVER_URL    = "http://192.168.X.X:8000"; // IP de votre PC

// IDs des capteurs créés dans l'interface web :
const int CAPTEUR_ID_TEMP = 1;
const int CAPTEUR_ID_HUM  = 2;
```

4. Brancher l'ESP32, sélectionner `ESP32 Dev Module`, cliquer Upload

---

## 🤖 Utiliser l'assistant IA

1. Aller dans **Documents** → téléverser vos PDF
2. Attendre le statut **Indexé** ✅
3. Aller dans **Assistant IA** → poser vos questions

*Exemple : "Quelle est la température recommandée pour une salle de soins ?"*

---

## 🛑 Commandes utiles

```bash
# Démarrer
docker compose up -d

# Arrêter
docker compose down

# Voir les logs
docker compose logs -f backend

# Redémarrer un seul service
docker compose restart backend

# Lister les modèles Ollama installés
docker exec medassist_ollama ollama list
```

---

## 📋 Seuils d'alerte par défaut

| Paramètre | Min | Max |
|---|---|---|
| Température | 18 °C | 26 °C |
| Humidité | 30 % | 70 % |
| Qualité air | — | 1000 ppm |

Modifiables dans `backend/app/crud.py` → dictionnaire `SEUILS`.

---

## ⚠️ Avertissement

Prototype pédagogique. Ne remplace pas les dispositifs médicaux certifiés.
