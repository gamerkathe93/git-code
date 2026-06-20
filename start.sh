#!/bin/sh
set -e

export DATABASE_URL=${DATABASE_URL:-"file:/data/db/gitcode.db"}
export REPO_STORAGE_PATH=${REPO_STORAGE_PATH:-"/data/repos"}

echo "DATABASE_URL=${DATABASE_URL}"
echo "PORT=${PORT:-3000}"

# Create data directories (requires volume to be mounted at /data)
mkdir -p /data/db || echo "Warning: could not create /data/db"
mkdir -p /data/repos || echo "Warning: could not create /data/repos"

# Sync database schema (creates any missing tables/columns from new models)
echo "Syncing database schema..."
npx prisma db push --accept-data-loss || echo "db push failed, continuing..."

echo "Starting GitCode..."
exec npx next start --port ${PORT:-3000} --hostname 0.0.0.0
