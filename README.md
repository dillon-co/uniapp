# UniApp

AI-powered city coordination platform that automates event planning, venue booking, vendor management, volunteer coordination, and permit processing using multi-agent AI.

## Architecture

```
apps/
  api/       — Fastify 5 REST API (TypeScript, ESM)
  web/       — Next.js 15 App Router + Tailwind CSS v4 + Radix UI
packages/
  db/        — Drizzle ORM schemas + migrations (PostgreSQL 16, pgvector, PostGIS)
  shared/    — Shared TypeScript types
  edl/       — Event Description Language (Zod schemas)
  ai/        — Anthropic SDK wrapper + NL event parser
  agents/    — Agent runtime, MCP tools, specialist agents
  ui/        — Shared React component library
```

Built with Turborepo + pnpm workspaces.

## AI Agents

UniApp uses Claude Opus 4.6 with adaptive thinking to run specialized agents in parallel:

| Agent | Purpose |
|-------|---------|
| **Orchestrator** | Decomposes events and spawns parallel subagents |
| **Venue Scout** | Finds and evaluates venues |
| **Vendor Coordinator** | Sources vendors and manages bidding |
| **Volunteer Coordinator** | Matches volunteers to shifts |
| **Permit Processor** | Analyzes permit requirements |

Key capabilities:
- Natural language event parsing → structured EDL
- Multi-round negotiation protocol (up to 10 rounds)
- Human-in-the-loop approval gates
- Constraint solving with Claude effort:max
- Per-agent memory with 6-month TTL
- Full audit logging with token/cost tracking
- Budget caps per agent run ($5 default, $50 max)

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

## Getting Started

```bash
# Clone and install
git clone git@github.com:dillon-co/uniapp.git
cd uniapp
pnpm install

# Start infrastructure
docker compose up -d

# Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY at minimum

# Run migrations and seed
pnpm db:migrate
pnpm db:seed

# Start dev servers
pnpm dev
```

The API runs on `http://localhost:3001` and the web app on `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages |
| `pnpm type-check` | Type-check all packages |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint all packages |
| `pnpm db:generate` | Generate Drizzle migrations from schema changes |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:seed` | Seed database (Austin + SF cities, demo users) |

## Infrastructure

Docker Compose provides:
- **PostgreSQL 16** (pgvector) — `localhost:5432`
- **Redis 7** — `localhost:6379`
- **NATS** (JetStream) — `localhost:4222`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Required for all AI features |
| `JWT_SECRET` | Auth token signing (≥32 chars in production) |
| `REDIS_URL` | Redis connection string |
| `NATS_URL` | NATS connection string |
| `API_PORT` | API server port (default: 3001) |
| `NEXT_PUBLIC_API_URL` | API URL for the web app |

## API Highlights

```
POST /api/v1/events/:id/orchestrate     — Full AI event planning
POST /api/v1/agents/run                  — Run a specific agent
POST /api/v1/events/parse                — Natural language → EDL
POST /api/v1/events/import               — Bulk NL import (up to 500)
POST /api/v1/events/:id/match-volunteers — Auto-match volunteers
POST /api/v1/constraints/solve           — Constraint resolution
```

See `docs/API.md` for the full API reference.

## License

Private — All rights reserved.
