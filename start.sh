#!/bin/sh
set -e

# Create data directories on the mounted volume
mkdir -p /data/db
mkdir -p /data/repos

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the app
echo "Starting GitCode..."
exec npx next start --port ${PORT:-3000} --hostname 0.0.0.0
