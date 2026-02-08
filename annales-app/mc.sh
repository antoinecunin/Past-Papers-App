#!/bin/bash
# MinIO Client utility for debug/admin of S3 storage
# Usage: ./mc.sh [mc command]
# Examples:
#   ./mc.sh ls minio/annales-dev
#   ./mc.sh du minio/annales-dev
#   ./mc.sh cat minio/annales-dev/file.pdf

set -euo pipefail

# Detect mode (dev or prod) based on active containers
if docker ps --format '{{.Names}}' | grep -q 'annales-minio-dev'; then
  COMPOSE_FILE="docker-compose.dev.yml"
  ENV_FILE=".env.dev"
elif docker ps --format '{{.Names}}' | grep -q 'annales-minio'; then
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env"
else
  echo "❌ No active MinIO container found. Start services first with ./start.sh dev or ./start.sh prod"
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "Usage: $0 <mc command>"
  echo ""
  echo "Examples:"
  echo "  $0 ls minio/annales-dev      # List files"
  echo "  $0 du minio/annales-dev      # Disk usage"
  echo "  $0 stat minio/annales-dev/x  # File info"
  echo "  $0 cat minio/annales-dev/x   # Display a file"
  echo "  $0 rm minio/annales-dev/x    # Delete a file"
  exit 0
fi

exec docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm mc "$@"
