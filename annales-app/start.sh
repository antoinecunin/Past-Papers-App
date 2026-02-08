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
    docker volume rm annales-app_mongo_data_dev annales-app_minio_data_dev 2>/dev/null || true
  else
    echo "🗑️  Removing prod volumes..."
    docker volume rm annales-app_mongo_data annales-app_minio_data 2>/dev/null || true
  fi

  echo "✅ Cleanup complete"
fi

echo "🔨 Building images ($MODE)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "▶️  Starting services ($MODE)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

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
    echo "   - MinIO:          http://localhost:$MINIO_EXTERNAL_PORT"
    echo "   - MinIO Console:  http://localhost:$MINIO_CONSOLE_EXTERNAL_PORT"
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
