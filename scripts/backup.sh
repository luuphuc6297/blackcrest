#!/usr/bin/env bash
# Blackcrest — nightly backup (blueprint §5, 3-2-1). Run via cron in
# Asia/Ho_Chi_Minh. Keeps 14 days locally + syncs offsite to a VN provider.
#
#   0 2 * * *  TZ=Asia/Ho_Chi_Minh /opt/blackcrest/scripts/backup.sh
#
# A backup you have never restored is not a backup — test-restore monthly.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/blackcrest/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DB_CONTAINER="${DB_CONTAINER:-blackcrest-db-1}"
STORAGE_DIR="${STORAGE_DIR:-/var/lib/docker/volumes/blackcrest_storage/_data}"
RCLONE_REMOTE="${RCLONE_REMOTE:-vn-offsite:blackcrest}"   # Bizfly/VNG/Viettel

mkdir -p "$BACKUP_DIR"

# 1. Postgres logical backup (custom format).
docker exec "$DB_CONTAINER" pg_dump -U blackcrest -d blackcrest -Fc \
  > "$BACKUP_DIR/db-$STAMP.dump"

# 2. PDF storage (incremental mirror).
tar -C "$STORAGE_DIR" -czf "$BACKUP_DIR/storage-$STAMP.tar.gz" .

# 3. Offsite sync (in-territory provider — data localization, blueprint §6.11).
if command -v rclone >/dev/null 2>&1; then
  rclone sync "$BACKUP_DIR" "$RCLONE_REMOTE" --max-age "${RETENTION_DAYS}d"
fi

# 4. Local retention.
find "$BACKUP_DIR" -name 'db-*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'storage-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete: $STAMP"
