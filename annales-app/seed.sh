#!/bin/bash
# Script de seeding pour créer des données de test
# Usage: ./seed.sh [--config <path>]
#
# Prérequis: Les services doivent être démarrés (./start.sh dev)
#
# Ce script exécute le seeding Node.js dans le conteneur API pour :
# - Créer les utilisateurs de test
# - Uploader les examens PDF vers MinIO
# - Créer les signalements de test

set -euo pipefail

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Détecter le mode (dev ou prod) selon les conteneurs actifs
if docker ps --format '{{.Names}}' | grep -q 'annales-api-dev'; then
  COMPOSE_FILE="docker-compose.dev.yml"
  ENV_FILE=".env.dev"
  API_CONTAINER="annales-api-dev"
  echo -e "${GREEN}🔍 Mode développement détecté${NC}"
elif docker ps --format '{{.Names}}' | grep -q 'annales-api'; then
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env"
  API_CONTAINER="annales-api"
  echo -e "${GREEN}🔍 Mode production détecté${NC}"
else
  echo -e "${RED}❌ Aucun conteneur API actif.${NC}"
  echo "Lance d'abord ./start.sh dev ou ./start.sh prod"
  exit 1
fi

# Vérifier que le fichier de config existe
CONFIG_FILE="${1:-dev-seed.json}"
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}❌ Fichier de configuration non trouvé: $CONFIG_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}📄 Configuration: $CONFIG_FILE${NC}"

# Copier le fichier de config et les PDFs dans le conteneur
echo "📦 Copie des fichiers dans le conteneur..."

# Copier la config
docker cp "$CONFIG_FILE" "$API_CONTAINER:/app/seed-config.json"

# Copier les PDFs référencés dans la config
PDF_FILES=$(jq -r '.files[].path' "$CONFIG_FILE" 2>/dev/null | sort -u)
for pdf in $PDF_FILES; do
  if [ -f "$pdf" ]; then
    docker cp "$pdf" "$API_CONTAINER:/app/$pdf"
    echo "  📄 $pdf"
  else
    echo -e "${YELLOW}  ⚠️  Fichier non trouvé: $pdf${NC}"
  fi
done

# Exécuter le script de seeding dans le conteneur
echo ""
echo "🌱 Exécution du seeding..."
echo ""

# Utiliser -it seulement si on est dans un terminal interactif
if [ -t 0 ]; then
  docker exec -it "$API_CONTAINER" npx tsx src/scripts/seed.ts --config /app/seed-config.json
else
  docker exec "$API_CONTAINER" npx tsx src/scripts/seed.ts --config /app/seed-config.json
fi

# Nettoyer les fichiers temporaires copiés dans le conteneur
echo ""
echo "🧹 Nettoyage des fichiers temporaires du conteneur..."
docker exec "$API_CONTAINER" rm -f /app/seed-config.json
for pdf in $PDF_FILES; do
  docker exec "$API_CONTAINER" rm -f "/app/$pdf" 2>/dev/null || true
done

echo -e "${GREEN}✅ Seeding terminé!${NC}"
