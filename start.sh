#!/bin/sh
set -e

export DATABASE_URL=${DATABASE_URL:-"file:/data/db/gitcode.db"}
export REPO_STORAGE_PATH=${REPO_STORAGE_PATH:-"/data/repos"}

# Create data directories on the mounted volume
mkdir -p /data/db
mkdir -p /data/repos

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the app
echo "Starting GitCode..."
exec npx next start --port ${PORT:-3000} --hostname 0.0.0.0
