#!/bin/bash
set -euo pipefail

MODE=${1:-prod}
CLEAN=false
SEED=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --clean)
      CLEAN=true
      shift
      ;;
    --seed)
      SEED=true
      shift
      ;;
    --help|-h)
      echo "📖 Usage: $0 [dev|prod] [OPTIONS]"
      echo ""
      echo "MODES:"
      echo "   dev    Start in development mode with hot reload"
      echo "   prod   Start in production mode"
      echo ""
      echo "OPTIONS:"
      echo "   --clean    Remove data volumes before starting"
      echo "   --seed     Create test data from dev-seed.json (dev only)"
      echo "   --help     Show this help"
      echo ""
      echo "EXAMPLES:"
      echo "   $0 dev                    # Dev with data persistence"
      echo "   $0 dev --clean           # Clean dev (volumes removed)"
      echo "   $0 dev --clean --seed    # Clean dev + test data"
      echo "   $0 prod --clean          # Clean prod"
      echo ""
      echo "FILES:"
      echo "   dev-seed.json            Test data configuration"
      echo "   .env.dev / .env          Environment variables"
      exit 0
      ;;
    dev|prod)
      MODE=$1
      shift
      ;;
    *)
      echo "❌ Unknown argument: $1"
      echo "💡 Use --help for usage information"
      exit 1
      ;;
  esac
done

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "❌ Usage: $0 [dev|prod] [--clean] [--seed]"
  echo "   dev:   Start in development mode with hot reload"
  echo "   prod:  Start in production mode"
  echo "   --clean: Remove data volumes before starting"
  echo "   --seed:  Create test data (dev only)"
  echo ""
  echo "Examples:"
  echo "   $0 dev --clean --seed  # Clean dev with test data"
  echo "   $0 prod --clean        # Clean prod"
  echo "   $0 dev                 # Normal dev"
  exit 1
fi

# --seed only in dev
if [[ "$SEED" == "true" && "$MODE" != "dev" ]]; then
  echo "❌ The --seed option is only available in dev mode"
  exit 1
fi

echo "🚀 Starting the platform in $MODE mode..."

if ! command -v docker &>/dev/null; then
  echo "❌ Docker is not installed." ; exit 1
fi
if ! docker compose version &>/dev/null; then
  echo "❌ Docker Compose plugin is missing." ; exit 1
fi

# Configuration based on mode
if [ "$MODE" = "dev" ]; then
  COMPOSE_FILE="docker-compose.dev.yml"
  ENV_FILE=".env.dev"
  CONTAINER_PREFIX="dev"
  NGINX_CONTAINER="annales-nginx-dev"
else
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env"
  CONTAINER_PREFIX=""
  NGINX_CONTAINER="annales-nginx"
fi

# Load environment variables to get ports
set -a
source "$ENV_FILE"
set +a

# Check environment file
if [ ! -f "$ENV_FILE" ]; then
  if [ "$MODE" = "prod" ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Edit .env then restart if needed."
  else
    echo "❌ File $ENV_FILE is missing. Creating automatically..."
    echo "📝 File $ENV_FILE has been created automatically."
  fi
fi

# 🧹 Clean volumes if requested
if [ "$CLEAN" = "true" ]; then
  echo "🧹 Cleaning data volumes ($MODE)..."

  # Stop services if running
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q >/dev/null 2>&1; then
    echo "⏹️  Stopping running services..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
  fi

  # Remove volumes
  if [ "$MODE" = "dev" ]; then
    echo "🗑️  Removing dev volumes..."
    docker volume rm annales-app_mongo_data_dev annales-app_garage_meta_dev annales-app_garage_data_dev 2>/dev/null || true
  else
    echo "🗑️  Removing prod volumes..."
    docker volume rm annales-app_mongo_data annales-app_garage_meta annales-app_garage_data 2>/dev/null || true
  fi

  echo "✅ Cleanup complete"
fi

echo "🔨 Building images ($MODE)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "▶️  Starting services ($MODE)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Initialize Garage S3 storage (layout, bucket, key)
echo "⏳ Initializing Garage S3 storage..."
GARAGE_CONTAINER=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q garage 2>/dev/null)
if [ -n "$GARAGE_CONTAINER" ]; then
  # Wait for Garage to be ready
  for i in {1..120}; do
    if docker exec "$GARAGE_CONTAINER" /garage status >/dev/null 2>&1; then break; fi
    sleep 1
  done

  # Assign layout if needed
  if docker exec "$GARAGE_CONTAINER" /garage status 2>/dev/null | grep -q "NO ROLE ASSIGNED"; then
    NODE_ID=$(docker exec "$GARAGE_CONTAINER" /garage status 2>/dev/null | grep -oE '^[0-9a-f]{16}' | head -1)
    if [ -n "$NODE_ID" ]; then
      docker exec "$GARAGE_CONTAINER" /garage layout assign -z dc1 -c 1G "$NODE_ID" 2>/dev/null
      docker exec "$GARAGE_CONTAINER" /garage layout apply --version 1 2>/dev/null
      echo "   Layout applied."
    fi
  else
    echo "   Layout already configured."
  fi

  # Create bucket
  docker exec "$GARAGE_CONTAINER" /garage bucket create "$S3_BUCKET" 2>/dev/null || echo "   Bucket '$S3_BUCKET' already exists."

  # Create key and grant permissions
  KEY_OUTPUT=$(docker exec "$GARAGE_CONTAINER" /garage key create annales-app-key 2>/dev/null || echo "exists")
  if echo "$KEY_OUTPUT" | grep -q "Key ID:"; then
    NEW_ACCESS_KEY=$(echo "$KEY_OUTPUT" | grep "Key ID:" | awk '{print $3}')
    NEW_SECRET_KEY=$(echo "$KEY_OUTPUT" | grep "Secret key:" | awk '{print $3}')
    echo ""
    echo "   ⚠️  New S3 credentials generated by Garage:"
    echo "      S3_ACCESS_KEY=$NEW_ACCESS_KEY"
    echo "      S3_SECRET_KEY=$NEW_SECRET_KEY"
    echo "      Update your $ENV_FILE with these values!"
    echo ""
  fi

  # Get key ID and grant access
  KEY_ID=$(docker exec "$GARAGE_CONTAINER" /garage key list 2>/dev/null | grep "annales-app-key" | awk '{print $1}')
  if [ -n "$KEY_ID" ]; then
    docker exec "$GARAGE_CONTAINER" /garage bucket allow --read --write --owner "$S3_BUCKET" --key "$KEY_ID" 2>/dev/null || true
    echo "   Garage S3 ready (key: $KEY_ID)."
  fi
fi

echo "⏳ Waiting for health checks..."
# Wait for reverse proxy to be healthy
for i in {1..60}; do
  if docker inspect --format='{{.State.Health.Status}}' "$NGINX_CONTAINER" 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 1
done

if curl -sf "http://localhost:$WEB_PORT/api/health" >/dev/null; then
  echo "✅ Services started successfully in $MODE mode!"
  echo "🌐 Web interface: http://localhost:$WEB_PORT"
  echo "📖 API docs:      http://localhost:$WEB_PORT/api/docs"
  echo "❤️  Health:       http://localhost:$WEB_PORT/api/health"

  if [ "$MODE" = "dev" ]; then
    echo ""
    echo "🔥 Development mode active:"
    echo "   - Hot reload enabled for Web and API"
    echo "   - Direct API:     http://localhost:$API_EXTERNAL_PORT"
    echo "   - Direct Web:     http://localhost:$VITE_PORT"
    echo "   - MongoDB:        localhost:$MONGO_EXTERNAL_PORT"
    echo "   - Garage S3 API:  http://localhost:${GARAGE_S3_EXTERNAL_PORT:-3900}"
  fi

  # 🌱 Create test data if requested
  if [ "$SEED" = "true" ]; then
    echo ""
    ./seed.sh
  fi
else
  echo "❌ Reverse proxy failed (port $WEB_PORT). Logs:"
  docker logs "$NGINX_CONTAINER" || true
  exit 1
fi
