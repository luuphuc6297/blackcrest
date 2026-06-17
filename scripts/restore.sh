#!/usr/bin/env bash
# Blackcrest — restore from an age-encrypted backup (blueprint §5). Test monthly.
#   scripts/restore.sh --db      db-20260618-020000.dump.age
#   scripts/restore.sh --storage storage-20260618-020000.tar.gz.age [--target <dir>]
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/blackcrest/backups}"
AGE_KEY_FILE="${AGE_KEY_FILE:-/opt/blackcrest/.age/key.txt}"
DB_CONTAINER="${DB_CONTAINER:-blackcrest-db-1}"
STORAGE_TARGET="${STORAGE_TARGET:-/var/lib/docker/volumes/blackcrest_storage/_data}"
LOG_FILE="${LOG_FILE:-/var/log/blackcrest-restore.log}"

MODE="" FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db)      MODE="db";      FILE="$2"; shift 2 ;;
    --storage) MODE="storage"; FILE="$2"; shift 2 ;;
    --target)  STORAGE_TARGET="$2"; shift 2 ;;
    -h|--help) echo "Usage: $0 --db <f.dump.age> | --storage <f.tar.gz.age> [--target <dir>]"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

[[ -n "$MODE" ]] || { echo "ERROR: --db or --storage required." >&2; exit 1; }
command -v age >/dev/null 2>&1 || { echo "ERROR: 'age' not installed." >&2; exit 1; }
[[ -f "$AGE_KEY_FILE" ]] || { echo "ERROR: age key not found at $AGE_KEY_FILE." >&2; exit 1; }

# Resolve the backup path (accept bare filename or absolute path).
[[ -f "$FILE" ]] || FILE="$BACKUP_DIR/$FILE"
[[ -f "$FILE" ]] || { echo "ERROR: backup not found: $FILE" >&2; exit 1; }

{
  echo "[$(date +'%F %T')] restore start: $MODE from $FILE"
  TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
  PLAIN="$TMP/plain"
  age -d -i "$AGE_KEY_FILE" -o "$PLAIN" "$FILE"
  echo "[$(date +'%F %T')] decrypted"

  if [[ "$MODE" == "db" ]]; then
    # --clean --if-exists = full disaster recovery (drops + recreates objects).
    docker exec -i "$DB_CONTAINER" pg_restore -U blackcrest -d blackcrest --clean --if-exists < "$PLAIN"
    COUNT="$(docker exec "$DB_CONTAINER" psql -U blackcrest -d blackcrest -tAc \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
    [[ "${COUNT//[[:space:]]/}" =~ ^[0-9]+$ && "${COUNT//[[:space:]]/}" -gt 0 ]] \
      && echo "[$(date +'%F %T')] DB verify PASSED ($COUNT public tables)" \
      || { echo "[$(date +'%F %T')] DB verify FAILED" >&2; exit 1; }
  else
    mkdir -p "$STORAGE_TARGET"
    tar -C "$STORAGE_TARGET" -xzf "$PLAIN"
    N="$(find "$STORAGE_TARGET" -type f | wc -l | tr -d ' ')"
    [[ "$N" -gt 0 ]] \
      && echo "[$(date +'%F %T')] storage verify PASSED ($N files → $STORAGE_TARGET)" \
      || { echo "[$(date +'%F %T')] storage verify FAILED (no files)" >&2; exit 1; }
  fi

  echo "[$(date +'%F %T')] restore complete + verified"
} | tee -a "$LOG_FILE"
