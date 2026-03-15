#!/usr/bin/env bash
# Drop and recreate the local dev database, then re-migrate and re-seed
set -euo pipefail

echo "⚠️  Resetting local database..."
docker exec uniapp-postgres psql -U uniapp -c "DROP DATABASE IF EXISTS uniapp;" postgres
docker exec uniapp-postgres psql -U uniapp -c "CREATE DATABASE uniapp;" postgres
echo "✅ Database recreated"

pnpm db:migrate
pnpm db:seed
echo "✅ Database reset and seeded"
