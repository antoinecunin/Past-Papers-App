#!/bin/bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

DRY_RUN=false
DIRECTORY=""
PATTERN=""
COOKIE_FILE=""
API_URL=""

show_help() {
  echo "📦 Usage: $0 <directory> <pattern> [OPTIONS]"
  echo ""
  echo "Import PDF files in bulk using filename patterns to extract metadata."
  echo ""
  echo "PATTERN PLACEHOLDERS:"
  echo "   {module}    Module or subject name"
  echo "   {year}      Year (4 digits)"
  echo "   {title}     Exam title"
  echo ""
  echo "   At least {year} and {module} are required."
  echo "   If {title} is omitted, the full filename (without extension) is used."
  echo ""
  echo "OPTIONS:"
  echo "   --dry-run   Preview extracted metadata without uploading"
  echo "   --help      Show this help"
  echo ""
  echo "EXAMPLES:"
  echo "   $0 ./annales \"{module}_{year}_{title}.pdf\""
  echo "   $0 ./exams \"{year} - {module} - {title}.pdf\" --dry-run"
  echo "   $0 ./pdfs \"{module}_{year}.pdf\""
  echo ""
  echo "NOTES:"
  echo "   Services must be running (./start.sh dev or ./start.sh prod)"
  echo "   Authenticates as the initial admin from .env"
  echo "   Files exceeding the instance size limit are skipped (default: 50MB)"
}

cleanup() {
  if [ -n "$COOKIE_FILE" ] && [ -f "$COOKIE_FILE" ]; then
    rm -f "$COOKIE_FILE"
  fi
}
trap cleanup EXIT

# ─── Argument parsing ───

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    -*)
      echo -e "${RED}❌ Unknown option: $1${NC}"
      echo "💡 Use --help for usage information"
      exit 1
      ;;
    *)
      if [ -z "$DIRECTORY" ]; then
        DIRECTORY="$1"
      elif [ -z "$PATTERN" ]; then
        PATTERN="$1"
      else
        echo -e "${RED}❌ Unexpected argument: $1${NC}"
        echo "💡 Use --help for usage information"
        exit 1
      fi
      shift
      ;;
  esac
done

if [ -z "$DIRECTORY" ] || [ -z "$PATTERN" ]; then
  show_help
  exit 1
fi

# ─── Validate arguments ───

if [ ! -d "$DIRECTORY" ]; then
  echo -e "${RED}❌ Directory not found: $DIRECTORY${NC}"
  exit 1
fi

if [[ "$PATTERN" != *"{year}"* ]] || [[ "$PATTERN" != *"{module}"* ]]; then
  echo -e "${RED}❌ Pattern must contain at least {year} and {module}${NC}"
  echo "💡 Example: \"{module}_{year}_{title}.pdf\""
  exit 1
fi

HAS_TITLE=false
if [[ "$PATTERN" == *"{title}"* ]]; then
  HAS_TITLE=true
fi

# ─── Detect environment ───

if docker ps --format '{{.Names}}' | grep -q 'annales-api-dev'; then
  ENV_FILE=".env.dev"
  echo -e "${GREEN}🔍 Development mode detected${NC}"
elif docker ps --format '{{.Names}}' | grep -q 'annales-api'; then
  ENV_FILE=".env"
  echo -e "${GREEN}🔍 Production mode detected${NC}"
else
  echo -e "${RED}❌ No active API container found.${NC}"
  echo "Start services first with ./start.sh dev or ./start.sh prod"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

API_URL="http://localhost:${WEB_PORT:-8080}"

if [ -z "${INITIAL_ADMIN_EMAIL:-}" ] || [ -z "${INITIAL_ADMIN_PASSWORD:-}" ]; then
  echo -e "${RED}❌ INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in $ENV_FILE${NC}"
  exit 1
fi

# Read max file size from instance config (default: 50MB)
MAX_FILE_SIZE_MB=50
if [ -f "instance.config.json" ]; then
  _config_val=$(grep -o '"maxFileSizeMB"[[:space:]]*:[[:space:]]*[0-9]*' instance.config.json | grep -o '[0-9]*$')
  if [ -n "$_config_val" ]; then
    MAX_FILE_SIZE_MB="$_config_val"
  fi
fi
MAX_FILE_SIZE_BYTES=$((MAX_FILE_SIZE_MB * 1024 * 1024))

# ─── Build regex from pattern ───

# Track capture group positions
GROUP_INDEX=0
YEAR_GROUP=0
MODULE_GROUP=0
TITLE_GROUP=0

escape_literal() {
  local s="$1"
  local out=""
  local i
  for (( i=0; i<${#s}; i++ )); do
    local ch="${s:$i:1}"
    case "$ch" in
      .|\\|/|\*|\+|\?|\(|\)|\[|\]|\{|\}|\^|\$|\|)
        out="${out}\\${ch}"
        ;;
      *)
        out="${out}${ch}"
        ;;
    esac
  done
  echo -n "$out"
}

# First pass: split pattern into placeholders and literal segments
_placeholders=()
_literals=()
_current_literal=""
_remaining="$PATTERN"

while [ -n "$_remaining" ]; do
  case "$_remaining" in
    \{year\}*)
      _literals+=("$_current_literal"); _current_literal=""
      _placeholders+=("year"); _remaining="${_remaining#\{year\}}" ;;
    \{module\}*)
      _literals+=("$_current_literal"); _current_literal=""
      _placeholders+=("module"); _remaining="${_remaining#\{module\}}" ;;
    \{title\}*)
      _literals+=("$_current_literal"); _current_literal=""
      _placeholders+=("title"); _remaining="${_remaining#\{title\}}" ;;
    *)
      _current_literal="${_current_literal}${_remaining:0:1}"
      _remaining="${_remaining:1}" ;;
  esac
done
_literals+=("$_current_literal")

# Second pass: build regex using separators to constrain capture groups
REGEX=""
_num=${#_placeholders[@]}
for (( _idx=0; _idx<_num; _idx++ )); do
  REGEX="${REGEX}$(escape_literal "${_literals[$_idx]}")"

  _next_lit="${_literals[$((_idx+1))]}"
  _next_char="${_next_lit:0:1}"

  GROUP_INDEX=$((GROUP_INDEX + 1))
  case "${_placeholders[$_idx]}" in
    year)
      YEAR_GROUP=$GROUP_INDEX
      REGEX="${REGEX}([0-9]{4})"
      ;;
    module)
      MODULE_GROUP=$GROUP_INDEX
      if [ -n "$_next_char" ]; then
        REGEX="${REGEX}([^${_next_char}]+)"
      else
        REGEX="${REGEX}(.+)"
      fi
      ;;
    title)
      TITLE_GROUP=$GROUP_INDEX
      if [ -n "$_next_char" ]; then
        REGEX="${REGEX}([^${_next_char}]+)"
      else
        REGEX="${REGEX}(.+)"
      fi
      ;;
  esac
done
REGEX="^${REGEX}$(escape_literal "${_literals[$_num]}")$"

# ─── Scan directory for PDFs ───

PDF_FILES=()
SKIPPED_COUNT=0

while IFS= read -r -d '' file; do
  # Check file size
  size=$(stat --format="%s" "$file" 2>/dev/null || stat -f "%z" "$file" 2>/dev/null)
  if [ "$size" -gt "$MAX_FILE_SIZE_BYTES" ]; then
    echo -e "${YELLOW}⚠️  Skipping (>${MAX_FILE_SIZE_MB}MB): $(basename "$file")${NC}"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  else
    PDF_FILES+=("$file")
  fi
done < <(find "$DIRECTORY" -maxdepth 1 -name "*.pdf" -type f -print0 | sort -z)

if [ ${#PDF_FILES[@]} -eq 0 ]; then
  echo -e "${RED}❌ No PDF files found in $DIRECTORY${NC}"
  if [ "$SKIPPED_COUNT" -gt 0 ]; then
    echo "   ($SKIPPED_COUNT file(s) skipped because they exceed ${MAX_FILE_SIZE_MB}MB)"
  fi
  exit 1
fi

# ─── Parse filenames and build preview ───

FILENAMES=()
MODULES=()
YEARS=()
TITLES=()
MATCHED=()

for file in "${PDF_FILES[@]}"; do
  filename=$(basename "$file")
  FILENAMES+=("$filename")

  if [[ "$filename" =~ $REGEX ]]; then
    MODULES+=("${BASH_REMATCH[$MODULE_GROUP]}")
    YEARS+=("${BASH_REMATCH[$YEAR_GROUP]}")
    if [ "$HAS_TITLE" = true ]; then
      TITLES+=("${BASH_REMATCH[$TITLE_GROUP]}")
    else
      TITLES+=("${filename%.pdf}")
    fi
    MATCHED+=(true)
  else
    MODULES+=("")
    YEARS+=("")
    TITLES+=("${filename%.pdf}")
    MATCHED+=(false)
  fi
done

# ─── Preview table ───

echo ""
echo -e "${BOLD}📋 Preview (${#PDF_FILES[@]} files):${NC}"
echo ""

# Calculate column widths
MAX_FILE=8
MAX_MODULE=6
MAX_YEAR=4
MAX_TITLE=5

for i in "${!FILENAMES[@]}"; do
  [ ${#FILENAMES[$i]} -gt $MAX_FILE ] && MAX_FILE=${#FILENAMES[$i]}
  [ ${#MODULES[$i]} -gt $MAX_MODULE ] && MAX_MODULE=${#MODULES[$i]}
  [ ${#TITLES[$i]} -gt $MAX_TITLE ] && MAX_TITLE=${#TITLES[$i]}
done

# Cap column widths for readability
[ $MAX_FILE -gt 50 ] && MAX_FILE=50
[ $MAX_MODULE -gt 30 ] && MAX_MODULE=30
[ $MAX_TITLE -gt 40 ] && MAX_TITLE=40

# Print header
printf "  ${BOLD}%-${MAX_FILE}s  %-${MAX_MODULE}s  %-4s  %-${MAX_TITLE}s  %s${NC}\n" \
  "Filename" "Module" "Year" "Title" ""
printf "  %-${MAX_FILE}s  %-${MAX_MODULE}s  %-4s  %-${MAX_TITLE}s  %s\n" \
  "$(printf '%0.s─' $(seq 1 $MAX_FILE))" \
  "$(printf '%0.s─' $(seq 1 $MAX_MODULE))" \
  "────" \
  "$(printf '%0.s─' $(seq 1 $MAX_TITLE))" \
  "──"

MATCH_COUNT=0
UNMATCH_COUNT=0

for i in "${!FILENAMES[@]}"; do
  local_filename="${FILENAMES[$i]}"
  # Truncate if needed
  [ ${#local_filename} -gt $MAX_FILE ] && local_filename="${local_filename:0:$((MAX_FILE-3))}..."

  if [ "${MATCHED[$i]}" = true ]; then
    printf "  %-${MAX_FILE}s  %-${MAX_MODULE}s  %-4s  %-${MAX_TITLE}s  %s\n" \
      "$local_filename" "${MODULES[$i]}" "${YEARS[$i]}" "${TITLES[$i]}" "✓"
    MATCH_COUNT=$((MATCH_COUNT + 1))
  else
    printf "  ${YELLOW}%-${MAX_FILE}s  %-${MAX_MODULE}s  %-4s  %-${MAX_TITLE}s  ⚠️${NC}\n" \
      "$local_filename" "-" "-" "${TITLES[$i]}"
    UNMATCH_COUNT=$((UNMATCH_COUNT + 1))
  fi
done

echo ""
echo "  ✓ $MATCH_COUNT matched"
if [ $UNMATCH_COUNT -gt 0 ]; then
  echo -e "  ${YELLOW}⚠️  $UNMATCH_COUNT unmatched (will be skipped)${NC}"
fi
if [ $SKIPPED_COUNT -gt 0 ]; then
  echo -e "  ${YELLOW}⚠️  $SKIPPED_COUNT file(s) skipped (>${MAX_FILE_SIZE_MB}MB)${NC}"
fi

# Filter to only matched files
UPLOAD_COUNT=$MATCH_COUNT
if [ $UPLOAD_COUNT -eq 0 ]; then
  echo ""
  echo -e "${RED}❌ No files matched the pattern. Nothing to upload.${NC}"
  echo "💡 Check your pattern: $PATTERN"
  exit 1
fi

# ─── Dry run stops here ───

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo -e "${GREEN}📋 Dry run complete. No files uploaded.${NC}"
  exit 0
fi

# ─── Confirm ───

echo ""
read -p "Upload $UPLOAD_COUNT file(s)? Type 'yes' to confirm: " confirm
if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted."
  exit 1
fi

# ─── Authenticate ───

echo ""
echo "🔑 Authenticating..."

COOKIE_FILE=$(mktemp)

AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -c "$COOKIE_FILE" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$INITIAL_ADMIN_EMAIL\",\"password\":\"$INITIAL_ADMIN_PASSWORD\"}" \
  "$API_URL/api/auth/login")

AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -1)
AUTH_BODY=$(echo "$AUTH_RESPONSE" | sed '$d')

if [ "$AUTH_STATUS" != "200" ]; then
  echo -e "${RED}❌ Authentication failed (HTTP $AUTH_STATUS)${NC}"
  ERROR=$(echo "$AUTH_BODY" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
  [ -n "$ERROR" ] && echo "   $ERROR"
  exit 1
fi

echo -e "${GREEN}   ✓ Authenticated as $INITIAL_ADMIN_EMAIL${NC}"

# ─── Upload files ───

echo ""
echo "📤 Uploading..."
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0
CURRENT=0

for i in "${!FILENAMES[@]}"; do
  # Skip unmatched files
  if [ "${MATCHED[$i]}" != true ]; then
    continue
  fi

  CURRENT=$((CURRENT + 1))
  file="${PDF_FILES[$i]}"
  filename="${FILENAMES[$i]}"

  RETRIES=0
  MAX_RETRIES=5
  HEADERS_FILE=$(mktemp)
  while true; do
    RESPONSE=$(curl -s -D "$HEADERS_FILE" -w "\n%{http_code}" \
      -b "$COOKIE_FILE" \
      -F "file=@$file" \
      -F "title=${TITLES[$i]}" \
      -F "year=${YEARS[$i]}" \
      -F "module=${MODULES[$i]}" \
      "$API_URL/api/files/upload")

    STATUS=$(echo "$RESPONSE" | tail -1)

    if [ "$STATUS" = "200" ]; then
      echo -e "  [${CURRENT}/${UPLOAD_COUNT}] ${GREEN}✓${NC} $filename"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
      break
    elif [ "$STATUS" = "429" ] && [ $RETRIES -lt $MAX_RETRIES ]; then
      RETRIES=$((RETRIES + 1))
      WAIT=$(grep -i '^Retry-After:' "$HEADERS_FILE" | tr -d '\r' | awk '{print $2}')
      WAIT=${WAIT:-10}
      echo -e "  [${CURRENT}/${UPLOAD_COUNT}] ${YELLOW}⏳${NC} $filename — rate limited, retrying in ${WAIT}s ($RETRIES/$MAX_RETRIES)"
      sleep "$WAIT"
    else
      BODY=$(echo "$RESPONSE" | sed '$d')
      ERROR=$(echo "$BODY" | grep -o '"error":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo -e "  [${CURRENT}/${UPLOAD_COUNT}] ${RED}✗${NC} $filename — ${ERROR:-HTTP $STATUS}"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      break
    fi
  done
  rm -f "$HEADERS_FILE"
done

# ─── Summary ───

echo ""
if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ $SUCCESS_COUNT file(s) imported successfully${NC}"
else
  echo -e "${YELLOW}📊 $SUCCESS_COUNT imported, $FAIL_COUNT failed${NC}"
fi
