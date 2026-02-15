#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Alyxnet Frame — MongoDB Restore Script
#
# Usage:
#   ./restore.sh <backup-file.gz>           # Restore from local file
#   ./restore.sh --latest                   # Restore most recent local backup
#   ./restore.sh --download-s3 <s3-key>     # Download from S3 then restore
#
# Environment:
#   MONGODB_URI   — Connection string (default: mongodb://localhost:27017/mern-app)
#   BACKUP_DIR    — Local backup directory (default: /backups)
#   BACKUP_S3_BUCKET — S3 bucket for --download-s3
#   BACKUP_S3_REGION — S3 region (default: us-east-1)
# ──────────────────────────────────────────────────────────────
set -euo pipefail

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/mern-app}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-us-east-1}"

usage() {
    echo "Usage:"
    echo "  $0 <backup-file.gz>           Restore from a local file"
    echo "  $0 --latest                   Restore the most recent local backup"
    echo "  $0 --download-s3 <s3-key>     Download from S3 then restore"
    exit 1
}

resolve_file() {
    case "${1:-}" in
        --latest)
            BACKUP_FILE=$(find "$BACKUP_DIR" -maxdepth 1 -name '*.gz' -type f | sort -r | head -n 1)
            if [ -z "$BACKUP_FILE" ]; then
                echo "ERROR: No backup files found in $BACKUP_DIR"
                exit 1
            fi
            echo "Latest backup: $BACKUP_FILE"
            ;;
        --download-s3)
            S3_KEY="${2:-}"
            if [ -z "$S3_KEY" ]; then
                echo "ERROR: --download-s3 requires an S3 key argument"
                usage
            fi
            if [ -z "$BACKUP_S3_BUCKET" ]; then
                echo "ERROR: BACKUP_S3_BUCKET is not set"
                exit 1
            fi
            BACKUP_FILE="$BACKUP_DIR/$(basename "$S3_KEY")"
            echo "Downloading s3://$BACKUP_S3_BUCKET/$S3_KEY → $BACKUP_FILE"
            aws s3 cp "s3://$BACKUP_S3_BUCKET/$S3_KEY" "$BACKUP_FILE" --region "$BACKUP_S3_REGION"
            ;;
        "")
            usage
            ;;
        *)
            BACKUP_FILE="$1"
            ;;
    esac

    if [ ! -f "$BACKUP_FILE" ]; then
        echo "ERROR: File not found: $BACKUP_FILE"
        exit 1
    fi
}

# ─── Main ────────────────────────────────────────────────────
resolve_file "$@"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         ⚠  DESTRUCTIVE OPERATION  ⚠             ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  This will DROP all existing data and replace   ║"
echo "║  it with the backup contents.                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  File:     $BACKUP_FILE"
echo "  Target:   $MONGODB_URI"
echo ""
read -rp "Type 'yes' to confirm restore: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Restoring from $BACKUP_FILE ..."
mongorestore --uri="$MONGODB_URI" --gzip --archive="$BACKUP_FILE" --drop

echo ""
echo "Restore completed successfully."
