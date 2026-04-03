#!/bin/bash
# Seeding script to create test data
# Usage: ./seed.sh [--config <path>]
#
# Prerequisites: Services must be running (./start.sh dev)
#
# This script runs the Node.js seeding inside the API container to:
# - Create test users
# - Upload exam PDFs to Garage (S3)
# - Create test reports

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect mode (dev or prod) based on active containers
if docker ps --format '{{.Names}}' | grep -q 'annales-api-dev'; then
  COMPOSE_FILE="docker-compose.dev.yml"
  ENV_FILE=".env.dev"
  API_CONTAINER="annales-api-dev"
  echo -e "${GREEN}🔍 Development mode detected${NC}"
elif docker ps --format '{{.Names}}' | grep -q 'annales-api'; then
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env"
  API_CONTAINER="annales-api"
  echo -e "${GREEN}🔍 Production mode detected${NC}"
else
  echo -e "${RED}❌ No active API container found.${NC}"
  echo "Start services first with ./start.sh dev or ./start.sh prod"
  exit 1
fi

# Check that the config file exists
CONFIG_FILE="${1:-dev-seed.json}"
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}📄 Configuration: $CONFIG_FILE${NC}"

# Copy config file and PDFs into the container
echo "📦 Copying files into the container..."

# Copy config
docker cp "$CONFIG_FILE" "$API_CONTAINER:/app/seed-config.json"

# Copy PDFs referenced in the config
PDF_FILES=$(jq -r '.files[].path' "$CONFIG_FILE" 2>/dev/null | sort -u)
for pdf in $PDF_FILES; do
  if [ -f "$pdf" ]; then
    docker cp "$pdf" "$API_CONTAINER:/app/$pdf"
    echo "  📄 $pdf"
  else
    echo -e "${YELLOW}  ⚠️  File not found: $pdf${NC}"
  fi
done

# Run the seeding script inside the container
echo ""
echo "🌱 Running seeding..."
echo ""

# Use -it only if running in an interactive terminal
if [ -t 0 ]; then
  docker exec -it "$API_CONTAINER" npx tsx src/scripts/seed.ts --config /app/seed-config.json
else
  docker exec "$API_CONTAINER" npx tsx src/scripts/seed.ts --config /app/seed-config.json
fi

# Clean up temporary files copied into the container
echo ""
echo "🧹 Cleaning up temporary files from the container..."
docker exec "$API_CONTAINER" rm -f /app/seed-config.json
for pdf in $PDF_FILES; do
  docker exec "$API_CONTAINER" rm -f "/app/$pdf" 2>/dev/null || true
done

echo -e "${GREEN}✅ Seeding complete!${NC}"
