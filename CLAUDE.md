# UniApp — AI-Powered City Coordination Platform

## Project Overview
UniApp is a multi-agent AI platform for city event coordination. It automates venue booking, vendor management, volunteer coordination, permit processing, and event planning using Claude Opus 4.6 as the AI backbone.

## Tech Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **API**: Fastify 5 (Node.js, TypeScript, ESM)
- **Web**: Next.js 15 App Router + Tailwind CSS v4 + Radix UI
- **DB**: PostgreSQL 16 + Drizzle ORM + pgvector + PostGIS
- **Cache**: Redis 7
- **Events**: NATS JetStream
- **AI**: Claude Opus 4.6 (`claude-opus-4-6`) via `@anthropic-ai/sdk@^0.78.0`

## Package Structure
```
packages/
  db/        — Drizzle ORM schemas and migrations (@uniapp/db)
  shared/    — Shared TypeScript types (@uniapp/shared)
  edl/       — Event Description Language Zod schemas (@uniapp/edl)
  ai/        — Anthropic SDK wrapper + NL event parser (@uniapp/ai)
  agents/    — Agent runtime, MCP tools, specialist agents (@uniapp/agents)
  ui/        — Shared React component library stub (@uniapp/ui)
apps/
  api/       — Fastify REST API server (@uniapp/api)
  web/       — Next.js web app (@uniapp/web)
```

## Key Commands
```bash
pnpm dev              # Start all apps in dev mode
pnpm type-check       # Type-check all packages (always run before committing)
pnpm build            # Build all packages
pnpm db:generate      # Generate Drizzle SQL migrations from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:seed          # Seed database with Austin + SF cities + demo users
docker compose up -d  # Start Postgres, Redis, NATS locally
```

## Environment Variables
Copy `.env.example` to `.env`. Critical vars:
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — Required for all AI features
- `JWT_SECRET` — Change from default in any shared environment
- `REDIS_URL`, `NATS_URL` — For caching and event bus

## AI Architecture
All AI calls use **Claude Opus 4.6** (`claude-opus-4-6`) with **adaptive thinking** (`thinking: { type: "adaptive" }`). Never downgrade to Sonnet/Haiku without explicit user request.

### Agent Types
| Agent | Purpose | Entry Point |
|-------|---------|-------------|
| `orchestrator` | Decomposes events, spawns parallel subagents | `OrchestratorAgent` |
| `venue-scout` | Finds and evaluates venues | `AgentRuntime` |
| `vendor-coordinator` | Sources and bids vendors | `VendorAgent` |
| `volunteer-coordinator` | Matches volunteers to shifts | `VolunteerAgent` |
| `permit-processor` | Analyzes permit requirements | `AgentRuntime` |

### Key Agent APIs
```
POST /api/v1/events/:id/orchestrate   — Full AI event planning (4 parallel agents)
POST /api/v1/agents/run               — Run a specific agent with a task
POST /api/v1/events/:id/match-volunteers — Auto-match volunteers to shifts
POST /api/v1/constraints/solve        — Claude effort:max constraint resolution
POST /api/v1/events/parse             — NL → EDL (Event Description Language)
POST /api/v1/events/import            — Bulk NL import (up to 500 events)
```

## Database Schema (key tables)
- `cities` — Multi-tenant root; all data scoped to cityId
- `users` — JWT auth, roles array, trust_score
- `events` — Core entity with EDL JSONB + state machine
- `bookings` — Venue/vendor bookings with conflict detection
- `negotiations` — Multi-round negotiation protocol (max 10 rounds)
- `bids` — Vendor bids with auto-accept threshold
- `approval_gates` — Human-in-the-loop checkpoints for agents
- `agent_memory` — Per-entity memory with 6-month TTL
- `audit_log` — Every agent action with tokens/cost/duration

## Development Workflow
1. Add new schema in `packages/db/src/schema/`
2. Export from `packages/db/src/schema/index.ts`
3. Run `pnpm db:generate` to create migration SQL
4. Add API route in `apps/api/src/routes/`
5. Register in `apps/api/src/app.ts`
6. Run `pnpm type-check` — fix ALL errors before committing
7. Commit per sprint with message format: `sprint N: theme — description`

## Sprint Progress
- ✅ Sprint 1: Ground Zero (monorepo, DB schemas, auth, Next.js shell)
- ✅ Sprint 2: Core Services (EDL, events CRUD, orgs, RBAC, K8s)
- ✅ Sprint 3: AI Brain (NL parsing with Claude, venues, event creation UI)
- ✅ Sprint 4: Bookable (bookings, search, dashboard, venue browser)
- ✅ Sprint 5: Agents Awaken (agent runtime, MCP tools, WebSocket)
- ✅ Sprint 6: Negotiation (orchestrator, negotiation engine, approval gates)
- ✅ Sprint 7: Intelligence (constraint solver, memory, observability)
- 🔄 Sprint 8-16: In progress (payments, permits, analytics, launch)

## Common Patterns

### Adding a Fastify route
```typescript
// apps/api/src/routes/foo.ts
import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/auth.js";

export const fooRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { onRequest: [authenticate] }, async (request) => {
    return { data: "..." };
  });
};
```

### Adding an agent
```typescript
// packages/agents/src/agents/my-agent.ts
import { AgentRuntime } from "../runtime.js";
import type { Database } from "@uniapp/db";

export class MyAgent {
  private runtime: AgentRuntime;
  constructor(db: Database) {
    this.runtime = new AgentRuntime(db);
  }
  async run(eventId: string) {
    return this.runtime.run({ agentType: "orchestrator", eventId, task: "..." });
  }
}
```

### Error handling
Use `app.httpErrors.*` (from @fastify/sensible):
- `app.httpErrors.notFound()`, `app.httpErrors.forbidden()`, `app.httpErrors.conflict()`
- Errors automatically format as RFC 7807 JSON

## Security Notes
- JWT secret must be ≥32 chars in production
- All DB queries are parameterized (Drizzle ORM)
- Rate limiting: 1000 req/min per user (configured in @fastify/rate-limit plugin)
- RBAC via `authenticate` + `requireRoles()` middleware
- Agent budget cap: default $5 USD per run, max $50 (configurable per request)
