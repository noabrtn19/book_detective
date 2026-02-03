#!/bin/bash

# Nom du projet : Book Detective
echo "🚀 Démarrage de l'environnement de développement..."

# 1. Lancement du Backend
echo "📦 Initialisation du Backend (FastAPI)..."
cd server || exit
source .venv/bin/activate

# On utilise uvicorn pour profiter du --reload pendant le dev
# On lance en arrière-plan (&)
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# On s'assure que le backend s'arrête si on coupe le script
trap "echo '🛑 Arrêt des serveurs...'; kill $BACKEND_PID; exit" SIGINT SIGTERM EXIT

echo "✅ Backend en cours de lancement (PID: $BACKEND_PID)"
cd ..

# 2. Pause pour l'initialisation
echo "⏳ Attente du démarrage des modèles ML..."
sleep 3

# 3. Lancement du Frontend
echo "🎨 Initialisation du Frontend (Angular)..."
cd client || exit
# ng serve s'occupe de rester au premier plan
ng serve --port 4200