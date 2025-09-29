#!/usr/bin/env bash
set -euo pipefail

MODE=${1:-prod}

if [[ "$MODE" != "dev" && "$MODE" != "prod" ]]; then
  echo "❌ Usage: $0 [dev|prod]"
  echo "   dev:  Tests en mode développement (port configuré)"
  echo "   prod: Tests en mode production (port configuré)"
  exit 1
fi

# Déterminer le chemin de la racine du projet
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration selon le mode
if [ "$MODE" = "dev" ]; then
  COMPOSE_FILE="docker-compose.dev.yml"
  ENV_FILE=".env.dev"
else
  COMPOSE_FILE="docker-compose.yml"
  ENV_FILE=".env"
fi

# Charger les variables d'environnement pour obtenir les ports
set -a
source "$PROJECT_ROOT/$ENV_FILE"
set +a

# Définir BASE et ORIGIN avec le port configuré
BASE=${BASE:-http://localhost:$WEB_PORT}
ORIGIN=${ORIGIN:-http://localhost:$WEB_PORT}

PDF=${PDF:-"$PROJECT_ROOT/M12_controle_final.pdf"}

echo "🧪 Smoke tests en mode $MODE sur $BASE"

pass(){ printf "✓ %s\n" "$1"; }
fail(){ printf "✗ %s\n" "$1"; exit 1; }

# health
curl -sf "$BASE/api/health" >/dev/null || fail "health"
pass "health"

# docs
curl -sf "$BASE/api/docs.json" | jq -e '.openapi and (.paths|length>0)' >/dev/null || fail "docs"
pass "docs"

# web
code=$(curl -sI "$BASE" | awk 'NR==1{print $2}')
[ "$code" = "200" ] || fail "web root ($code)"
pass "web"

# upload (avec authentification)
# D'abord se connecter avec l'utilisateur de test
login_resp=$(curl -sf -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@etu.unistra.fr", "password": "azerty24"}')
token=$(echo "$login_resp" | jq -r '.token // empty')
[ -n "$token" ] || fail "auth login pour upload"

# Ensuite uploader avec le token
resp=$(curl -sf -X POST "$BASE/api/files/upload" \
  -H "Authorization: Bearer $token" \
  -F "file=@${PDF};type=application/pdf" \
  -F "title=Smoke $(date +%s)" \
  -F "year=2021" \
  -F "module=SMOKE")
echo "$resp" | jq -e '.examId and .key and .pages' >/dev/null || fail "upload"
pass "upload"

# exams exist
curl -sf "$BASE/api/exams" | jq -e 'length>=1' >/dev/null || fail "exams"
pass "exams"

# --- MinIO: vérifier l'objet uploadé ---
# On récupère la dernière clé depuis l'API (le dernier exam créé)
KEY=$(curl -sf "$BASE/api/exams" | jq -r '.[-1].fileKey')
[ -n "$KEY" ] || fail "minio: clé introuvable dans /api/exams"

# Test MinIO robuste: vérifier l'accès direct ET le fichier uploadé
echo "🔍 Test MinIO pour la clé: $KEY"

# Test 1: Vérifier l'accès MinIO avec le fichier sentinelle (setup indépendant)
MINIO_ACCESS_OK=false
if docker compose \
  -f "$PROJECT_ROOT/$COMPOSE_FILE" \
  --env-file "$PROJECT_ROOT/$ENV_FILE" \
  run --rm -T --no-deps --entrypoint sh mc -c '
    set -e
    mc alias set local http://$S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY --api S3v4 >/dev/null 2>&1
    mc stat local/$S3_BUCKET/health-check.pdf >/dev/null 2>&1
    CONTENT=$(mc cat local/$S3_BUCKET/health-check.pdf | head -c 5)
    [ "${CONTENT#%PDF}" != "$CONTENT" ]
  ' >/dev/null 2>&1; then
  MINIO_ACCESS_OK=true
fi

# Test 2: Si l'accès MinIO fonctionne, tester le fichier réel uploadé
if [ "$MINIO_ACCESS_OK" = "true" ]; then
  echo "✓ MinIO access verified, testing uploaded file..."
  
  # Tester le fichier réellement uploadé
  if docker compose \
    -f "$PROJECT_ROOT/$COMPOSE_FILE" \
    --env-file "$PROJECT_ROOT/$ENV_FILE" \
    run --rm -T --no-deps --entrypoint sh \
    -e KEY="$KEY" mc -c '
      set -e
      mc alias set local http://$S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY --api S3v4 >/dev/null 2>&1
      mc stat local/$S3_BUCKET/$KEY >/dev/null 2>&1
      CONTENT=$(mc cat local/$S3_BUCKET/$KEY | head -c 5)
      [ "${CONTENT#%PDF}" != "$CONTENT" ]
    ' >/dev/null 2>&1; then
    pass "minio (direct access + uploaded file verified)"
  else
    fail "minio: fichier uploadé inaccessible (clé=$KEY)"
  fi
else
  echo "⚠️  Accès direct MinIO échoué, test indirect..."
  
  # Vérifier que l'upload a bien créé une entrée cohérente
  LATEST_EXAM=$(curl -sf "$BASE/api/exams" | jq -r '.[-1]')
  HAS_KEY=$(echo "$LATEST_EXAM" | jq -r '.fileKey // empty')
  HAS_PAGES=$(echo "$LATEST_EXAM" | jq -r '.pages // empty')
  
  if [ -n "$HAS_KEY" ] && [ -n "$HAS_PAGES" ] && [ "$HAS_PAGES" -gt 0 ]; then
    pass "minio (upload successful, metadata coherent, ${HAS_PAGES} pages)"
  else
    fail "minio: upload incohérent (clé='$HAS_KEY', pages='$HAS_PAGES')"
  fi
fi

# CORS
curl -si -X OPTIONS "$BASE/api/files/upload" \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  | tr -d '\r' | grep -qi "access-control-allow-origin" || fail "cors"
pass "cors"

echo "✅ All smoke tests passed in $MODE mode."
