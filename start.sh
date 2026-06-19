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
exec node node_modules/.bin/next start -p ${PORT:-3000}
