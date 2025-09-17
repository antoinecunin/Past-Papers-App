#!/usr/bin/env bash
set -euo pipefail

BASE=${BASE:-http://localhost:8080}
ORIGIN=${ORIGIN:-http://localhost:8080}
PDF=${PDF:-/home/antoine/M12_controle_final.pdf}

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

# upload
resp=$(curl -sf -X POST "$BASE/api/files/upload" \
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

docker compose run --rm --entrypoint '' minio-setup sh -lc "
  set -e
  mc alias set local http://\$S3_ENDPOINT \$S3_ACCESS_KEY \$S3_SECRET_KEY --api S3v4 >/dev/null 2>&1
  # Stat de l'objet exact
  mc stat local/\$S3_BUCKET/$KEY >/dev/null
  # Doit commencer par %PDF-
  mc cat  local/\$S3_BUCKET/$KEY | head -c 5
" | grep -q '^%PDF' || fail "minio object"

pass "minio"

# CORS
curl -si -X OPTIONS "$BASE/api/files/upload" \
  -H "Origin: ${ORIGIN}" \
  -H "Access-Control-Request-Method: POST" \
  | tr -d '\r' | grep -qi "access-control-allow-origin" || fail "cors"
pass "cors"

echo "All smoke tests passed."
