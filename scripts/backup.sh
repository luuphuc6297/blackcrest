#!/usr/bin/env bash
# Blackcrest — nightly ENCRYPTED backup (blueprint §5, 3-2-1 + §6.11 in-territory).
# Run via cron in Asia/Ho_Chi_Minh:
#   0 2 * * *  TZ=Asia/Ho_Chi_Minh /opt/blackcrest/scripts/backup.sh
#
# Backups are encrypted with age (https://age-encryption.org) so the operator
# keeps the key in-territory and offsite copies are useless without it.
# Provision the key ONCE (never commit it):
#   age-keygen -o /opt/blackcrest/.age/key.txt && chmod 600 /opt/blackcrest/.age/key.txt
#
# A backup you have never restored is not a backup — test scripts/restore.sh monthly.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/blackcrest/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DB_CONTAINER="${DB_CONTAINER:-blackcrest-db-1}"
STORAGE_DIR="${STORAGE_DIR:-/var/lib/docker/volumes/blackcrest_storage/_data}"
RCLONE_REMOTE="${RCLONE_REMOTE:-vn-offsite:blackcrest}"   # Bizfly/VNG/Viettel
AGE_KEY_FILE="${AGE_KEY_FILE:-/opt/blackcrest/.age/key.txt}"
LOG_FILE="${LOG_FILE:-/var/log/blackcrest-backup.log}"

command -v age >/dev/null 2>&1 || { echo "ERROR: 'age' not installed (apk add age / apt-get install age)." >&2; exit 1; }
[[ -f "$AGE_KEY_FILE" ]] || { echo "ERROR: age key not found at $AGE_KEY_FILE (run age-keygen once)." >&2; exit 1; }

# Public recipient derived from the private identity — NOT regenerated.
RECIPIENT="$(age-keygen -y "$AGE_KEY_FILE")"
mkdir -p "$BACKUP_DIR"

{
  echo "[$(date +'%F %T')] backup start: $STAMP"

  # 1. Postgres logical dump (custom format) → encrypt → shred plaintext.
  docker exec "$DB_CONTAINER" pg_dump -U blackcrest -d blackcrest -Fc \
    | age -r "$RECIPIENT" -o "$BACKUP_DIR/db-$STAMP.dump.age"
  echo "[$(date +'%F %T')] db encrypted → db-$STAMP.dump.age"

  # 2. PDF storage volume → encrypt → shred plaintext.
  tar -C "$STORAGE_DIR" -czf - . \
    | age -r "$RECIPIENT" -o "$BACKUP_DIR/storage-$STAMP.tar.gz.age"
  echo "[$(date +'%F %T')] storage encrypted → storage-$STAMP.tar.gz.age"

  # 3. Offsite sync — encrypted artifacts only, to an in-territory provider.
  if command -v rclone >/dev/null 2>&1; then
    rclone sync "$BACKUP_DIR" "$RCLONE_REMOTE" --include='*.age'
    echo "[$(date +'%F %T')] synced *.age offsite"
  fi

  # 4. Local retention (encrypted artifacts only ever exist on disk).
  find "$BACKUP_DIR" -name 'db-*.dump.age' -mtime +"$RETENTION_DAYS" -delete
  find "$BACKUP_DIR" -name 'storage-*.tar.gz.age' -mtime +"$RETENTION_DAYS" -delete

  echo "[$(date +'%F %T')] backup complete: $STAMP"
} | tee -a "$LOG_FILE"
