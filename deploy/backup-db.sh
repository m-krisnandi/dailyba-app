#!/usr/bin/env bash
set -euo pipefail

# ========================================================
# Dailyba Automated SQLite Daily Backup Script
# Simpan di crontab VPS: 0 3 * * * /opt/dailyba-app/deploy/backup-db.sh
# ========================================================

BACKUP_DIR="${HOME}/dailyba-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dailyba_backup_${TIMESTAMP}.sqlite.gz"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Memulai backup database Dailyba SQLite..."

# Safe backup via SQLite online backup inside the container
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml exec -T api \
    sqlite3 /app/data/dailyba.db ".backup '/app/data/backup_temp.sqlite'"

# Extract the safely backed up file and compress
docker compose -f docker-compose.prod.yml exec -T api \
    cat /app/data/backup_temp.sqlite | gzip > "${BACKUP_FILE}"

# Remove temporary file inside container
docker compose -f docker-compose.prod.yml exec -T api \
    rm -f /app/data/backup_temp.sqlite

echo "[$(date)] Backup sukses disimpan ke: ${BACKUP_FILE} (Ukuran: $(du -h "${BACKUP_FILE}" | cut -f1))"

# Hapus backup yang lebih tua dari RETENTION_DAYS
echo "[$(date)] Membersihkan backup lama (> ${RETENTION_DAYS} hari)..."
find "${BACKUP_DIR}" -type f -name "dailyba_backup_*.sqlite.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date)] Selesai."
