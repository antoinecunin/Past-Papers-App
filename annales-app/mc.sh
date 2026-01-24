#!/bin/bash
# Utilitaire MinIO Client pour debug/admin du stockage S3
# Usage: ./mc.sh [commande mc]
# Exemples:
#   ./mc.sh ls minio/annales-dev
#   ./mc.sh du minio/annales-dev
#   ./mc.sh cat minio/annales-dev/fichier.pdf

set -euo pipefail

# Détecter le mode (dev ou prod) selon les conteneurs actifs
if docker ps --format '{{.Names}}' | grep -q 'annales-minio-dev'; then
  COMPOSE_FILE="docker-compose.dev.yml"
  ENV_FILE=".env.dev"
elif docker ps --format '{{.Names}}' | grep -q 'annales-minio'; then
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env"
else
  echo "❌ Aucun conteneur MinIO actif. Lance d'abord ./start.sh dev ou ./start.sh prod"
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "Usage: $0 <commande mc>"
  echo ""
  echo "Exemples:"
  echo "  $0 ls minio/annales-dev      # Lister les fichiers"
  echo "  $0 du minio/annales-dev      # Espace utilisé"
  echo "  $0 stat minio/annales-dev/x  # Infos sur un fichier"
  echo "  $0 cat minio/annales-dev/x   # Afficher un fichier"
  echo "  $0 rm minio/annales-dev/x    # Supprimer un fichier"
  exit 0
fi

exec docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm mc "$@"
