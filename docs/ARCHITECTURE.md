# UniApp Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        UniApp Platform                       │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │ Next.js  │    │   Fastify    │    │  Claude Opus 4.6│   │
│  │  Web App │◄──►│   REST API   │◄──►│  Multi-Agent    │   │
│  │(App RTR) │    │  + WebSocket │    │  Orchestrator   │   │
│  └──────────┘    └──────┬───────┘    └─────────────────┘   │
│                         │                                   │
│              ┌──────────┼──────────┐                        │
│              │          │          │                        │
│         ┌────▼───┐ ┌────▼───┐ ┌───▼────┐                  │
│         │Postgres│ │ Redis  │ │  NATS  │                  │
│         │16+pgvec│ │   7    │ │JetStrm │                  │
│         └────────┘ └────────┘ └────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Agent Architecture

The core of UniApp is a coordinated multi-agent system where Claude Opus 4.6 powers autonomous planning and negotiation.

```
Organizer Request
      │
      ▼
┌─────────────┐
│ Orchestrator│  ← Decomposes event plan
│   Agent     │
└──────┬──────┘
       │ parallel subagents via Promise.allSettled
  ┌────┼────┬──────────────┐
  ▼    ▼    ▼              ▼
┌────┐┌────┐┌────────────┐┌─────────────┐
│Venu││Vend││  Volunteer  ││   Permit    │
│Scout││Coor││Coordinator  ││ Processor   │
└──┬─┘└──┬─┘└─────┬──────┘└──────┬──────┘
   │     │        │               │
   ▼     ▼        ▼               ▼
  MCP   MCP     Match           City
 Tools  Tools   Skills          Regs
   │     │
   ▼     ▼
Bookings/Bids → NegotiationEngine → ApprovalGate → Organizer
```

## Agent Lifecycle

1. **Trigger**: Organizer calls `POST /events/:id/orchestrate`
2. **Planning**: Orchestrator reads EDL, spawns 4 parallel subagents
3. **Execution**: Each subagent uses MCP tools (venue search, booking check, etc.)
4. **Memory**: Outcomes stored in `agent_memory` with entity-scoped isolation
5. **Gate**: Orchestrator creates `approval_gates` record, pauses
6. **Human-in-loop**: Organizer reviews plan via `/approvals` page
7. **Resume**: On approval, agents proceed to negotiate bookings
8. **Audit**: Every action logged to `audit_log` with tokens/cost/duration

## Data Flow

### Event Creation (Natural Language)
```
User: "Street food market downtown Austin, 2000 people, June, $30k"
         │
         ▼
POST /events/parse → Claude Opus 4.6 (messages.parse + zodOutputFormat)
         │
         ▼ EDL JSON (guaranteed valid via structured outputs)
         │
POST /events → DB insert (status: "draft")
         │
         ▼
POST /events/:id/orchestrate → 4 parallel agents
```

### Negotiation Flow
```
VenueAgent.evaluateBookingRequest()
    → check_venue_availability tool
    → apply rate card pricing
    → return: accept | counter | reject
         │
    [counter] → NegotiationEngine.initiate()
         │     → rounds[] in JSONB
         │     → max 10 rounds → escalate
         │
    [accept]  → bookings insert (status: confirmed)
              → audit_log entry
              → WebSocket broadcast
```

## Database Design

### Multi-tenancy
All resources are scoped to `city_id`. Row-level security via application middleware (not Postgres RLS yet — Sprint 2.6 spec). City admin role is scoped to their `cityId`.

### State Machines

**Events:**
```
draft → planning → negotiating → confirmed → live → completed → settled
                                         ↘ cancelled
```

**Bookings:**
```
pending → approved → confirmed → completed
       ↘ rejected
       ↘ cancelled
```

**Negotiations:**
```
active → resolved (accept)
      → rejected
      → escalated (10 rounds)
      → expired (24h timeout)
```

**Bids:**
```
pending → accepted → (booking created)
       → rejected
       → countered → pending (next round)
       → expired (48h)
       → withdrawn
```

## Key Schema Tables

| Table | Purpose |
|-------|---------|
| `cities` | Multi-tenant root; timezone, permit rules, regulatory config |
| `events` | Core entity; EDL JSONB + state machine |
| `event_history` | Full audit trail of state changes + agent actions |
| `bookings` | Venue/vendor bookings with conflict detection |
| `negotiations` | Multi-round negotiation protocol (rounds[] JSONB) |
| `bids` | Vendor bids with auto-accept threshold |
| `approval_gates` | Human-in-loop checkpoints for agent decisions |
| `agent_memory` | Per-entity memory with 6-month TTL pruning |
| `audit_log` | Every agent call with tokens/cost/duration/tool |
| `permits` | Permit applications with status tracking |
| `payments` | Payment intents (Stripe-compatible structure) |
| `analytics` | Time-series metrics for forecasting |
| `incidents` | Live event incident reports |

## Security Model

- **Authentication**: JWT (15min access + long-lived refresh, SHA-256 hashed in DB)
- **Authorization**: Role-based (`platform_admin > city_admin > organizer > venue_manager > vendor > volunteer > attendee`)
- **Resource ownership**: Organizers own their events; venue managers own their venues; city admins scoped to cityId
- **Agent budget caps**: Default $5 USD/run, configurable up to $50
- **Rate limiting**: 1000 req/min per user (Redis-ready, currently in-memory)
- **Audit**: Every agent action logged immutably to audit_log

## Claude API Integration Details

All AI calls use `claude-opus-4-6` with:
- **Adaptive thinking**: `thinking: { type: "adaptive" }` (no budget_tokens needed)
- **Effort scaling**: `effort: "max"` for constraint solving; default `"high"` otherwise
- **Prompt caching**: `cache_control: { type: "ephemeral" }` on city system prompts (~90% cost reduction on repeated calls)
- **Structured outputs**: `messages.parse()` + `zodOutputFormat()` for guaranteed valid JSON
- **Tool runner**: `client.beta.messages.toolRunner()` for agentic MCP tool loops

## Package Dependencies

```
@uniapp/shared ────────────────────┐
@uniapp/edl ───────────────────────┤
@uniapp/db ────────────────────────┼──► @uniapp/api
@uniapp/ai ─────────────────────── ┤
@uniapp/agents ────────────────────┘

@uniapp/shared ────────────────────► @uniapp/web
```
