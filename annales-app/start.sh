#!/bin/bash
set -euo pipefail

MODE=${1:-prod}
CLEAN=false
SEED=false

# Parser les arguments
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
      echo "   dev    Démarrage en mode développement avec hot reload"
      echo "   prod   Démarrage en mode production"
      echo ""
      echo "OPTIONS:"
      echo "   --clean    Supprime les volumes de données avant le démarrage"
      echo "   --seed     Crée des données de test selon dev-seed.json (dev uniquement)"
      echo "   --help     Affiche cette aide"
      echo ""
      echo "EXEMPLES:"
      echo "   $0 dev                    # Dev normal avec persistance"
      echo "   $0 dev --clean           # Dev propre (volumes supprimés)"
      echo "   $0 dev --clean --seed    # Dev propre + données de test"
      echo "   $0 prod --clean          # Prod propre"
      echo ""
      echo "FICHIERS:"
      echo "   dev-seed.json            Configuration des données de test"
      echo "   .env.dev / .env          Variables d'environnement"
      exit 0
      ;;
    dev|prod)
      MODE=$1
      shift
      ;;
    *)
      echo "❌ Argument inconnu: $1"
      echo "💡 Utilisez --help pour voir l'aide"
      exit 1
      ;;
  esac
done

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "❌ Usage: $0 [dev|prod] [--clean] [--seed]"
  echo "   dev:   Démarrage en mode développement avec hot reload"
  echo "   prod:  Démarrage en mode production"
  echo "   --clean: Supprime les volumes de données avant le démarrage"
  echo "   --seed:  Crée des données de test (dev uniquement)"
  echo ""
  echo "Exemples:"
  echo "   $0 dev --clean --seed  # Dev propre avec données de test"
  echo "   $0 prod --clean        # Prod propre"
  echo "   $0 dev                 # Dev normal"
  exit 1
fi

# --seed uniquement en dev
if [[ "$SEED" == "true" && "$MODE" != "dev" ]]; then
  echo "❌ L'option --seed n'est disponible qu'en mode dev"
  exit 1
fi

echo "🚀 Démarrage de la plateforme d'annales en mode $MODE..."

if ! command -v docker &>/dev/null; then
  echo "❌ Docker n'est pas installé." ; exit 1
fi
if ! docker compose version &>/dev/null; then
  echo "❌ Docker Compose plugin manquant." ; exit 1
fi

# Configuration selon le mode
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

# Charger les variables d'environnement pour obtenir les ports
set -a
source "$ENV_FILE"
set +a

# Vérification du fichier d'environnement
if [ ! -f "$ENV_FILE" ]; then
  if [ "$MODE" = "prod" ]; then
    echo "📝 Création du fichier .env depuis .env.example..."
    cp .env.example .env
    echo "⚠️  Éditez .env puis relancez si besoin."
  else
    echo "❌ Fichier $ENV_FILE manquant. Création automatique..."
    echo "📝 Le fichier $ENV_FILE a été créé automatiquement."
  fi
fi

# 🧹 Nettoyage des volumes si demandé
if [ "$CLEAN" = "true" ]; then
  echo "🧹 Nettoyage des volumes de données ($MODE)..."
  
  # Arrêter les services s'ils tournent
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q >/dev/null 2>&1; then
    echo "⏹️  Arrêt des services en cours..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
  fi
  
  # Supprimer les volumes
  if [ "$MODE" = "dev" ]; then
    echo "🗑️  Suppression des volumes dev..."
    docker volume rm annales-app_mongo_data_dev annales-app_minio_data_dev 2>/dev/null || true
  else
    echo "🗑️  Suppression des volumes prod..."
    docker volume rm annales-app_mongo_data annales-app_minio_data 2>/dev/null || true
  fi
  
  echo "✅ Nettoyage terminé"
fi

echo "🔨 Build images ($MODE)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "▶️  Démarrage des services ($MODE)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "⏳ Attente des checks de santé..."
# attend que reverse-proxy soit healthy
for i in {1..60}; do
  if docker inspect --format='{{.State.Health.Status}}' "$NGINX_CONTAINER" 2>/dev/null | grep -q healthy; then
    break
  fi
  sleep 1
done

if curl -sf "http://localhost:$WEB_PORT/api/health" >/dev/null; then
  echo "✅ Services démarrés avec succès en mode $MODE!"
  echo "🌐 Interface web: http://localhost:$WEB_PORT"
  echo "📖 API docs:     http://localhost:$WEB_PORT/api/docs"
  echo "❤️  Health:      http://localhost:$WEB_PORT/api/health"
  
  if [ "$MODE" = "dev" ]; then
    echo ""
    echo "🔥 Mode développement actif:"
    echo "   - Hot reload activé pour Web et API"
    echo "   - API directe:    http://localhost:$API_EXTERNAL_PORT"
    echo "   - Web directe:    http://localhost:$VITE_PORT"
    echo "   - MongoDB:        localhost:$MONGO_EXTERNAL_PORT"
    echo "   - MinIO:          http://localhost:$MINIO_EXTERNAL_PORT"
    echo "   - MinIO Console:  http://localhost:$MINIO_CONSOLE_EXTERNAL_PORT"
  fi
  
  # 🌱 Création de données de test si demandé
  if [ "$SEED" = "true" ]; then
    echo ""
    ./seed.sh
  fi
else
  echo "❌ Reverse-proxy KO (port $WEB_PORT). Logs:"
  docker logs "$NGINX_CONTAINER" || true
  exit 1
fi
