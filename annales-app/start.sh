#!/bin/bash
set -euo pipefail

echo "🚀 Démarrage de la plateforme d'annales..."

if ! command -v docker &>/dev/null; then
  echo "❌ Docker n'est pas installé." ; exit 1
fi
if ! docker compose version &>/dev/null; then
  echo "❌ Docker Compose plugin manquant." ; exit 1
fi

if [ ! -f .env ]; then
  echo "📝 Création du fichier .env depuis .env.example..."
  cp .env.example .env
  echo "⚠️  Éditez .env puis relancez si besoin."
fi

echo "🔨 Build images..."
docker compose build

echo "▶️  Démarrage des services..."
docker compose up -d

echo "⏳ Attente des checks de santé..."
# attend que reverse-proxy soit healthy (les autres sont en depends_on: service_healthy)
for i in {1..60}; do
  if docker inspect --format='{{.State.Health.Status}}' annales-nginx 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 1
done

if curl -sf http://localhost:8080/api/health >/dev/null; then
  echo "✅ Services démarrés avec succès!"
  echo "🌐 Interface web: http://localhost:8080"
  echo "📖 API docs:     http://localhost:8080/api/docs"
  echo "❤️  Health:      http://localhost:8080/api/health"
else
  echo "❌ Reverse-proxy KO (port 8080). Logs:"
  docker logs annales-nginx || true
  exit 1
fi
