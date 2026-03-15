#!/usr/bin/env bash
# UniApp local development setup script
set -euo pipefail

echo "🚀 UniApp Dev Setup"
echo "==================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required (v20+)"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required. Run: npm i -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required for local services"; exit 1; }

echo "✅ Prerequisites met"

# Copy env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📋 Created .env from .env.example"
  echo "   → Set ANTHROPIC_API_KEY in .env to enable AI features"
else
  echo "✅ .env already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start infrastructure
echo "🐳 Starting Postgres, Redis, NATS..."
docker compose up -d

# Wait for Postgres to be ready
echo "⏳ Waiting for Postgres..."
until docker exec uniapp-postgres pg_isready -U uniapp >/dev/null 2>&1; do
  sleep 1
done
echo "✅ Postgres ready"

# Generate and run migrations
echo "🗄️  Generating Drizzle migrations..."
pnpm db:generate

echo "🗄️  Running migrations..."
pnpm db:migrate

# Seed database
echo "🌱 Seeding database..."
pnpm db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start development:"
echo "  pnpm dev"
echo ""
echo "API:  http://localhost:3001"
echo "Web:  http://localhost:3000"
echo "NATS: http://localhost:8222"
