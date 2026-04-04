#!/bin/bash
set -euo pipefail

BACKUP_DIR="backups"
MAX_BACKUPS=2

# Detect environment
if docker ps --format '{{.Names}}' | grep -q 'annales-mongo-dev'; then
  MONGO_CONTAINER="annales-mongo-dev"
  GARAGE_CONTAINER="annales-garage-dev"
  DB_NAME="annales-dev"
  ENV_FILE=".env.dev"
elif docker ps --format '{{.Names}}' | grep -q 'annales-mongo'; then
  MONGO_CONTAINER="annales-mongo"
  GARAGE_CONTAINER="annales-garage"
  DB_NAME="annales"
  ENV_FILE=".env"
else
  echo "❌ No running containers found. Start services first."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

usage() {
  echo "📦 Usage: $0 [COMMAND]"
  echo ""
  echo "COMMANDS:"
  echo "   (none)          Create a new backup"
  echo "   list            List available backups"
  echo "   restore         Restore the most recent backup"
  echo "   restore <id>    Restore a specific backup"
  echo "   --help          Show this help"
  echo ""
  echo "EXAMPLES:"
  echo "   $0              # Create a backup"
  echo "   $0 list         # Show available backups"
  echo "   $0 restore      # Restore most recent"
  echo ""
  echo "FILES:"
  echo "   $BACKUP_DIR/    Backup storage (max $MAX_BACKUPS kept)"
}

do_backup() {
  local timestamp=$(date +%Y%m%d-%H%M%S)
  local dir="$BACKUP_DIR/$timestamp"
  mkdir -p "$dir"

  echo "📦 Creating backup $timestamp..."

  # MongoDB dump
  echo "   MongoDB..."
  docker exec "$MONGO_CONTAINER" mongodump --db "$DB_NAME" --archive --quiet > "$dir/mongo.archive"

  # Garage files via S3
  echo "   Garage files..."
  docker exec "$GARAGE_CONTAINER" /garage bucket info "$S3_BUCKET" >/dev/null 2>&1 || {
    echo "   ⚠️  Bucket $S3_BUCKET not found, skipping files."
    touch "$dir/files.tar"
  }

  # Use AWS CLI via docker to list and download all objects
  docker run --rm --network container:"$GARAGE_CONTAINER" \
    --user "$(id -u):$(id -g)" \
    -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
    -e AWS_DEFAULT_REGION=garage \
    -v "$(pwd)/$dir:/backup" \
    amazon/aws-cli:latest \
    s3 sync "s3://$S3_BUCKET" /backup/files \
    --endpoint-url "http://127.0.0.1:3900" \
    --quiet 2>/dev/null || {
    echo "   ⚠️  Could not backup Garage files (AWS CLI sync failed)."
  }

  # Size info
  local size=$(du -sh "$dir" 2>/dev/null | cut -f1)
  echo "✅ Backup $timestamp created ($size)"

  # Cleanup old backups
  local count=$(ls -1d "$BACKUP_DIR"/[0-9]* 2>/dev/null | wc -l)
  if [ "$count" -gt "$MAX_BACKUPS" ]; then
    local to_remove=$((count - MAX_BACKUPS))
    ls -1d "$BACKUP_DIR"/[0-9]* | head -n "$to_remove" | while read old; do
      echo "🗑️  Removing old backup $(basename "$old")"
      rm -rf "$old"
    done
  fi
}

do_list() {
  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
    echo "No backups found."
    return
  fi

  echo "📋 Available backups:"
  echo ""
  for dir in $(ls -1d "$BACKUP_DIR"/[0-9]* 2>/dev/null | sort -r); do
    local name=$(basename "$dir")
    local size=$(du -sh "$dir" 2>/dev/null | cut -f1)
    local mongo_ok="❌"
    local files_ok="❌"
    [ -f "$dir/mongo.archive" ] && mongo_ok="✓"
    [ -d "$dir/files" ] && files_ok="✓"
    echo "  $name  ($size)  mongo:$mongo_ok  files:$files_ok"
  done
}

do_restore() {
  local target="$1"

  if [ -z "$target" ]; then
    # Find most recent
    target=$(ls -1d "$BACKUP_DIR"/[0-9]* 2>/dev/null | sort -r | head -1)
    if [ -z "$target" ]; then
      echo "❌ No backups found."
      exit 1
    fi
  else
    target="$BACKUP_DIR/$target"
  fi

  if [ ! -d "$target" ]; then
    echo "❌ Backup not found: $target"
    echo "Run '$0 list' to see available backups."
    exit 1
  fi

  local name=$(basename "$target")
  echo "⚠️  This will REPLACE all current data with backup $name."
  read -p "Are you sure? Type 'yes' to confirm: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
  fi

  echo "📦 Restoring from $name..."

  # MongoDB restore
  if [ -f "$target/mongo.archive" ]; then
    echo "   MongoDB..."
    docker exec -i "$MONGO_CONTAINER" mongorestore --db "$DB_NAME" --archive --drop --quiet < "$target/mongo.archive"
    echo "   ✓ MongoDB restored"
  else
    echo "   ⚠️  No MongoDB archive found, skipping."
  fi

  # Garage files restore
  if [ -d "$target/files" ]; then
    echo "   Garage files..."
    docker run --rm --network container:"$GARAGE_CONTAINER" \
      --user "$(id -u):$(id -g)" \
      -e AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
      -e AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
      -e AWS_DEFAULT_REGION=garage \
      -v "$(pwd)/$target/files:/backup" \
      amazon/aws-cli:latest \
      s3 sync /backup "s3://$S3_BUCKET" \
      --endpoint-url "http://127.0.0.1:3900" \
      --quiet 2>/dev/null || {
      echo "   ⚠️  Could not restore Garage files."
    }
    echo "   ✓ Garage files restored"
  else
    echo "   ⚠️  No files directory found, skipping."
  fi

  echo "✅ Restore complete from $name"
}

# Main
case "${1:-}" in
  list)
    do_list
    ;;
  restore)
    do_restore "${2:-}"
    ;;
  --help|-h)
    usage
    ;;
  "")
    do_backup
    ;;
  *)
    echo "❌ Unknown command: $1"
    echo "💡 Use --help for usage information"
    exit 1
    ;;
esac
