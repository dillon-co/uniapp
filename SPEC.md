# UniApp — Software Engineering Specification

> **Version:** 1.0.0
> **Status:** Draft
> **Last Updated:** 2026-03-14

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Core Services](#core-services)
5. [Multi-Agent System](#multi-agent-system)
6. [Data Model](#data-model)
7. [API Design](#api-design)
8. [AI Integration (Claude API)](#ai-integration-claude-api)
9. [Real-Time Communication](#real-time-communication)
10. [Authentication & Authorization](#authentication--authorization)
11. [Infrastructure & Deployment](#infrastructure--deployment)
12. [Observability](#observability)
13. [Security](#security)
14. [Testing Strategy](#testing-strategy)
15. [Development Phases](#development-phases)

---

## 1. System Overview

UniApp is an AI-powered city coordination platform that uses autonomous agents to orchestrate events, logistics, staffing, permitting, and civic operations. Users describe what they want to organize in natural language; the platform's agent network handles planning, negotiation, and execution.

### Design Principles

- **Agent-first architecture** — Every entity (venue, vendor, organizer, volunteer, city department) is represented by an AI agent that can act autonomously within defined guardrails.
- **Human-in-the-loop at checkpoints** — Agents negotiate and plan autonomously but surface decisions to humans at configurable approval gates.
- **Event-driven** — All state changes propagate through an event bus. Services are decoupled and communicate asynchronously.
- **Multi-tenant from day one** — Each city is a tenant. Isolation at the data, agent, and configuration layer.
- **API-first** — Every capability is exposed via API before it gets a UI.

---

## 2. Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Web App  │  │ Mobile   │  │ Admin    │  │ City Dashboard │  │
│  │ (Next.js)│  │ (React   │  │ Console  │  │ (Gov Portal)   │  │
│  │          │  │  Native) │  │          │  │                │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
│       └──────────────┴──────────────┴───────────────┘            │
│                              │                                   │
│                     ┌────────▼────────┐                          │
│                     │   API Gateway   │                          │
│                     │   (Kong/Envoy)  │                          │
│                     └────────┬────────┘                          │
└──────────────────────────────┼───────────────────────────────────┘

┌──────────────────────────────┼───────────────────────────────────┐
│                      Service Layer                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ Event Svc  │ │ Agent Svc  │ │ Booking Svc│ │ Permit Svc   │  │
│  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └──────┬───────┘  │
│  ┌──────┴─────┐ ┌──────┴─────┐ ┌──────┴─────┐ ┌──────┴───────┐  │
│  │ User Svc   │ │ Vendor Svc │ │ Venue Svc  │ │ Payment Svc  │  │
│  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └──────┬───────┘  │
│  ┌──────┴─────┐ ┌──────┴─────┐ ┌──────┴─────┐ ┌──────┴───────┐  │
│  │ Notif Svc  │ │ Search Svc │ │ Analytics  │ │ Reputation   │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                     Intelligence Layer                           │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Agent Runtime   │  │  Constraint  │  │  Claude API         │ │
│  │  (Orchestrator)  │  │  Solver      │  │  (Opus 4.6)         │ │
│  └────────┬────────┘  └──────┬───────┘  └──────────┬──────────┘ │
│  ┌────────┴────────┐  ┌──────┴───────┐  ┌──────────┴──────────┐ │
│  │  Risk Engine    │  │  Demand      │  │  NL Processing      │ │
│  │                 │  │  Forecaster  │  │  (Intent → EDL)     │ │
│  └─────────────────┘  └──────────────┘  └─────────────────────┘ │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                       Data Layer                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ PostgreSQL │ │   Redis    │ │ OpenSearch │ │ TimescaleDB  │  │
│  │ (Primary)  │ │ (Cache +   │ │ (Search +  │ │ (Time-series │  │
│  │            │ │  Pub/Sub)  │ │  Geo)      │ │  Analytics)  │  │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌───────────────────────────────┐│
│  │ S3 / R2    │ │ NATS       │ │ Vector DB (pgvector)          ││
│  │ (Objects)  │ │ (Event Bus)│ │ (Agent Memory + Embeddings)   ││
│  └────────────┘ └────────────┘ └───────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### Service Communication

| Pattern | Use Case | Technology |
|---|---|---|
| Synchronous request/response | Client-facing APIs, queries | REST (JSON) over HTTP/2 |
| Asynchronous events | State changes, agent actions, notifications | NATS JetStream |
| Real-time bidirectional | Live dashboards, day-of coordination | WebSocket (Socket.io) |
| Agent-to-agent negotiation | Multi-step async negotiation rounds | NATS request/reply + durable state |

---

## 3. Technology Stack

### Backend

| Component | Technology | Rationale |
|---|---|---|
| **Primary language** | TypeScript (Node.js 22+) | Full-stack consistency, strong typing, Claude SDK support |
| **API framework** | Fastify | High performance, schema validation, plugin ecosystem |
| **Agent runtime** | Claude Agent SDK (TypeScript) | Native Claude integration, built-in tool use, MCP support |
| **AI backbone** | Claude API (Opus 4.6) | Adaptive thinking, 200K context, tool use, structured outputs |
| **Primary database** | PostgreSQL 16 + pgvector | ACID, JSONB for flexible schemas, vector search for agent memory |
| **Cache / Pub-Sub** | Redis 7 (Valkey) | Session state, rate limiting, real-time pub/sub |
| **Event bus** | NATS JetStream | Persistent event streaming, exactly-once delivery |
| **Search** | OpenSearch | Full-text search, geo queries, event discovery |
| **Time-series** | TimescaleDB | Analytics, demand forecasting, SLA monitoring |
| **Object storage** | S3 / Cloudflare R2 | Documents, images, permits, contracts |
| **Task queue** | BullMQ (Redis-backed) | Background jobs, scheduled tasks, retries |

### Frontend

| Component | Technology |
|---|---|
| **Web application** | Next.js 15 (App Router) |
| **Mobile** | React Native (Expo) |
| **State management** | Zustand + TanStack Query |
| **Real-time** | Socket.io client |
| **Maps** | Mapbox GL JS |
| **Design system** | Tailwind CSS + Radix UI |

### Infrastructure

| Component | Technology |
|---|---|
| **Container orchestration** | Kubernetes (EKS / GKE) |
| **CI/CD** | GitHub Actions |
| **IaC** | Terraform |
| **Secrets** | AWS Secrets Manager / Vault |
| **CDN** | Cloudflare |
| **Monitoring** | Datadog / Grafana + Prometheus |
| **Logging** | Structured JSON → Datadog / Loki |
| **Error tracking** | Sentry |

---

## 4. Core Services

### 4.1 Event Service

Owns the lifecycle of an event from intent to post-event settlement.

```
States: draft → planning → negotiating → confirmed → live → completed → settled
```

**Responsibilities:**
- Parse natural language intent into structured Event Description Language (EDL)
- Manage event state machine transitions
- Coordinate agent-driven planning workflow
- Track all event artifacts (plans, contracts, permits, invoices)

**Key endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/events` | Create event from natural language or EDL |
| `GET` | `/events/:id` | Get event with full plan |
| `PATCH` | `/events/:id` | Update event (triggers re-negotiation if needed) |
| `POST` | `/events/:id/approve` | Approve a pending plan checkpoint |
| `GET` | `/events/:id/timeline` | Real-time event timeline |
| `POST` | `/events/:id/go-live` | Transition to live mode |

### 4.2 Agent Service

Manages the lifecycle and execution of all AI agents in the system.

**Responsibilities:**
- Spawn, configure, and teardown agent instances
- Route messages between agents via the negotiation protocol
- Enforce agent guardrails (budget limits, action permissions, escalation rules)
- Maintain agent memory (per-entity persistent context)
- Expose agent state for observability

**Agent types and their tool access:**

| Agent Type | Tools | Approval Gates |
|---|---|---|
| Organizer | Search, Booking, Permit, Payment, Messaging | Budget > $X, contract signing |
| Venue | Calendar, Pricing, Availability, Messaging | Booking confirmation |
| Vendor | Inventory, Bidding, Invoicing, Messaging | Contract acceptance |
| Volunteer | Scheduling, Skills, Verification, Messaging | Shift confirmation |
| City/Gov | Permits, Compliance, Traffic, Safety | Permit approval (human review) |
| Sponsor | Matching, Budgeting, ROI, Messaging | Sponsorship commitment |
| Attendee | Discovery, Ticketing, Transport, Social | Payment authorization |

### 4.3 Booking Service

Handles reservations and resource allocation.

**Responsibilities:**
- Venue booking with conflict detection
- Vendor procurement and contract management
- Equipment and resource allocation
- Double-booking prevention (distributed locking)

### 4.4 Permit Service

Automates regulatory compliance and permit management.

**Responsibilities:**
- Map event requirements to required permits per jurisdiction
- Auto-generate permit applications from EDL
- Submit to city APIs (where available) or generate PDFs for manual submission
- Track permit status and deadlines
- Compliance checklist management

### 4.5 Payment Service

Manages all financial transactions on the platform.

**Responsibilities:**
- Escrow for vendor/venue bookings
- Platform fee collection
- Split payments and multi-party settlement
- Refund processing
- Financial reporting per event

**Integration:** Stripe Connect (multi-party payments)

### 4.6 Notification Service

Unified notification delivery across channels.

**Channels:** Push (mobile), Email (SendGrid/SES), SMS (Twilio), In-app, Webhook

**Responsibilities:**
- Template management per notification type
- Delivery preferences per user
- Notification batching and deduplication
- Read receipts and engagement tracking

### 4.7 Reputation Service

Trust and reliability scoring across all platform participants.

**Inputs:**
- Completion rates (events organized, shifts worked, deliveries made)
- Ratings and reviews (post-event)
- Verification status (identity, licenses, insurance)
- Platform tenure and activity volume

**Output:** Composite trust score (0-100) with category breakdowns.

### 4.8 Search & Discovery Service

Powers event discovery for attendees and opportunity discovery for vendors/volunteers.

**Responsibilities:**
- Full-text search with geo-filtering
- Personalized recommendations (collaborative + content-based)
- Trending events and categories
- Calendar-aware suggestions

---

## 5. Multi-Agent System

### 5.1 Agent Runtime Architecture

Each agent is an instance backed by the Claude Agent SDK with entity-specific tools, memory, and guardrails.

```typescript
import { query, ClaudeAgentOptions, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

// Agent spawning pattern
async function spawnAgent(
  entityType: AgentType,
  entityId: string,
  task: string
) {
  const memory = await loadAgentMemory(entityType, entityId);
  const tools = getToolsForAgentType(entityType);
  const guardrails = getGuardrailsForAgentType(entityType);

  for await (const message of query({
    prompt: buildAgentPrompt(task, memory, guardrails),
    options: {
      model: "claude-opus-4-6",
      allowedTools: tools,
      maxTurns: guardrails.maxTurns,
      maxBudgetUsd: guardrails.maxBudgetUsd,
      systemPrompt: buildSystemPrompt(entityType, entityId),
      hooks: {
        PreToolUse: [
          { matcher: "Payment|Contract", hooks: [requireApproval] },
        ],
        PostToolUse: [
          { matcher: ".*", hooks: [auditLog] },
        ],
      },
    },
  })) {
    if ("result" in message) {
      await persistAgentAction(entityType, entityId, message);
    }
  }
}
```

### 5.2 Negotiation Protocol

Agents negotiate asynchronously through structured rounds:

```
1. PROPOSE  — Agent A sends a proposal (venue booking, vendor bid, schedule)
2. COUNTER  — Agent B responds with acceptance, rejection, or counter-proposal
3. RESOLVE  — Constraint solver mediates if agents reach impasse
4. COMMIT   — Both parties commit; state is persisted and locked
5. CONFIRM  — Human checkpoint (if required by guardrails)
```

**Negotiation message schema:**

```typescript
interface NegotiationMessage {
  id: string;
  negotiationId: string;
  round: number;
  fromAgent: AgentRef;
  toAgent: AgentRef;
  type: "propose" | "counter" | "accept" | "reject" | "escalate";
  payload: {
    terms: Record<string, unknown>;     // Pricing, dates, requirements
    constraints: Constraint[];          // Non-negotiable requirements
    flexibility: FlexibilityRange[];    // Ranges agent can adjust within
    rationale: string;                  // AI-generated explanation
  };
  expiresAt: string;                    // ISO 8601
  createdAt: string;
}
```

### 5.3 Event Description Language (EDL)

Structured schema that Claude generates from natural language input:

```typescript
interface EventDescription {
  meta: {
    title: string;
    description: string;
    type: EventType;              // "festival" | "market" | "concert" | "volunteer" | ...
    expectedAttendance: Range;    // { min: 500, max: 2000 }
    visibility: "public" | "private" | "invite_only";
  };
  schedule: {
    preferredDates: DateRange[];
    duration: Duration;
    setupTime: Duration;
    teardownTime: Duration;
    flexibility: "exact" | "flexible_days" | "flexible_week";
  };
  location: {
    type: "indoor" | "outdoor" | "hybrid";
    preferredArea: GeoArea;       // GeoJSON polygon or point + radius
    requirements: VenueRequirement[];
    accessibility: AccessibilityRequirement[];
  };
  resources: {
    vendors: VendorRequirement[];
    equipment: EquipmentRequirement[];
    staffing: StaffingRequirement[];
    volunteers: VolunteerRequirement[];
  };
  compliance: {
    permits: PermitRequirement[];  // Auto-detected from event type + location
    insurance: InsuranceRequirement;
    safety: SafetyPlan;
  };
  budget: {
    total: MoneyRange;
    breakdown: BudgetCategory[];
    fundingSources: FundingSource[];
  };
}
```

### 5.4 Constraint Solver

Resolves conflicts across agent negotiations:

**Constraint types:**
- **Hard constraints** — Must be satisfied (fire capacity, permit windows, exclusive bookings)
- **Soft constraints** — Preferences that can be relaxed (preferred dates, budget targets)
- **Dynamic constraints** — Change based on real-time conditions (weather, other events)

**Resolution strategies:**
1. **Backtracking search** — Try alternative assignments when conflicts arise
2. **Priority-based relaxation** — Relax soft constraints in priority order
3. **AI-mediated compromise** — Use Claude to propose creative alternatives
4. **Human escalation** — Surface to organizer when automated resolution fails

---

## 6. Data Model

### Core Entities

```sql
-- Organizations (venues, vendor companies, city departments)
CREATE TABLE organizations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT NOT NULL CHECK (type IN ('venue', 'vendor', 'government', 'sponsor', 'organizer_org')),
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  city_id        UUID REFERENCES cities(id),
  metadata       JSONB NOT NULL DEFAULT '{}',
  trust_score    NUMERIC(5,2) DEFAULT 50.00,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  phone          TEXT,
  org_id         UUID REFERENCES organizations(id),
  roles          TEXT[] NOT NULL DEFAULT '{}',
  preferences    JSONB NOT NULL DEFAULT '{}',
  trust_score    NUMERIC(5,2) DEFAULT 50.00,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id   UUID NOT NULL REFERENCES users(id),
  city_id        UUID NOT NULL REFERENCES cities(id),
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft',
  edl            JSONB NOT NULL,            -- Full Event Description Language payload
  plan           JSONB,                      -- Generated plan (venues, vendors, staffing)
  schedule       TSTZRANGE,                  -- Event time range
  location       GEOMETRY(Point, 4326),      -- PostGIS point
  attendance     INT4RANGE,                  -- Expected attendance range
  budget_cents   BIGINT,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_city_status ON events(city_id, status);
CREATE INDEX idx_events_schedule ON events USING GIST(schedule);
CREATE INDEX idx_events_location ON events USING GIST(location);

-- Venues
CREATE TABLE venues (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id),
  name           TEXT NOT NULL,
  address        TEXT NOT NULL,
  location       GEOMETRY(Point, 4326) NOT NULL,
  capacity       INTEGER NOT NULL,
  venue_type     TEXT[] NOT NULL,            -- ["outdoor", "amphitheater", "park"]
  amenities      TEXT[] NOT NULL DEFAULT '{}',
  pricing        JSONB NOT NULL,             -- Rate card by event type / day
  availability   JSONB NOT NULL DEFAULT '{}',
  rules          JSONB NOT NULL DEFAULT '{}', -- Noise ordinances, hours, restrictions
  images         TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings (venue + vendor)
CREATE TABLE bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id),
  entity_type    TEXT NOT NULL CHECK (entity_type IN ('venue', 'vendor', 'equipment')),
  entity_id      UUID NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  terms          JSONB NOT NULL,             -- Negotiated terms
  price_cents    BIGINT NOT NULL,
  deposit_cents  BIGINT DEFAULT 0,
  scheduled      TSTZRANGE NOT NULL,
  negotiation_id UUID REFERENCES negotiations(id),
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Negotiations
CREATE TABLE negotiations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id),
  parties        UUID[] NOT NULL,            -- Agent entity IDs
  status         TEXT NOT NULL DEFAULT 'active',
  rounds         JSONB NOT NULL DEFAULT '[]', -- Array of NegotiationMessage
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permits
CREATE TABLE permits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id),
  permit_type    TEXT NOT NULL,
  jurisdiction   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'draft',
  application    JSONB NOT NULL,             -- Generated application data
  submission_ref TEXT,                        -- External reference ID
  approved_at    TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  documents      TEXT[] DEFAULT '{}',         -- S3 keys
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent Memory (persistent context per entity)
CREATE TABLE agent_memory (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    TEXT NOT NULL,
  entity_id      UUID NOT NULL,
  memory_type    TEXT NOT NULL,               -- "preference", "history", "constraint"
  content        TEXT NOT NULL,
  embedding      VECTOR(1536),               -- For semantic retrieval
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id, memory_type, content)
);

CREATE INDEX idx_agent_memory_entity ON agent_memory(entity_type, entity_id);
CREATE INDEX idx_agent_memory_embedding ON agent_memory USING ivfflat(embedding vector_cosine_ops);

-- Audit Log (every agent action)
CREATE TABLE audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID REFERENCES events(id),
  agent_type     TEXT NOT NULL,
  agent_entity_id UUID NOT NULL,
  action         TEXT NOT NULL,
  input          JSONB,
  output         JSONB,
  tool_name      TEXT,
  duration_ms    INTEGER,
  cost_usd       NUMERIC(10,6),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_event ON audit_log(event_id, created_at);
```

---

## 7. API Design

### REST API Conventions

- **Base URL:** `https://api.uniapp.city/v1`
- **Auth:** Bearer token (JWT) in `Authorization` header
- **Content-Type:** `application/json`
- **Pagination:** Cursor-based (`?cursor=xxx&limit=25`)
- **Filtering:** Query params (`?status=confirmed&city=austin`)
- **Sorting:** `?sort=-created_at` (prefix `-` for descending)
- **Envelope:** All responses wrapped in `{ data, meta, errors }`
- **Errors:** RFC 7807 Problem Details

### Key API Flows

#### Create Event from Natural Language

```
POST /v1/events
{
  "input": "I want to organize a weekend street food market in downtown Austin for about 1000 people, sometime in April. Budget around $15k.",
  "input_type": "natural_language"
}

Response 202:
{
  "data": {
    "id": "evt_abc123",
    "status": "planning",
    "edl": { ... },          // AI-generated EDL
    "plan": null,            // Will be populated by agents
    "checkpoints": [         // Upcoming approval gates
      { "type": "plan_review", "status": "pending" }
    ]
  }
}
```

#### Approve Plan Checkpoint

```
POST /v1/events/evt_abc123/approve
{
  "checkpoint_id": "chk_001",
  "decision": "approve",
  "modifications": {
    "budget.total": 18000
  }
}
```

#### Real-Time Event Dashboard (WebSocket)

```
WS /v1/events/evt_abc123/live

// Server pushes:
{ "type": "staffing_update", "data": { "checked_in": 12, "expected": 15 } }
{ "type": "attendance",      "data": { "current": 847, "capacity": 1000 } }
{ "type": "incident",        "data": { "severity": "low", "description": "..." } }
{ "type": "agent_action",    "data": { "agent": "vendor_agent", "action": "..." } }
```

---

## 8. AI Integration (Claude API)

### 8.1 Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Primary model** | `claude-opus-4-6` | Most capable for multi-agent coordination, complex reasoning, tool use |
| **Thinking mode** | Adaptive thinking | Dynamic reasoning depth without manual budget tuning |
| **Agent framework** | Claude Agent SDK (TypeScript) | Built-in tools, MCP support, hooks, subagents, permission system |
| **Direct API calls** | Claude API with tool runner | For structured tasks (NL→EDL, risk analysis, demand forecasting) |
| **Cost optimization** | Prompt caching + effort tuning + Haiku for simple tasks | Cache system prompts, use low effort for classification, batch where possible |

### 8.2 Natural Language → EDL Conversion

The primary entry point. Uses Claude API with structured outputs to guarantee valid EDL:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic();

const EDLSchema = z.object({
  meta: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(["festival", "market", "concert", "volunteer", "gathering", "emergency"]),
    expectedAttendance: z.object({ min: z.number(), max: z.number() }),
    visibility: z.enum(["public", "private", "invite_only"]),
  }),
  schedule: z.object({
    preferredDates: z.array(z.object({ start: z.string(), end: z.string() })),
    duration: z.string(),
    flexibility: z.enum(["exact", "flexible_days", "flexible_week"]),
  }),
  location: z.object({
    type: z.enum(["indoor", "outdoor", "hybrid"]),
    area: z.string(),
    requirements: z.array(z.string()),
  }),
  resources: z.object({
    vendors: z.array(z.object({ category: z.string(), count: z.number(), requirements: z.array(z.string()) })),
    staffing: z.array(z.object({ role: z.string(), count: z.number() })),
    volunteers: z.array(z.object({ role: z.string(), count: z.number(), skills: z.array(z.string()) })),
  }),
  budget: z.object({
    totalCents: z.number(),
    breakdown: z.array(z.object({ category: z.string(), amountCents: z.number() })),
  }),
});

async function parseEventIntent(userInput: string, cityContext: CityContext): Promise<z.infer<typeof EDLSchema>> {
  const response = await client.messages.parse({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    cache_control: { type: "ephemeral" },
    system: buildEDLSystemPrompt(cityContext),  // Includes city-specific rules, venue catalog, permit requirements
    messages: [{ role: "user", content: userInput }],
    output_config: {
      format: zodOutputFormat(EDLSchema),
    },
  });

  if (response.stop_reason === "refusal") {
    throw new ContentPolicyError("Event description was refused by the model");
  }

  return response.parsed_output!;
}
```

### 8.3 Agent Orchestration with Agent SDK

Each agent type runs as a subagent with entity-specific tools exposed via MCP:

```typescript
import { query, tool, createSdkMcpServer, ClaudeAgentOptions, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Define venue-specific tools
const checkAvailability = tool(
  "check_availability",
  "Check venue availability for a date range",
  { venueId: z.string(), dateRange: z.object({ start: z.string(), end: z.string() }) },
  async (args) => {
    const slots = await venueService.getAvailability(args.venueId, args.dateRange);
    return { content: [{ type: "text", text: JSON.stringify(slots) }] };
  }
);

const submitBid = tool(
  "submit_bid",
  "Submit a bid/proposal for an event booking",
  { eventId: z.string(), terms: z.object({ priceCents: z.number(), inclusions: z.array(z.string()) }) },
  async (args) => {
    const bid = await bookingService.createBid(args.eventId, args.terms);
    return { content: [{ type: "text", text: JSON.stringify(bid) }] };
  }
);

const venueTools = createSdkMcpServer({
  name: "venue-tools",
  tools: [checkAvailability, submitBid],
});

// Orchestrate multi-agent event planning
async function planEvent(eventId: string, edl: EventDescription) {
  for await (const message of query({
    prompt: buildPlanningPrompt(edl),
    options: {
      model: "claude-opus-4-6",
      allowedTools: ["Read", "Grep", "Agent"],
      maxTurns: 50,
      maxBudgetUsd: 5.00,
      systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
      agents: {
        "venue-scout": {
          description: "Finds and negotiates with venues matching event requirements",
          prompt: "You are a venue agent. Search for venues, check availability, and negotiate bookings.",
          tools: ["Read"],
        },
        "vendor-coordinator": {
          description: "Sources and coordinates vendors (food, equipment, services)",
          prompt: "You are a vendor coordinator. Find vendors, compare bids, and select the best options.",
          tools: ["Read"],
        },
        "permit-processor": {
          description: "Handles permit applications and compliance requirements",
          prompt: "You are a permit specialist. Determine required permits and prepare applications.",
          tools: ["Read"],
        },
      },
      mcpServers: { venueTools },
      hooks: {
        PreToolUse: [
          { matcher: "submit_bid|confirm_booking", hooks: [requireOrganizerApproval] },
        ],
        PostToolUse: [
          { matcher: ".*", hooks: [logToAuditTrail] },
        ],
        Stop: [{ matcher: ".*", hooks: [persistPlanResult] }],
      },
    },
  })) {
    if ("result" in message) {
      await eventService.updatePlan(eventId, message.result);
    }
  }
}
```

### 8.4 Demand Forecasting

Uses Claude with code execution for data analysis:

```typescript
async function forecastDemand(eventId: string, historicalData: string) {
  const uploaded = await client.beta.files.upload({
    file: Buffer.from(historicalData),
  });

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Analyze this historical event data and forecast expected attendance, resource needs, and staffing requirements. Generate confidence intervals." },
        { type: "container_upload", file_id: uploaded.id },
      ],
    }],
    tools: [{ type: "code_execution_20260120", name: "code_execution" }],
  }, { headers: { "anthropic-beta": "files-api-2025-04-14" } });

  return parseForecastResult(response);
}
```

### 8.5 Risk Assessment

```typescript
async function assessEventRisk(edl: EventDescription, venueData: VenueData) {
  const RiskSchema = z.object({
    overallScore: z.number().min(0).max(100),
    risks: z.array(z.object({
      category: z.enum(["safety", "weather", "compliance", "financial", "reputational"]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      description: z.string(),
      mitigation: z.string(),
      probability: z.number(),
    })),
    recommendations: z.array(z.string()),
    requiredContingencies: z.array(z.string()),
  });

  const response = await client.messages.parse({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: zodOutputFormat(RiskSchema) },
    system: RISK_ENGINE_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Assess risks for this event:\n\nEDL: ${JSON.stringify(edl)}\n\nVenue: ${JSON.stringify(venueData)}`,
    }],
  });

  return response.parsed_output!;
}
```

### 8.6 Cost Management

| Usage Pattern | Model | Strategy |
|---|---|---|
| NL → EDL conversion | Opus 4.6 | Prompt caching (system prompt + city context) |
| Agent orchestration | Opus 4.6 via Agent SDK | `maxBudgetUsd` per event, subagent limits |
| Risk assessment | Opus 4.6 | Adaptive thinking + high effort |
| Demand forecasting | Opus 4.6 + code execution | Code execution for data analysis |
| Notification templating | Haiku 4.5 | Low-cost, simple text generation |
| Search ranking | Haiku 4.5 | Batch API (50% cost reduction) |
| Classification (event type, permit type) | Haiku 4.5 | Low effort, fast response |

**Estimated monthly AI cost at scale (10,000 events/month):**

| Function | Calls/month | Avg tokens | Est. cost |
|---|---|---|---|
| NL → EDL | 10,000 | 3K in / 2K out | ~$650 |
| Agent orchestration | 50,000 | 10K in / 5K out | ~$8,750 |
| Risk assessment | 10,000 | 5K in / 3K out | ~$1,000 |
| Notifications (Haiku) | 100,000 | 500 in / 200 out | ~$150 |
| Search/classify (Haiku) | 500,000 | 300 in / 100 out | ~$200 |
| **Total** | | | **~$10,750/mo** |

---

## 9. Real-Time Communication

### WebSocket Architecture

```typescript
// Socket.io namespaces
/events/:eventId/live     // Live event dashboard
/negotiations/:negId      // Active negotiation updates
/agents/:agentId          // Agent activity stream
/notifications            // User notifications
```

### Event Types

| Namespace | Event | Payload |
|---|---|---|
| `/events/live` | `attendance_update` | `{ current, capacity, trend }` |
| `/events/live` | `staffing_update` | `{ role, checkedIn, expected }` |
| `/events/live` | `incident` | `{ severity, description, respondingAgent }` |
| `/events/live` | `agent_action` | `{ agentType, action, result }` |
| `/negotiations` | `proposal` | `NegotiationMessage` |
| `/negotiations` | `resolution` | `{ outcome, finalTerms }` |
| `/agents` | `thinking` | `{ agentId, status, currentTask }` |
| `/notifications` | `notification` | `{ type, title, body, actionUrl }` |

---

## 10. Authentication & Authorization

### Auth Stack

| Component | Technology |
|---|---|
| Identity provider | Auth0 / Clerk |
| Token format | JWT (RS256) |
| API auth | Bearer token |
| WebSocket auth | Token in connection handshake |
| Service-to-service | mTLS + service tokens |

### Role-Based Access Control (RBAC)

```typescript
enum Role {
  PLATFORM_ADMIN = "platform_admin",
  CITY_ADMIN = "city_admin",
  ORGANIZER = "organizer",
  VENUE_MANAGER = "venue_manager",
  VENDOR = "vendor",
  VOLUNTEER = "volunteer",
  ATTENDEE = "attendee",
}

// Permission matrix (subset)
const permissions: Record<Role, string[]> = {
  platform_admin: ["*"],
  city_admin: ["events:read", "events:approve", "permits:manage", "analytics:city"],
  organizer: ["events:create", "events:manage:own", "bookings:create", "agents:view:own"],
  venue_manager: ["venues:manage:own", "bookings:respond", "calendar:manage:own"],
  vendor: ["bids:create", "contracts:respond", "inventory:manage:own"],
  volunteer: ["shifts:browse", "shifts:signup", "profile:manage:own"],
  attendee: ["events:browse", "tickets:purchase", "reviews:create"],
};
```

---

## 11. Infrastructure & Deployment

### Kubernetes Architecture

```yaml
# Namespace per environment
namespaces: [uniapp-dev, uniapp-staging, uniapp-prod]

# Service deployments
deployments:
  - api-gateway:        { replicas: 3, cpu: "500m", memory: "512Mi" }
  - event-service:      { replicas: 3, cpu: "500m", memory: "1Gi" }
  - agent-service:      { replicas: 5, cpu: "1",    memory: "2Gi" }  # Higher resources for AI workloads
  - booking-service:    { replicas: 3, cpu: "500m", memory: "512Mi" }
  - permit-service:     { replicas: 2, cpu: "250m", memory: "256Mi" }
  - payment-service:    { replicas: 2, cpu: "250m", memory: "256Mi" }
  - notification-service: { replicas: 2, cpu: "250m", memory: "256Mi" }
  - search-service:     { replicas: 2, cpu: "500m", memory: "1Gi" }
  - websocket-service:  { replicas: 3, cpu: "500m", memory: "512Mi" }

# Horizontal Pod Autoscaling
hpa:
  agent-service: { minReplicas: 5, maxReplicas: 20, targetCPU: 70% }
  event-service: { minReplicas: 3, maxReplicas: 10, targetCPU: 75% }
```

### CI/CD Pipeline

```
Push → Lint + Type Check → Unit Tests → Build → Integration Tests → Deploy to Staging → E2E Tests → Deploy to Prod (manual gate)
```

### Multi-City Deployment

Each city is a logical tenant sharing the same infrastructure:

- **Database:** Row-level isolation via `city_id` column + RLS policies
- **Agent config:** City-specific permit rules, vendor catalogs, regulatory constraints stored in config DB
- **Search index:** Per-city index shards
- **Caching:** Namespaced Redis keys (`city:{cityId}:...`)

---

## 12. Observability

### Metrics (Prometheus / Datadog)

| Metric | Type | Labels |
|---|---|---|
| `uniapp_events_created_total` | Counter | `city, type, source` |
| `uniapp_agent_actions_total` | Counter | `agent_type, action, outcome` |
| `uniapp_negotiation_rounds` | Histogram | `agent_types, outcome` |
| `uniapp_ai_latency_seconds` | Histogram | `model, function, status` |
| `uniapp_ai_cost_usd` | Counter | `model, function` |
| `uniapp_booking_value_cents` | Counter | `entity_type, city` |
| `uniapp_permit_processing_seconds` | Histogram | `permit_type, jurisdiction` |

### Distributed Tracing

OpenTelemetry across all services. Every agent action gets a span:

```
Event Creation Trace:
├─ api-gateway: POST /v1/events (12ms)
├─ event-service: parseIntent (2400ms)
│  └─ claude-api: NL→EDL (2350ms)
├─ agent-service: planEvent (45000ms)
│  ├─ venue-scout agent (12000ms)
│  │  ├─ claude-api: venue search (800ms)
│  │  ├─ venue-service: getAvailability (45ms)
│  │  └─ claude-api: negotiate (3200ms)
│  ├─ vendor-coordinator agent (18000ms)
│  └─ permit-processor agent (8000ms)
└─ event-service: updatePlan (15ms)
```

### Alerting

| Alert | Condition | Severity |
|---|---|---|
| Agent failure rate > 5% | `rate(agent_actions{outcome="error"}[5m]) / rate(agent_actions[5m]) > 0.05` | Critical |
| AI cost spike | `sum(increase(ai_cost_usd[1h])) > $500` | Warning |
| Negotiation stalls | `negotiations{status="active", age > "2h"}` | Warning |
| Permit deadline approaching | `permits{status="pending", days_to_event < 7}` | Critical |

---

## 13. Security

### Threat Model

| Threat | Mitigation |
|---|---|
| Agent prompt injection | Input sanitization, agent-specific system prompts, output validation |
| Unauthorized agent actions | RBAC, approval gates, budget limits, audit logging |
| Data exfiltration via agents | Tool sandboxing, network segmentation, no direct DB access from agents |
| Payment fraud | Stripe Radar, escrow pattern, manual review for high-value transactions |
| Permit forgery | Cryptographic signatures on generated permits, verification with city APIs |
| PII exposure in agent memory | Encryption at rest, data retention policies, GDPR right-to-erasure |

### Agent Safety Guardrails

```typescript
const AGENT_GUARDRAILS = {
  maxBudgetPerAction: 1000_00,        // $1,000 max per single action
  maxBudgetPerEvent: 100_000_00,      // $100,000 max per event
  maxNegotiationRounds: 10,           // Prevent infinite negotiation loops
  maxAgentTurns: 50,                  // Prevent runaway agents
  requireApprovalFor: [
    "payment_above_500",
    "contract_signing",
    "permit_submission",
    "cancellation",
    "refund",
  ],
  prohibitedActions: [
    "direct_database_access",
    "external_api_calls_unapproved",
    "pii_sharing_between_agents",
  ],
};
```

---

## 14. Testing Strategy

### Test Pyramid

| Layer | Coverage Target | Tools |
|---|---|---|
| **Unit tests** | 80%+ | Vitest |
| **Integration tests** | Core flows | Vitest + Testcontainers (Postgres, Redis, NATS) |
| **Agent simulation tests** | All agent types | Claude Agent SDK with mock tools |
| **E2E tests** | Critical user journeys | Playwright |
| **Load tests** | Key APIs, WebSocket | k6 |
| **Chaos tests** | Agent failure modes | Custom fault injection |

### Agent Testing

```typescript
// Agent simulation test
describe("Venue Scout Agent", () => {
  it("should find and rank venues matching requirements", async () => {
    const mockVenueTools = createSdkMcpServer({
      name: "mock-venue-tools",
      tools: [
        tool("search_venues", "Search venues", { query: z.string() }, async () => ({
          content: [{ type: "text", text: JSON.stringify(mockVenues) }],
        })),
        tool("check_availability", "Check availability", { venueId: z.string() }, async () => ({
          content: [{ type: "text", text: JSON.stringify({ available: true }) }],
        })),
      ],
    });

    const results: string[] = [];
    for await (const message of query({
      prompt: "Find outdoor venues in Austin for 500 people in April",
      options: {
        allowedTools: ["Read"],
        mcpServers: { venues: mockVenueTools },
        maxTurns: 10,
      },
    })) {
      if ("result" in message) results.push(message.result);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toContain("venue");
  });
});
```

---

## 15. Development Phases

### Phase 1: Foundation (Weeks 1-8)

**Goal:** Single-city MVP with core event creation + venue booking.

- [ ] Project scaffolding (monorepo, CI/CD, infra-as-code)
- [ ] User service + auth (Auth0/Clerk)
- [ ] Event service with NL → EDL (Claude API + structured outputs)
- [ ] Venue service (CRUD, availability, search)
- [ ] Single-agent venue matching (Agent SDK)
- [ ] Basic booking flow (no negotiation)
- [ ] Web app MVP (event creation, venue selection, dashboard)
- [ ] PostgreSQL + Redis + basic monitoring

### Phase 2: Multi-Agent (Weeks 9-16)

**Goal:** Full multi-agent negotiation for events with vendors + volunteers.

- [ ] Agent runtime with negotiation protocol
- [ ] Vendor service + vendor agents
- [ ] Volunteer service + volunteer agents
- [ ] Constraint solver (conflict resolution)
- [ ] Approval gate system (human checkpoints)
- [ ] Real-time WebSocket dashboard
- [ ] Notification service
- [ ] Agent audit logging + observability

### Phase 3: City Integration (Weeks 17-24)

**Goal:** Permit automation + city government dashboard.

- [ ] Permit service with auto-generation
- [ ] City/government agent type
- [ ] Government admin dashboard
- [ ] Compliance monitoring
- [ ] Payment service (Stripe Connect)
- [ ] Reputation system v1
- [ ] Mobile app (React Native)
- [ ] Search & discovery service (OpenSearch)

### Phase 4: Intelligence (Weeks 25-32)

**Goal:** Demand forecasting, risk engine, sponsorship marketplace.

- [ ] Demand forecasting (Claude + code execution)
- [ ] Risk engine (continuous monitoring)
- [ ] Sponsor agents + sponsorship marketplace
- [ ] Attendee agents + personalized discovery
- [ ] Dynamic pricing for venues
- [ ] Analytics service (TimescaleDB)
- [ ] Advanced agent memory (pgvector semantic retrieval)
- [ ] Load testing + performance optimization

---

## Appendix A: Repository Structure

```
uniapp/
├── apps/
│   ├── web/                    # Next.js web application
│   ├── mobile/                 # React Native (Expo) mobile app
│   ├── admin/                  # City government admin console
│   └── api/                    # Fastify API server (monolith to start)
├── packages/
│   ├── agents/                 # Agent definitions, tools, prompts
│   │   ├── orchestrator/       # Main planning orchestrator
│   │   ├── venue-agent/        # Venue agent logic + tools
│   │   ├── vendor-agent/       # Vendor agent logic + tools
│   │   ├── volunteer-agent/    # Volunteer agent logic + tools
│   │   ├── city-agent/         # Government agent logic + tools
│   │   ├── sponsor-agent/      # Sponsor agent logic + tools
│   │   └── shared/             # Shared agent utilities, prompts, guardrails
│   ├── db/                     # Database schemas, migrations, queries
│   ├── edl/                    # Event Description Language types + validation
│   ├── negotiation/            # Negotiation protocol implementation
│   ├── constraint-solver/      # Constraint resolution engine
│   ├── shared/                 # Shared types, utilities, constants
│   └── ui/                     # Shared UI component library
├── infra/
│   ├── terraform/              # Infrastructure as code
│   ├── k8s/                    # Kubernetes manifests
│   └── docker/                 # Dockerfiles
├── tools/
│   ├── scripts/                # Dev scripts, seed data
│   └── mcp-servers/            # Custom MCP server definitions
├── turbo.json                  # Turborepo config
├── package.json
└── tsconfig.base.json
```

## Appendix B: Environment Variables

```bash
# Core
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NATS_URL=nats://...

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Auth
AUTH0_DOMAIN=uniapp.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# External
SENDGRID_API_KEY=SG....
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
MAPBOX_ACCESS_TOKEN=pk....

# Observability
DATADOG_API_KEY=...
SENTRY_DSN=https://...
```
