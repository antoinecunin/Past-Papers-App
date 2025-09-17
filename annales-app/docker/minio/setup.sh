#!/bin/sh
set -e

mc alias set local http://$S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY --api S3v4

# ⏳ Attend que MinIO soit prêt
echo "Waiting for MinIO to be ready…"
# retry pendant ~2 minutes (120s) avec mc ready qui sort 0 quand prêt
i=0
until mc ready local >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -ge 120 ]; then
    echo "MinIO not ready after 120s"; exit 1
  fi
  sleep 1
done

mc mb -p local/$S3_BUCKET || true
mc anonymous set none local/$S3_BUCKET
echo "Bucket $S3_BUCKET ready."
