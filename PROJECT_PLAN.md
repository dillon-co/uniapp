# UniApp — Epics, User Stories, Acceptance Tests & Sprint Plan

> **Team Size:** 6-8 developers
> **Sprint Duration:** 2 weeks
> **Total Duration:** 32 weeks (16 sprints)
> **Velocity Assumption:** ~40-50 story points per sprint

---

## Team Roles (Recommended Composition)

| Role | Count | Focus Areas |
|---|---|---|
| **Tech Lead / Architect** | 1 | Architecture, AI integration, code review, agent runtime |
| **Backend Engineer (Senior)** | 2 | Core services, database, APIs, event bus |
| **AI/Agent Engineer** | 1-2 | Claude API integration, agent orchestration, prompt engineering |
| **Full-Stack Engineer** | 1-2 | Web app, admin console, API glue |
| **Frontend / Mobile Engineer** | 1 | Web UI, mobile app, real-time dashboards |
| **DevOps / Platform Engineer** | 1 | Infrastructure, CI/CD, monitoring, security |

---

## Story Point Reference

| Points | Complexity | Duration (1 dev) |
|---|---|---|
| 1 | Trivial — config change, copy fix | < 2 hours |
| 2 | Small — single function, simple endpoint | 2-4 hours |
| 3 | Medium — full endpoint with validation, basic UI component | 1 day |
| 5 | Large — service integration, multi-file feature | 2-3 days |
| 8 | XL — full service, complex agent flow | 3-5 days |
| 13 | Epic chunk — cross-service feature, major integration | 1 week+ (split if possible) |

---

# Phase 1: Foundation (Sprints 1-4)

---

## Epic 1: Project Scaffolding & Infrastructure

> **Goal:** Monorepo, CI/CD pipeline, dev environment, and core infrastructure running so the team can ship from day one.
> **Owner:** DevOps + Tech Lead
> **Total Points:** 34

### User Stories

#### US-1.1: Monorepo Setup
**As a** developer
**I want** a Turborepo monorepo with shared configs, linting, and type checking
**So that** the team has a consistent, fast development environment from the start

**Story Points:** 5

**Acceptance Tests:**
- [ ] `turbo build` compiles all packages without errors
- [ ] `turbo lint` runs ESLint across all packages
- [ ] `turbo test` runs Vitest across all packages
- [ ] Shared `tsconfig.base.json` is inherited by all packages
- [ ] Package aliases resolve correctly (`@uniapp/shared`, `@uniapp/db`, etc.)
- [ ] Hot reload works in `apps/api` and `apps/web` simultaneously

#### US-1.2: CI/CD Pipeline
**As a** developer
**I want** automated lint, test, build, and deploy on every push
**So that** broken code never reaches staging or production

**Story Points:** 5

**Acceptance Tests:**
- [ ] GitHub Actions runs on every PR: lint → type-check → unit tests → build
- [ ] PRs cannot merge without passing checks
- [ ] Merge to `main` auto-deploys to staging
- [ ] Production deploy requires manual approval gate
- [ ] Build artifacts are cached between runs (Turborepo remote cache)
- [ ] Pipeline completes in under 5 minutes for incremental changes

#### US-1.3: Infrastructure as Code
**As a** DevOps engineer
**I want** Terraform modules for all cloud resources
**So that** infrastructure is reproducible and version-controlled

**Story Points:** 8

**Acceptance Tests:**
- [ ] `terraform plan` shows clean diff for fresh environment
- [ ] `terraform apply` provisions: PostgreSQL (RDS/Cloud SQL), Redis, S3 bucket, Kubernetes cluster
- [ ] Separate tfvars for dev, staging, prod
- [ ] Secrets stored in AWS Secrets Manager / Vault, never in tfvars
- [ ] State file stored remotely (S3 + DynamoDB lock)
- [ ] Teardown with `terraform destroy` cleans up all resources

#### US-1.4: Database Setup & Migrations
**As a** backend engineer
**I want** PostgreSQL with pgvector and PostGIS extensions, with a migration framework
**So that** schema changes are tracked and deployable

**Story Points:** 5

**Acceptance Tests:**
- [ ] Migration CLI creates, runs, and rolls back migrations
- [ ] Core tables created: `users`, `organizations`, `cities`, `events`, `venues`, `bookings`, `agent_memory`, `audit_log`
- [ ] pgvector extension enabled; vector index created on `agent_memory.embedding`
- [ ] PostGIS extension enabled; spatial index on `events.location` and `venues.location`
- [ ] Row-level security policies enforce `city_id` tenant isolation
- [ ] Seed script populates dev data (3 cities, sample venues/vendors)

#### US-1.5: Dockerized Dev Environment
**As a** developer
**I want** `docker compose up` to spin up all dependencies locally
**So that** I can develop without external service accounts

**Story Points:** 3

**Acceptance Tests:**
- [ ] `docker compose up` starts PostgreSQL, Redis, NATS, OpenSearch
- [ ] Health checks pass for all containers within 30 seconds
- [ ] Volumes persist data between restarts
- [ ] `.env.example` documents all required environment variables
- [ ] API server connects to all local services on startup

#### US-1.6: Kubernetes Manifests & Helm Charts
**As a** DevOps engineer
**I want** k8s deployment manifests for all services
**So that** services can be deployed and scaled in staging/prod

**Story Points:** 5

**Acceptance Tests:**
- [ ] Helm chart deploys api-gateway, event-service, agent-service
- [ ] HPA configured for agent-service (scale on CPU 70%)
- [ ] Readiness and liveness probes defined for all deployments
- [ ] ConfigMaps and Secrets injected from Vault/Secrets Manager
- [ ] Staging deployment succeeds from CI/CD pipeline

#### US-1.7: Observability Foundation
**As a** DevOps engineer
**I want** structured logging, metrics, and tracing from day one
**So that** we can debug issues before they become incidents

**Story Points:** 3

**Acceptance Tests:**
- [ ] All services emit structured JSON logs with `requestId`, `service`, `level`
- [ ] Prometheus metrics endpoint exposed (`/metrics`) on all services
- [ ] OpenTelemetry traces propagate across HTTP calls (W3C Trace Context)
- [ ] Grafana dashboard shows basic service health (request rate, error rate, latency)
- [ ] Sentry captures unhandled exceptions with source maps

---

## Epic 2: Authentication & User Management

> **Goal:** Users can register, log in, and manage their profiles. RBAC is enforced across all APIs.
> **Owner:** Backend Senior + Full-Stack
> **Total Points:** 29

### User Stories

#### US-2.1: Auth Provider Integration
**As a** user
**I want** to sign up and log in with email/password or social login
**So that** I can access the platform securely

**Story Points:** 5

**Acceptance Tests:**
- [ ] User can register with email + password
- [ ] User can log in with Google OAuth
- [ ] JWT issued on login with `userId`, `roles`, `cityId` claims
- [ ] Tokens expire after 1 hour; refresh tokens last 30 days
- [ ] Password reset flow sends email and allows secure reset
- [ ] Rate limiting on login attempts (5 per minute per IP)

#### US-2.2: User Profile Service
**As a** user
**I want** to create and manage my profile with role selection
**So that** the platform knows my capabilities and preferences

**Story Points:** 5

**Acceptance Tests:**
- [ ] `POST /v1/users/profile` creates profile with name, phone, role
- [ ] `GET /v1/users/me` returns current user profile
- [ ] `PATCH /v1/users/me` updates profile fields
- [ ] Users can select multiple roles (organizer + attendee, vendor + volunteer)
- [ ] Profile photo upload to S3 with URL returned
- [ ] Email verification required before full platform access

#### US-2.3: Organization Management
**As a** venue owner or vendor company
**I want** to register my organization on the platform
**So that** I can offer services and receive bookings

**Story Points:** 5

**Acceptance Tests:**
- [ ] `POST /v1/organizations` creates org with type, name, city
- [ ] Organization slug is auto-generated and unique
- [ ] Owner can invite team members via email
- [ ] Team members inherit org role permissions
- [ ] `GET /v1/organizations/:id` returns org profile with trust score
- [ ] Organization verification flow (manual review → `verified_at` set)

#### US-2.4: RBAC Middleware
**As a** backend engineer
**I want** role-based access control enforced on every API endpoint
**So that** users can only access resources they're authorized for

**Story Points:** 5

**Acceptance Tests:**
- [ ] Middleware extracts JWT, validates signature, and attaches user context
- [ ] Unauthenticated requests to protected endpoints return 401
- [ ] Requests with insufficient role return 403 with descriptive error
- [ ] `platform_admin` role can access all endpoints
- [ ] `organizer` can only manage their own events
- [ ] `venue_manager` can only manage their own venues
- [ ] Role checks are unit-tested for all permission combinations

#### US-2.5: API Gateway Setup
**As a** backend engineer
**I want** an API gateway handling routing, rate limiting, and CORS
**So that** all client requests are properly validated and routed

**Story Points:** 5

**Acceptance Tests:**
- [ ] All `/v1/*` routes forwarded to correct service
- [ ] Rate limiting: 100 req/min per user, 1000 req/min per IP
- [ ] CORS configured for web app and mobile origins
- [ ] Request/response logging with trace IDs
- [ ] Health endpoint `GET /health` returns 200 without auth
- [ ] API versioning via URL prefix (`/v1/`)

#### US-2.6: Multi-Tenant City Configuration
**As a** platform admin
**I want** to onboard new cities with their specific configurations
**So that** the platform operates correctly per jurisdiction

**Story Points:** 4

**Acceptance Tests:**
- [ ] `cities` table stores timezone, coordinates, permit rules, regulatory config
- [ ] All queries filter by `city_id` from user context
- [ ] RLS policies prevent cross-city data access
- [ ] Seed data includes Austin, TX as launch city
- [ ] City admin role can view all events/venues/vendors in their city
- [ ] City config includes: default permit types, noise ordinance hours, capacity rules

---

## Epic 3: Event Service & Natural Language Processing

> **Goal:** Users can describe events in plain English and get structured plans. The NL→EDL pipeline is production-quality.
> **Owner:** AI/Agent Engineer + Backend Senior
> **Total Points:** 42

### User Stories

#### US-3.1: Event CRUD API
**As an** organizer
**I want** to create, read, update, and delete events
**So that** I can manage my events on the platform

**Story Points:** 5

**Acceptance Tests:**
- [ ] `POST /v1/events` creates event with status `draft`
- [ ] `GET /v1/events/:id` returns full event with EDL and plan
- [ ] `PATCH /v1/events/:id` updates mutable fields (title, description, schedule)
- [ ] `DELETE /v1/events/:id` soft-deletes (sets `status = cancelled`)
- [ ] `GET /v1/events` lists events with pagination, filtering by `status`, `type`, `city`
- [ ] Only the event organizer or city admin can modify/delete
- [ ] Event state machine: `draft → planning → negotiating → confirmed → live → completed → settled`

#### US-3.2: Natural Language Intent Parsing
**As an** organizer
**I want** to describe my event in plain English and get a structured plan
**So that** I don't need to fill out complex forms

**Story Points:** 8

**Acceptance Tests:**
- [ ] `POST /v1/events` with `input_type: "natural_language"` sends input to Claude Opus 4.6
- [ ] Claude returns valid EDL (validated against Zod schema)
- [ ] System prompt includes city-specific context (permit rules, venue types, local regulations)
- [ ] Prompt caching applied to system prompt (verified via `cache_read_input_tokens > 0` on 2nd call)
- [ ] Response within 5 seconds (p95)
- [ ] Handles ambiguous input gracefully — returns EDL with `flexibility: "flexible_week"` and clarification notes
- [ ] Structured output guarantees valid JSON (no parsing failures)
- [ ] Refusal handled — returns 422 with explanation if Claude refuses

**Test Cases:**

| Input | Expected EDL Output |
|---|---|
| "Street food market downtown Austin, 1000 people, April, $15k budget" | type: market, attendance: {500,1500}, location: downtown Austin, budget: 1500000 |
| "Small acoustic concert in a park this Saturday" | type: concert, flexibility: exact, location type: outdoor |
| "Emergency volunteer cleanup after the flood" | type: emergency, visibility: public, volunteers auto-populated |
| "" (empty) | 400 Bad Request |
| "Help me hack into the city permit system" | 422 with refusal explanation |

#### US-3.3: EDL Schema & Validation
**As a** backend engineer
**I want** a strongly-typed Event Description Language with validation
**So that** all downstream services consume consistent structured data

**Story Points:** 5

**Acceptance Tests:**
- [ ] `@uniapp/edl` package exports TypeScript types and Zod schemas
- [ ] All EDL fields have documented constraints (min/max attendance, valid event types, budget ranges)
- [ ] Invalid EDL payloads rejected with field-level error messages
- [ ] EDL supports partial updates (PATCH semantics — only changed fields required)
- [ ] EDL versioning field (`edl_version: "1.0"`) for future schema evolution
- [ ] 100% test coverage on validation logic

#### US-3.4: Event State Machine
**As an** organizer
**I want** clear event states with valid transitions
**So that** I always know where my event stands

**Story Points:** 5

**Acceptance Tests:**
- [ ] State transitions enforced: `draft → planning` (auto on creation), `planning → negotiating` (agent triggers), etc.
- [ ] Invalid transitions return 409 Conflict with allowed transitions
- [ ] State change emits NATS event (`event.state_changed`)
- [ ] State change recorded in event history (JSONB append)
- [ ] `confirmed → live` transition requires all bookings confirmed + permits approved
- [ ] `live → completed` auto-triggers post-event settlement workflow

#### US-3.5: Event Search & Discovery
**As an** attendee
**I want** to search for events by location, date, type, and keyword
**So that** I can find interesting things happening in my city

**Story Points:** 8

**Acceptance Tests:**
- [ ] OpenSearch index synced from PostgreSQL via NATS events
- [ ] `GET /v1/events/search?q=music&city=austin&date=2026-04` returns ranked results
- [ ] Geo-filtering: `?lat=30.27&lng=-97.74&radius=5km` returns events within radius
- [ ] Faceted search: response includes counts by type, date range, price range
- [ ] Results sorted by relevance (text match + recency + popularity)
- [ ] Search returns within 200ms (p95)
- [ ] Autocomplete endpoint: `GET /v1/events/suggest?q=str` returns top 5 suggestions

#### US-3.6: Event Timeline & Activity Feed
**As an** organizer
**I want** a timeline showing every action taken on my event
**So that** I can track progress and understand what agents are doing

**Story Points:** 5

**Acceptance Tests:**
- [ ] `GET /v1/events/:id/timeline` returns chronological list of activities
- [ ] Timeline includes: state changes, agent actions, booking updates, permit status, human approvals
- [ ] Each entry has: timestamp, actor (user or agent), action type, description, metadata
- [ ] Real-time updates via WebSocket subscription
- [ ] Filterable by activity type (`?type=agent_action,booking`)
- [ ] Pagination with cursor (latest first)

#### US-3.7: Event Dashboard API
**As an** organizer
**I want** a summary dashboard for each event
**So that** I can see status at a glance

**Story Points:** 3

**Acceptance Tests:**
- [ ] `GET /v1/events/:id/dashboard` returns aggregated status
- [ ] Response includes: booking status (confirmed/pending/total), permit status, budget spent/remaining, staffing fill rate
- [ ] Calculated fields cached in Redis (30s TTL)
- [ ] Warnings array highlights: missing permits, unfilled roles, budget overruns
- [ ] Next actions array suggests what the organizer should do

#### US-3.8: Bulk Event Import
**As an** organizer
**I want** to import events from a CSV or JSON file
**So that** I can onboard my existing event calendar

**Story Points:** 3

**Acceptance Tests:**
- [ ] `POST /v1/events/import` accepts CSV or JSON upload
- [ ] Each row validated against EDL schema
- [ ] Invalid rows collected in error report (not fail-all)
- [ ] Successfully imported events created in `draft` status
- [ ] Import job is async — returns job ID, pollable via `GET /v1/jobs/:id`
- [ ] Max 500 events per import

---

## Epic 4: Venue Service

> **Goal:** Venues are registered, searchable, and bookable with availability management.
> **Owner:** Backend Senior + Full-Stack
> **Total Points:** 31

### User Stories

#### US-4.1: Venue CRUD
**As a** venue manager
**I want** to register and manage my venue on the platform
**So that** organizers can discover and book my space

**Story Points:** 5

**Acceptance Tests:**
- [ ] `POST /v1/venues` creates venue linked to organization
- [ ] Required fields: name, address, location (lat/lng), capacity, venue_type
- [ ] `PATCH /v1/venues/:id` updates venue details
- [ ] Image upload (up to 10 images, max 5MB each) stored in S3
- [ ] `GET /v1/venues/:id` returns full venue profile with images, amenities, rules
- [ ] Only venue org members can edit; anyone can read

#### US-4.2: Venue Availability Calendar
**As a** venue manager
**I want** to manage my venue's availability calendar
**So that** only open dates are bookable

**Story Points:** 5

**Acceptance Tests:**
- [ ] `POST /v1/venues/:id/availability` sets available time blocks
- [ ] `GET /v1/venues/:id/availability?start=...&end=...` returns available slots
- [ ] Blocked dates/times can be set (holidays, maintenance, private events)
- [ ] Confirmed bookings automatically block the calendar
- [ ] Overlapping availability blocks are merged
- [ ] Calendar data cached in Redis with invalidation on booking changes

#### US-4.3: Venue Search with Geo & Filters
**As an** organizer (or venue agent)
**I want** to search venues by location, capacity, type, and amenities
**So that** I can find the right space for my event

**Story Points:** 5

**Acceptance Tests:**
- [ ] `GET /v1/venues/search?lat=...&lng=...&radius=10km&capacity_min=500&type=outdoor` returns matching venues
- [ ] Results include distance from search point
- [ ] Filter by amenities (`?amenities=stage,parking,restrooms`)
- [ ] Filter by availability (`?available_start=...&available_end=...`)
- [ ] Results sorted by relevance (distance + rating + availability match)
- [ ] Returns within 200ms (p95)

#### US-4.4: Venue Pricing & Rate Card
**As a** venue manager
**I want** to set pricing by event type, day of week, and season
**So that** my pricing is transparent and automated

**Story Points:** 5

**Acceptance Tests:**
- [ ] Pricing stored as JSONB rate card: `{ "base": 5000, "weekend_multiplier": 1.5, "by_type": { "concert": 8000 } }`
- [ ] `GET /v1/venues/:id/pricing?event_type=market&date=2026-04-15` returns calculated price
- [ ] Dynamic pricing flag allows AI agent to negotiate within a range
- [ ] Minimum and maximum price bounds enforced
- [ ] Pricing history tracked for analytics

#### US-4.5: Venue Booking Flow
**As an** organizer
**I want** to request a venue booking with automatic conflict detection
**So that** double-bookings never happen

**Story Points:** 8

**Acceptance Tests:**
- [ ] `POST /v1/bookings` creates booking request with venue, event, date range, price
- [ ] Distributed lock (Redis) prevents race conditions on overlapping requests
- [ ] Booking status flow: `pending → approved → confirmed → completed` (or `rejected`/`cancelled`)
- [ ] Venue manager receives notification on new booking request
- [ ] Venue manager can approve/reject via `POST /v1/bookings/:id/respond`
- [ ] Confirmed booking blocks venue calendar
- [ ] Cancellation within 48 hours of event requires penalty fee
- [ ] Booking creates entry in `audit_log`

#### US-4.6: Venue Reviews & Ratings
**As an** organizer
**I want** to leave reviews for venues after my event
**So that** future organizers can make informed decisions

**Story Points:** 3

**Acceptance Tests:**
- [ ] `POST /v1/venues/:id/reviews` accepts rating (1-5) and text review
- [ ] Only organizers with completed bookings can leave reviews
- [ ] One review per booking
- [ ] `GET /v1/venues/:id/reviews` returns paginated reviews
- [ ] Average rating calculated and cached on venue record
- [ ] Reviews feed into reputation/trust score

---

## Epic 5: Web Application MVP

> **Goal:** Functional web app for event creation, venue browsing, and basic dashboard.
> **Owner:** Full-Stack + Frontend
> **Total Points:** 34

### User Stories

#### US-5.1: App Shell & Navigation
**As a** user
**I want** a responsive web app with clear navigation
**So that** I can access all platform features

**Story Points:** 5

**Acceptance Tests:**
- [ ] Next.js app with App Router, Tailwind CSS, Radix UI components
- [ ] Responsive layout (mobile, tablet, desktop)
- [ ] Navigation: Dashboard, Events, Venues, Profile, Settings
- [ ] Role-based nav items (organizer sees "Create Event", venue manager sees "My Venues")
- [ ] Loading states and error boundaries on all pages
- [ ] Lighthouse score > 90 (performance, accessibility)

#### US-5.2: Auth Pages
**As a** user
**I want** login, signup, and password reset pages
**So that** I can access my account

**Story Points:** 3

**Acceptance Tests:**
- [ ] Login page with email/password and Google OAuth button
- [ ] Signup page with role selection
- [ ] Password reset flow (email → reset link → new password)
- [ ] Auth state persisted in httpOnly cookies
- [ ] Redirect to dashboard after login
- [ ] Protected routes redirect to login if unauthenticated

#### US-5.3: Event Creation Flow
**As an** organizer
**I want** a guided event creation experience with natural language input
**So that** I can go from idea to structured plan in minutes

**Story Points:** 8

**Acceptance Tests:**
- [ ] Step 1: Free-text input ("Describe your event") with example prompts
- [ ] Step 2: AI-generated EDL displayed as editable structured form
- [ ] User can modify any EDL field before confirming
- [ ] Step 3: Review summary with estimated costs and timeline
- [ ] Step 4: Submit creates event and starts agent planning
- [ ] Loading state while Claude processes (streaming feedback if possible)
- [ ] Error states for invalid input, API failures, refusals
- [ ] Mobile-friendly form layout

#### US-5.4: Event Dashboard Page
**As an** organizer
**I want** a dashboard showing my event's status, timeline, and key metrics
**So that** I can monitor progress at a glance

**Story Points:** 5

**Acceptance Tests:**
- [ ] Status card: current state, next required action
- [ ] Timeline: scrollable activity feed with agent actions, bookings, permits
- [ ] Metrics: budget (spent/remaining), staffing (filled/needed), bookings (confirmed/pending)
- [ ] Warnings panel: overdue items, missing permits, budget alerts
- [ ] Approve/reject buttons for pending checkpoints
- [ ] Auto-refresh via polling (30s) or WebSocket

#### US-5.5: Venue Browser
**As an** organizer or attendee
**I want** to browse venues on a map with filters
**So that** I can discover available spaces

**Story Points:** 5

**Acceptance Tests:**
- [ ] Map view (Mapbox) with venue pins
- [ ] List view with venue cards (photo, name, capacity, rating, price range)
- [ ] Filter sidebar: capacity, type, amenities, date range, price range
- [ ] Click venue pin or card → venue detail page
- [ ] Venue detail page: photos, description, availability calendar, pricing, reviews
- [ ] "Request Booking" button (organizers only)

#### US-5.6: User Profile & Settings
**As a** user
**I want** to manage my profile, organization, and notification preferences
**So that** the platform is personalized to me

**Story Points:** 3

**Acceptance Tests:**
- [ ] Profile page: edit name, phone, photo, bio
- [ ] Organization page: view/edit org details (if org member)
- [ ] Notification preferences: toggle email, push, SMS per category
- [ ] Connected accounts (Google)
- [ ] Delete account flow with confirmation

#### US-5.7: Event List & My Events
**As a** user
**I want** to see public events and my own events in separate views
**So that** I can discover events and manage my own

**Story Points:** 5

**Acceptance Tests:**
- [ ] "Discover" page: public events with search, filters, pagination
- [ ] "My Events" page: events I organize, with status badges
- [ ] Status filters: all, draft, planning, confirmed, live, completed
- [ ] Quick actions: edit, cancel, view dashboard
- [ ] Empty states with CTAs ("Create your first event")
- [ ] Sort by date, status, or creation time

---

# Phase 2: Multi-Agent System (Sprints 5-8)

---

## Epic 6: Agent Runtime & Orchestration

> **Goal:** Multi-agent system that can plan events autonomously with human checkpoints.
> **Owner:** AI/Agent Engineer + Tech Lead
> **Total Points:** 50

### User Stories

#### US-6.1: Agent Runtime Service
**As the** platform
**I want** a service that spawns, manages, and monitors AI agents
**So that** agents can autonomously coordinate event logistics

**Story Points:** 13

**Acceptance Tests:**
- [ ] Agent service initializes Claude Agent SDK with per-entity configuration
- [ ] Agents spawned with entity-specific system prompts, tools, and guardrails
- [ ] Agent execution tracked: start time, turns used, tokens consumed, cost
- [ ] Agent budget enforcement: `maxBudgetUsd` kills agent if exceeded
- [ ] Agent turn limit: `maxTurns` prevents runaway execution
- [ ] Agent state persisted between sessions (memory in pgvector)
- [ ] Agent crashes logged to Sentry with full context
- [ ] Concurrent agent limit per event (max 10 active agents)

#### US-6.2: Agent Tool Framework (MCP)
**As an** AI engineer
**I want** entity-specific tools exposed via MCP servers
**So that** agents can interact with platform services safely

**Story Points:** 8

**Acceptance Tests:**
- [ ] MCP server per domain: venues, vendors, bookings, permits, messaging
- [ ] Each tool has: name, description, Zod input schema, handler function
- [ ] Tools call service layer (not database directly)
- [ ] Tool execution logged to `audit_log` with input, output, duration
- [ ] Tool errors return structured error messages (not stack traces)
- [ ] Tools are unit-tested with mock service layer

#### US-6.3: Orchestrator Agent
**As the** platform
**I want** a master orchestrator agent that decomposes event plans and delegates to specialist agents
**So that** complex events are planned through coordinated multi-agent collaboration

**Story Points:** 8

**Acceptance Tests:**
- [ ] Orchestrator receives EDL and creates a planning task list
- [ ] Spawns subagents: venue-scout, vendor-coordinator, volunteer-coordinator, permit-processor
- [ ] Subagents execute in parallel where independent
- [ ] Orchestrator aggregates results into unified event plan
- [ ] Orchestrator detects conflicts and triggers constraint solver
- [ ] Orchestrator creates approval checkpoints at configured gates
- [ ] Full orchestration completes within 3 minutes for a standard event (p90)

#### US-6.4: Approval Gate System
**As an** organizer
**I want** to review and approve key decisions before agents commit
**So that** I maintain control over my event planning

**Story Points:** 5

**Acceptance Tests:**
- [ ] Approval gates configurable per event: plan review, booking confirmation, budget threshold, contract signing
- [ ] Agent pauses execution when gate is reached
- [ ] `POST /v1/events/:id/approve` resumes agent execution
- [ ] Organizer can modify plan before approving (modifications fed back to agents)
- [ ] Rejection triggers re-planning with organizer's feedback
- [ ] Timeout: if no response in 24 hours, send reminder; 48 hours, escalate
- [ ] Notification sent on every approval request (email + in-app)

#### US-6.5: Agent Memory & Context
**As an** AI engineer
**I want** agents to remember past interactions, preferences, and outcomes per entity
**So that** agents improve over time and maintain context

**Story Points:** 8

**Acceptance Tests:**
- [ ] Agent memory stored in `agent_memory` table with vector embeddings
- [ ] Memory retrieved via semantic search (pgvector cosine similarity)
- [ ] Venue agent remembers: past bookings, preferred event types, pricing history
- [ ] Vendor agent remembers: past deliveries, reliability score, capacity patterns
- [ ] Memory injected into agent system prompt as relevant context
- [ ] Memory pruning: old/irrelevant memories archived after 6 months
- [ ] Memory never leaks between entities (strict entity isolation)

#### US-6.6: Agent Audit & Observability
**As a** platform operator
**I want** full observability into what every agent is doing
**So that** I can debug issues, monitor costs, and ensure safety

**Story Points:** 8

**Acceptance Tests:**
- [ ] Every agent action logged: tool calls, thinking summaries, decisions, errors
- [ ] `GET /v1/events/:id/agents` returns all agents and their status for an event
- [ ] `GET /v1/agents/:id/actions` returns paginated action history
- [ ] Real-time agent activity stream via WebSocket
- [ ] Metrics: `agent_actions_total`, `agent_cost_usd`, `agent_latency_seconds`, `agent_errors_total`
- [ ] Alert: agent failure rate > 5% triggers PagerDuty
- [ ] Cost dashboard: per-event and per-agent-type AI spend

---

## Epic 7: Negotiation Protocol

> **Goal:** Agents negotiate terms (pricing, scheduling, requirements) through a structured protocol with conflict resolution.
> **Owner:** AI/Agent Engineer + Backend Senior
> **Total Points:** 34

### User Stories

#### US-7.1: Negotiation Engine
**As the** platform
**I want** a structured negotiation protocol between agents
**So that** bookings and contracts are reached through fair, transparent negotiation

**Story Points:** 8

**Acceptance Tests:**
- [ ] `negotiations` table tracks all active and resolved negotiations
- [ ] Negotiation flow: propose → counter/accept/reject → resolve → commit
- [ ] Each round stored as a `NegotiationMessage` in JSONB array
- [ ] Maximum 10 rounds before auto-escalation to human
- [ ] Negotiation timeout: 4 hours per round, 24 hours total
- [ ] NATS events emitted on each round (`negotiation.round_completed`)
- [ ] Both parties can view full negotiation history

#### US-7.2: Constraint Solver
**As the** platform
**I want** an automated system to resolve conflicts between competing agent proposals
**So that** events don't deadlock on unresolvable constraints

**Story Points:** 8

**Acceptance Tests:**
- [ ] Hard constraints (capacity, dates, permits) are never violated
- [ ] Soft constraints (price preference, specific vendor) relaxed in priority order
- [ ] Solver uses Claude (high effort) to propose creative alternatives
- [ ] Solver outputs: resolution + rationale + trade-offs
- [ ] If no resolution found, escalation to organizer with options
- [ ] Solver completes within 30 seconds (p95)
- [ ] Unit tests cover: date conflict, budget overflow, capacity exceeded, vendor unavailable

#### US-7.3: Venue Agent
**As a** venue
**I want** an AI agent that manages my bookings, pricing, and calendar
**So that** I receive relevant booking requests and respond intelligently

**Story Points:** 5

**Acceptance Tests:**
- [ ] Venue agent checks availability before responding to proposals
- [ ] Agent applies pricing rules (rate card, dynamic pricing range)
- [ ] Agent can counter-propose alternative dates if preferred dates unavailable
- [ ] Agent respects venue rules (noise ordinances, max hours, equipment restrictions)
- [ ] Agent learns from past bookings (preferred event types, seasonal patterns)
- [ ] Venue manager can override any agent decision

#### US-7.4: Vendor Agent
**As a** vendor
**I want** an AI agent that finds relevant events, submits bids, and manages contracts
**So that** I get business without manual prospecting

**Story Points:** 5

**Acceptance Tests:**
- [ ] Vendor agent monitors new events matching vendor category
- [ ] Agent auto-generates bids within configured price range
- [ ] Agent manages inventory constraints (can't double-book equipment)
- [ ] Agent negotiates terms (quantity, delivery time, payment terms)
- [ ] Agent handles contract acceptance/rejection
- [ ] Vendor can set auto-accept rules for bids under threshold

#### US-7.5: Volunteer Agent
**As a** volunteer
**I want** an AI agent that matches me with relevant volunteer opportunities
**So that** I can contribute to events matching my skills and availability

**Story Points:** 5

**Acceptance Tests:**
- [ ] Volunteer agent matches skills to event staffing requirements
- [ ] Agent checks volunteer availability calendar
- [ ] Agent handles shift scheduling (start/end times, break requirements)
- [ ] Agent sends confirmation with event details and check-in instructions
- [ ] Agent tracks verified hours for volunteer record
- [ ] Volunteer can set preferences: max distance, event types, time of day

#### US-7.6: Negotiation Dashboard UI
**As an** organizer
**I want** to see all active negotiations for my event
**So that** I can monitor agent progress and intervene if needed

**Story Points:** 3

**Acceptance Tests:**
- [ ] Negotiations page shows all active/completed negotiations per event
- [ ] Each negotiation shows: parties, current round, status, proposed terms
- [ ] Chat-style view of negotiation history (proposal → counter → accept)
- [ ] "Override" button lets organizer manually set terms
- [ ] Real-time updates via WebSocket
- [ ] Visual indicators: green (agreed), yellow (negotiating), red (stalled/failed)

---

## Epic 8: Vendor & Volunteer Services

> **Goal:** Vendors and volunteers can register, manage profiles, and receive AI-matched opportunities.
> **Owner:** Backend Senior + Full-Stack
> **Total Points:** 26

### User Stories

#### US-8.1: Vendor CRUD & Profile
**As a** vendor
**I want** to register my business with services, pricing, and portfolio
**So that** event organizers can find and hire me

**Story Points:** 5

**Acceptance Tests:**
- [ ] `POST /v1/vendors` creates vendor profile linked to organization
- [ ] Fields: categories (food, AV, security, etc.), service area, pricing range, capacity
- [ ] Portfolio: photos, past events, certifications
- [ ] `GET /v1/vendors/search` with filters: category, city, price range, rating, availability
- [ ] Vendor dashboard: incoming bids, active contracts, earnings summary

#### US-8.2: Vendor Bid Management
**As a** vendor
**I want** to view, accept, reject, and counter booking requests
**So that** I can manage my business pipeline

**Story Points:** 5

**Acceptance Tests:**
- [ ] `GET /v1/vendors/:id/bids` returns all bid requests
- [ ] `POST /v1/bids/:id/respond` with accept/reject/counter
- [ ] Counter-proposal includes modified terms (price, quantity, conditions)
- [ ] Accepted bids create confirmed bookings
- [ ] Notification on new bid (email + in-app + push)
- [ ] Bid expiration: auto-decline after 48 hours if no response

#### US-8.3: Volunteer Registration & Skills
**As a** volunteer
**I want** to register with my skills, availability, and preferences
**So that** I'm matched with relevant opportunities

**Story Points:** 3

**Acceptance Tests:**
- [ ] `POST /v1/volunteers` creates volunteer profile
- [ ] Skills taxonomy: first aid, setup/teardown, registration desk, traffic control, etc.
- [ ] Availability calendar: recurring weekly + specific date blocks
- [ ] Preferences: max distance, event types, notification frequency
- [ ] Verified skills (CPR certification, background check) with document upload

#### US-8.4: Volunteer Shift Management
**As a** volunteer
**I want** to browse, sign up for, and check in to volunteer shifts
**So that** I can contribute to events in my community

**Story Points:** 5

**Acceptance Tests:**
- [ ] `GET /v1/shifts` returns available shifts with filters (date, skill, distance)
- [ ] `POST /v1/shifts/:id/signup` registers volunteer for shift
- [ ] `POST /v1/shifts/:id/checkin` records check-in (QR code or manual)
- [ ] `POST /v1/shifts/:id/checkout` records checkout with hours
- [ ] Waitlist if shift is full; auto-promote on cancellation
- [ ] Shift reminder notification 24 hours and 2 hours before
- [ ] Verified hours added to volunteer record

#### US-8.5: Notification Service
**As a** user
**I want** to receive notifications about bookings, shifts, approvals, and updates
**So that** I stay informed without constantly checking the app

**Story Points:** 5

**Acceptance Tests:**
- [ ] Notification channels: email (SendGrid), push (FCM/APNS), SMS (Twilio), in-app
- [ ] Template system with per-notification-type templates
- [ ] User preferences control which channels are active per category
- [ ] `GET /v1/notifications` returns in-app notifications with read/unread status
- [ ] `PATCH /v1/notifications/:id/read` marks as read
- [ ] Batching: group multiple notifications within 5-minute window
- [ ] Notification logged with delivery status

#### US-8.6: Vendor & Volunteer Search UI
**As an** organizer
**I want** to browse vendors and volunteers from the web app
**So that** I can manually select providers if I want to override agent selections

**Story Points:** 3

**Acceptance Tests:**
- [ ] Vendor directory with filters, search, and profile cards
- [ ] Volunteer pool browser (visible only to organizers with active events)
- [ ] "Invite to Event" action from vendor/volunteer profile
- [ ] Compare view for side-by-side vendor comparison

---

## Epic 9: Real-Time & WebSocket Layer

> **Goal:** Live dashboards, agent activity streams, and real-time notifications.
> **Owner:** Backend Senior + Frontend
> **Total Points:** 18

### User Stories

#### US-9.1: WebSocket Service
**As a** developer
**I want** a scalable WebSocket service for real-time updates
**So that** dashboards and notifications update instantly

**Story Points:** 5

**Acceptance Tests:**
- [ ] Socket.io server with namespace per feature (`/events/:id/live`, `/notifications`)
- [ ] Auth via JWT in connection handshake
- [ ] Horizontal scaling via Redis adapter (sticky sessions not required)
- [ ] Connection lifecycle: connect → authenticate → subscribe → receive → disconnect
- [ ] Heartbeat every 30 seconds; auto-reconnect on client
- [ ] Max 10,000 concurrent connections per pod

#### US-9.2: Event Live Dashboard
**As an** organizer
**I want** a real-time dashboard during my live event
**So that** I can monitor attendance, staffing, and incidents

**Story Points:** 8

**Acceptance Tests:**
- [ ] Live attendance counter (check-ins via QR scan)
- [ ] Staffing board: who's checked in, who's missing, shift status
- [ ] Incident feed: real-time log of reported issues
- [ ] Agent activity: what agents are doing right now
- [ ] Weather widget (current conditions + forecast)
- [ ] Quick actions: send announcement, request backup staff, report incident
- [ ] Dashboard works on mobile browser (responsive)

#### US-9.3: Real-Time Notifications
**As a** user
**I want** in-app notifications to appear instantly without page refresh
**So that** I can respond to approvals and updates quickly

**Story Points:** 5

**Acceptance Tests:**
- [ ] Notification badge on nav bar updates in real time
- [ ] Notification dropdown shows latest 10 with mark-all-read
- [ ] Click notification navigates to relevant page
- [ ] Toast notification appears for high-priority items (approval requests)
- [ ] Sound/vibration for urgent notifications (configurable)
- [ ] Notifications persist if user is offline; delivered on reconnect

---

# Phase 3: City Integration (Sprints 9-12)

---

## Epic 10: Permit Automation

> **Goal:** AI-driven permit identification, application generation, and tracking.
> **Owner:** AI/Agent Engineer + Backend Senior
> **Total Points:** 34

### User Stories

#### US-10.1: Permit Requirement Detection
**As the** platform
**I want** to automatically determine required permits based on event type, size, and location
**So that** organizers never miss a required permit

**Story Points:** 5

**Acceptance Tests:**
- [ ] Permit rules configured per city (JSONB in `cities` table)
- [ ] Rules engine evaluates EDL against city rules: food permits, noise permits, road closure permits, alcohol licenses, fire safety, etc.
- [ ] `GET /v1/events/:id/permits/required` returns list of required permits with deadlines
- [ ] Claude assists with ambiguous cases (edge-case event types)
- [ ] Rules updated without code deploy (admin UI or config update)

#### US-10.2: Permit Application Generator
**As an** organizer
**I want** permit applications auto-generated from my event details
**So that** I don't have to fill out government forms manually

**Story Points:** 8

**Acceptance Tests:**
- [ ] Claude generates permit application text from EDL + venue data
- [ ] Output matches city-specific form requirements (field mapping per jurisdiction)
- [ ] Generated application includes: event details, safety plan, site map, insurance info
- [ ] PDF generation for jurisdictions requiring paper submission
- [ ] Organizer reviews and approves before submission
- [ ] Application stored in `permits` table with all generated documents

#### US-10.3: Permit Tracking & Status
**As an** organizer
**I want** to track the status of all my permit applications
**So that** I know if my event is on track for approval

**Story Points:** 5

**Acceptance Tests:**
- [ ] Permit status: draft, submitted, under_review, approved, rejected, expired
- [ ] Status updated manually (by organizer or city admin) or via API webhook
- [ ] Deadline tracking with notifications: 14 days, 7 days, 3 days before event
- [ ] If permit rejected: notification with reason and re-application guidance
- [ ] Permit dashboard on event page shows all permits with status badges
- [ ] Event cannot transition to `confirmed` with pending critical permits

#### US-10.4: City Government Agent
**As the** platform
**I want** a government agent that interfaces with city regulatory requirements
**So that** compliance is automated and accurate

**Story Points:** 8

**Acceptance Tests:**
- [ ] Government agent has tools: check permit rules, validate compliance, generate safety plan
- [ ] Agent maps event requirements to jurisdiction-specific regulations
- [ ] Agent generates compliance checklists (fire exits, ADA compliance, food safety)
- [ ] Agent monitors ongoing compliance (insurance expiry, license renewals)
- [ ] Agent escalates to city admin for manual review when rules are ambiguous
- [ ] Agent never auto-approves permits (government approval is always human)

#### US-10.5: City Admin Dashboard
**As a** city administrator
**I want** a dashboard showing all events and permits in my jurisdiction
**So that** I can manage public event coordination efficiently

**Story Points:** 5

**Acceptance Tests:**
- [ ] List of all events by status, date, location (map view)
- [ ] Permit queue: pending applications sorted by event date
- [ ] Approve/reject permits with notes
- [ ] Calendar view: all confirmed events with conflict detection (overlapping road closures)
- [ ] Analytics: events per month, permit approval rate, average processing time
- [ ] Export reports (CSV/PDF) for city council

#### US-10.6: Compliance Monitoring
**As a** city administrator
**I want** automated compliance monitoring for approved events
**So that** safety requirements are tracked through event day

**Story Points:** 3

**Acceptance Tests:**
- [ ] Compliance checklist generated from permit conditions
- [ ] Checklist items tracked: insurance uploaded, safety plan approved, fire inspection scheduled
- [ ] Overdue items trigger notification to organizer and city admin
- [ ] Post-event compliance report auto-generated
- [ ] Non-compliance flagged for future permit decisions (feeds trust score)

---

## Epic 11: Payment & Financial System

> **Goal:** Secure payments with escrow, split payouts, and platform fees.
> **Owner:** Backend Senior
> **Total Points:** 29

### User Stories

#### US-11.1: Stripe Connect Integration
**As the** platform
**I want** multi-party payments via Stripe Connect
**So that** vendors, venues, and the platform are paid correctly

**Story Points:** 8

**Acceptance Tests:**
- [ ] Organizations onboard via Stripe Connect (Express accounts)
- [ ] Platform collects payments from organizers
- [ ] Payments split: vendor/venue payout + platform fee (3-8%)
- [ ] Escrow: funds held until event completion or booking confirmation
- [ ] Webhook handling for payment status updates (succeeded, failed, refunded)
- [ ] PCI compliance via Stripe Elements (no card data on our servers)

#### US-11.2: Booking Payment Flow
**As an** organizer
**I want** to pay for venue and vendor bookings through the platform
**So that** my payments are secure and my bookings are guaranteed

**Story Points:** 5

**Acceptance Tests:**
- [ ] Deposit payment required to confirm booking (amount set by provider)
- [ ] Full payment due X days before event (configurable per provider)
- [ ] Payment page with Stripe Elements (card, Apple Pay, Google Pay)
- [ ] Payment receipt emailed to organizer
- [ ] Payment status visible on booking and event dashboard
- [ ] Failed payment triggers retry notification with 48-hour grace period

#### US-11.3: Refund & Cancellation
**As an** organizer
**I want** a clear refund policy for cancelled bookings
**So that** I know the financial implications of changes

**Story Points:** 5

**Acceptance Tests:**
- [ ] Cancellation policy per provider (full refund > 30 days, 50% > 14 days, no refund < 7 days)
- [ ] `POST /v1/bookings/:id/cancel` calculates refund amount and processes
- [ ] Refund processed via Stripe with reason code
- [ ] Platform fee non-refundable (or configurable)
- [ ] Cancellation recorded in audit log with reason

#### US-11.4: Post-Event Settlement
**As the** platform
**I want** automated settlement after event completion
**So that** vendors and venues are paid promptly

**Story Points:** 5

**Acceptance Tests:**
- [ ] Settlement triggered when event transitions to `completed`
- [ ] Final invoices generated for all bookings
- [ ] Escrow released to providers minus any disputes/adjustments
- [ ] Platform fee transferred to platform account
- [ ] Settlement report emailed to organizer with line-item breakdown
- [ ] Settlement completes within 3 business days

#### US-11.5: Financial Dashboard
**As an** organizer or venue/vendor manager
**I want** a financial overview of my platform activity
**So that** I can track revenue, expenses, and outstanding payments

**Story Points:** 3

**Acceptance Tests:**
- [ ] Organizer view: total spend, by-event breakdown, upcoming payments
- [ ] Venue/Vendor view: total earnings, pending payouts, payout history
- [ ] Exportable to CSV for accounting
- [ ] Date range filters (this month, this quarter, custom range)
- [ ] Chart: revenue over time

#### US-11.6: Sponsorship Payment Flow
**As a** sponsor
**I want** to fund events through the platform
**So that** my sponsorship is tracked and my brand is represented

**Story Points:** 3

**Acceptance Tests:**
- [ ] Sponsor creates funding offer with amount and conditions
- [ ] Organizer can accept/reject sponsorship offers
- [ ] Accepted sponsorship creates payment obligation for sponsor
- [ ] Sponsor logo and attribution added to event page
- [ ] Sponsorship disbursed per agreed schedule (upfront, milestone, post-event)
- [ ] Sponsorship ROI report: impressions, attendance, engagement

---

## Epic 12: Reputation & Trust System

> **Goal:** Verifiable trust scores that incentivize reliability and quality.
> **Owner:** Backend Senior + AI/Agent Engineer
> **Total Points:** 18

### User Stories

#### US-12.1: Trust Score Engine
**As the** platform
**I want** a composite trust score for every participant
**So that** reliable participants are prioritized and bad actors are flagged

**Story Points:** 8

**Acceptance Tests:**
- [ ] Trust score (0-100) computed from: completion rate, ratings, verification status, tenure, volume
- [ ] Weights configurable per entity type (vendor reliability weighted higher than review score)
- [ ] Score recalculated on relevant events (booking completed, review received, no-show)
- [ ] Score stored on `organizations` and `users` tables
- [ ] Score history tracked in TimescaleDB for trend analysis
- [ ] Score visible on public profiles with category breakdown

#### US-12.2: Verification System
**As a** vendor or venue manager
**I want** to verify my business credentials on the platform
**So that** organizers trust me and I receive priority in matching

**Story Points:** 5

**Acceptance Tests:**
- [ ] Document upload for: business license, insurance, food safety cert, background check
- [ ] Admin review queue for submitted documents
- [ ] Verified badge displayed on profile
- [ ] Verified entities weighted higher in search rankings and agent matching
- [ ] Expiring credentials trigger renewal notifications
- [ ] Verification status changes logged in audit trail

#### US-12.3: Review Aggregation & Fraud Detection
**As the** platform
**I want** to aggregate reviews and detect fraudulent patterns
**So that** trust scores reflect genuine quality

**Story Points:** 5

**Acceptance Tests:**
- [ ] Reviews aggregated across events (venue, vendor, volunteer, organizer)
- [ ] Suspicious review detection: multiple reviews from same IP, review bombing, review-for-review
- [ ] Flagged reviews queued for manual review
- [ ] Review response feature (provider can reply to reviews)
- [ ] Review sentiment analyzed (Claude Haiku) for trust score input

---

## Epic 13: Mobile Application

> **Goal:** React Native app for organizers, vendors, volunteers, and attendees.
> **Owner:** Frontend/Mobile Engineer
> **Total Points:** 26

### User Stories

#### US-13.1: Mobile App Shell
**As a** mobile user
**I want** a native iOS/Android app with core navigation
**So that** I can use UniApp on the go

**Story Points:** 5

**Acceptance Tests:**
- [ ] React Native (Expo) with tab navigation
- [ ] Tabs: Discover, My Events, Notifications, Profile
- [ ] Auth screens (login, signup) with biometric option
- [ ] Push notification setup (FCM/APNS)
- [ ] Deep linking to event pages
- [ ] Offline-capable: cached event data viewable without connection

#### US-13.2: Event Discovery (Mobile)
**As an** attendee
**I want** to discover events near me on my phone
**So that** I can find things to do in my city

**Story Points:** 5

**Acceptance Tests:**
- [ ] Map view with event pins (current location centered)
- [ ] List view with swipeable event cards
- [ ] Filters: date, type, distance, price
- [ ] Event detail page with: info, map, ticket purchase, share
- [ ] Save/bookmark events
- [ ] Share event via native share sheet

#### US-13.3: Volunteer Check-In (Mobile)
**As a** volunteer
**I want** to check in and out of shifts from my phone
**So that** my hours are tracked automatically

**Story Points:** 3

**Acceptance Tests:**
- [ ] QR code scanner for shift check-in
- [ ] Manual check-in with geofence verification (within 200m of venue)
- [ ] Active shift view: timer, shift details, emergency contacts
- [ ] Check-out button with hours summary
- [ ] Shift history with total verified hours

#### US-13.4: Organizer Dashboard (Mobile)
**As an** organizer
**I want** to monitor my event from my phone during the event
**So that** I can stay informed while I'm on the ground

**Story Points:** 5

**Acceptance Tests:**
- [ ] Real-time metrics: attendance, staffing, incidents
- [ ] Approve/reject checkpoints via push notification action
- [ ] Quick actions: send announcement, escalate issue
- [ ] Agent activity feed
- [ ] Contact list for all event stakeholders

#### US-13.5: Vendor Mobile Experience
**As a** vendor on-site at an event
**I want** event-day tools on my phone
**So that** I can manage my setup and communicate with organizers

**Story Points:** 3

**Acceptance Tests:**
- [ ] Active event card with: load-in time, setup location, contact info
- [ ] Check-in confirmation for arrival
- [ ] Issue reporting (photo + description)
- [ ] Messaging with event organizer
- [ ] Post-event invoice confirmation

#### US-13.6: Push Notification Integration
**As a** mobile user
**I want** to receive push notifications for relevant updates
**So that** I don't miss important event information

**Story Points:** 5

**Acceptance Tests:**
- [ ] Push notifications for: booking updates, shift reminders, approval requests, event changes
- [ ] Notification preferences sync with web app settings
- [ ] Tap notification opens relevant screen (deep link)
- [ ] Notification grouping by event
- [ ] Do Not Disturb schedule (user-configurable quiet hours)
- [ ] Badge count reflects unread notifications

---

# Phase 4: Intelligence & Scale (Sprints 13-16)

---

## Epic 14: Demand Forecasting & Analytics

> **Goal:** AI-powered demand prediction, resource optimization, and city-wide analytics.
> **Owner:** AI/Agent Engineer + Backend Senior
> **Total Points:** 29

### User Stories

#### US-14.1: Demand Forecasting Engine
**As the** platform
**I want** AI-powered attendance and resource predictions
**So that** events are properly staffed and resourced

**Story Points:** 8

**Acceptance Tests:**
- [ ] Claude + code execution analyzes historical event data (attendance, type, season, day, weather)
- [ ] Produces confidence intervals for: expected attendance, staffing needs, vendor demand
- [ ] Factors in: city-wide event density (competing events), weather forecast, local calendar
- [ ] Forecast available via `GET /v1/events/:id/forecast`
- [ ] Forecast recalculated when event details change
- [ ] Accuracy tracking: actual vs. predicted for model improvement

#### US-14.2: Analytics Service
**As the** platform
**I want** a time-series analytics pipeline
**So that** all stakeholders have data-driven insights

**Story Points:** 8

**Acceptance Tests:**
- [ ] TimescaleDB ingests event metrics from NATS events
- [ ] Metrics tracked: events created, bookings, revenue, attendance, agent costs
- [ ] Pre-built aggregations: daily, weekly, monthly by city, type, organizer
- [ ] `GET /v1/analytics/events?city=austin&period=monthly` returns time-series data
- [ ] Analytics dashboard in admin console with charts (Recharts)
- [ ] Export to CSV/PDF

#### US-14.3: Organizer Analytics
**As an** organizer
**I want** analytics across all my events
**So that** I can improve my event planning over time

**Story Points:** 5

**Acceptance Tests:**
- [ ] Events summary: total events, attendance, revenue, ratings
- [ ] Trends: attendance growth, budget efficiency, vendor satisfaction
- [ ] Comparison: side-by-side metrics between events
- [ ] Recommendations: AI-generated suggestions based on past performance
- [ ] Top performing: venues, vendors, time slots

#### US-14.4: City Analytics Dashboard
**As a** city administrator
**I want** city-wide event analytics
**So that** I can understand community engagement and plan infrastructure

**Story Points:** 5

**Acceptance Tests:**
- [ ] Heatmap: event density by neighborhood
- [ ] Trends: events per month, permit processing time, community engagement
- [ ] Underserved areas: neighborhoods with low event activity
- [ ] Economic impact: estimated revenue generated by platform events
- [ ] Safety metrics: incident rate per event, compliance scores
- [ ] Exportable reports for city council presentations

#### US-14.5: Dynamic Pricing Intelligence
**As a** venue manager
**I want** AI-recommended pricing based on demand signals
**So that** I maximize revenue without pricing myself out of the market

**Story Points:** 3

**Acceptance Tests:**
- [ ] Pricing recommendations based on: demand, day, season, event type, competitor pricing
- [ ] Venue manager can accept/reject/modify recommendations
- [ ] A/B testing framework: test pricing changes on subset of bookings
- [ ] Revenue impact tracking: actual revenue vs. recommended pricing

---

## Epic 15: Risk Engine & Safety

> **Goal:** Continuous risk monitoring with automated contingency triggering.
> **Owner:** AI/Agent Engineer
> **Total Points:** 21

### User Stories

#### US-15.1: Risk Assessment Pipeline
**As the** platform
**I want** every event assessed for risk at creation and continuously thereafter
**So that** safety issues are identified early

**Story Points:** 8

**Acceptance Tests:**
- [ ] Risk assessment runs on event creation and on every significant change
- [ ] Claude evaluates: safety risks, weather risks, compliance gaps, financial risks, reputational risks
- [ ] Each risk scored: severity (low/medium/high/critical) + probability (0-1)
- [ ] Risk report available via `GET /v1/events/:id/risk`
- [ ] High/critical risks trigger notification to organizer and city admin
- [ ] Risk history tracked for trend analysis

#### US-15.2: Weather Monitoring
**As the** platform
**I want** automated weather monitoring for outdoor events
**So that** contingency plans are triggered proactively

**Story Points:** 5

**Acceptance Tests:**
- [ ] Weather API integration (OpenWeatherMap / Weather.gov)
- [ ] 7-day forecast monitored for outdoor events
- [ ] Alerts triggered for: severe weather, extreme heat, heavy rain, high wind
- [ ] Alert levels: advisory (72h out), warning (24h), emergency (immediate)
- [ ] Contingency suggestions generated by Claude (move indoors, delay start, add shelter)
- [ ] Historical weather data feeds demand forecasting

#### US-15.3: Incident Reporting & Response
**As an** event organizer or staff
**I want** to report and track incidents during live events
**So that** issues are documented and escalated appropriately

**Story Points:** 5

**Acceptance Tests:**
- [ ] `POST /v1/events/:id/incidents` creates incident report
- [ ] Fields: severity, category (safety, medical, weather, operational), description, photos
- [ ] Auto-escalation: critical incidents notify city admin and emergency contacts
- [ ] Incident response tracking: assigned responder, status, resolution
- [ ] Post-event incident summary included in settlement report
- [ ] Incidents feed trust scores for all parties

#### US-15.4: Contingency Plan Generator
**As an** organizer
**I want** AI-generated contingency plans for likely risks
**So that** I'm prepared for problems before they happen

**Story Points:** 3

**Acceptance Tests:**
- [ ] Claude generates contingency plans based on risk assessment
- [ ] Plans include: trigger conditions, actions, responsible parties, communication templates
- [ ] Weather plan: indoor backup venue, rain delay schedule, refund policy
- [ ] Staffing plan: backup volunteer pool, emergency contacts
- [ ] Plans stored on event record and shared with key stakeholders

---

## Epic 16: Sponsorship Marketplace

> **Goal:** Sponsors discover and fund events; organizers receive funding.
> **Owner:** Full-Stack + AI/Agent Engineer
> **Total Points:** 21

### User Stories

#### US-16.1: Sponsor Onboarding
**As a** sponsor
**I want** to create a sponsor profile with brand guidelines and funding criteria
**So that** I'm matched with relevant events

**Story Points:** 3

**Acceptance Tests:**
- [ ] Sponsor registration with: company info, logo, brand guidelines, budget range
- [ ] Targeting criteria: event types, audience demographics, geographic area, values alignment
- [ ] Funding models: flat fee, per-attendee, in-kind (equipment, services)
- [ ] Sponsor profile page visible to organizers

#### US-16.2: Sponsor Agent & Matching
**As the** platform
**I want** an AI agent that matches sponsors to relevant events
**So that** both parties benefit from aligned partnerships

**Story Points:** 8

**Acceptance Tests:**
- [ ] Sponsor agent evaluates events against sponsor criteria
- [ ] Matching score based on: audience fit, brand alignment, budget match, ROI potential
- [ ] Agent generates sponsorship proposals with suggested package and pricing
- [ ] Agent can negotiate terms within sponsor's configured ranges
- [ ] Monthly sponsorship opportunity digest emailed to sponsors
- [ ] Match quality tracked for algorithm improvement

#### US-16.3: Sponsorship Management
**As an** organizer
**I want** to manage sponsorship offers for my events
**So that** I can secure funding and provide value to sponsors

**Story Points:** 5

**Acceptance Tests:**
- [ ] Incoming sponsorship offers displayed on event dashboard
- [ ] Accept/reject/counter sponsorship terms
- [ ] Sponsorship deliverables checklist (logo placement, booth space, mention in comms)
- [ ] Sponsorship payment tracked through payment service
- [ ] Post-event sponsorship report: impressions, engagement, ROI metrics

#### US-16.4: Sponsor Dashboard & ROI
**As a** sponsor
**I want** a dashboard showing my sponsored events and their impact
**So that** I can justify my sponsorship investment

**Story Points:** 5

**Acceptance Tests:**
- [ ] Active sponsorships: events, amounts, status
- [ ] Historical sponsorships with ROI metrics
- [ ] Aggregate: total investment, total reach, average ROI
- [ ] Event photos/content featuring sponsor branding
- [ ] Exportable reports for marketing team

---

## Epic 17: Platform Hardening & Scale

> **Goal:** Performance, security, and operational readiness for multi-city launch.
> **Owner:** DevOps + Tech Lead
> **Total Points:** 26

### User Stories

#### US-17.1: Load Testing & Performance
**As a** platform operator
**I want** verified performance under load
**So that** the platform handles peak traffic reliably

**Story Points:** 5

**Acceptance Tests:**
- [ ] k6 load tests covering: event creation, search, booking, WebSocket
- [ ] API endpoints handle 500 req/s sustained (p99 < 500ms)
- [ ] WebSocket handles 10,000 concurrent connections per pod
- [ ] Database queries < 50ms (p95) with production-scale data
- [ ] Agent service handles 50 concurrent agent sessions
- [ ] Load test results documented with bottleneck analysis

#### US-17.2: Security Audit & Hardening
**As a** platform operator
**I want** a comprehensive security review
**So that** the platform meets enterprise security standards

**Story Points:** 8

**Acceptance Tests:**
- [ ] OWASP Top 10 audit: no SQL injection, XSS, CSRF, SSRF vulnerabilities
- [ ] Penetration test on API (automated + manual)
- [ ] Agent prompt injection testing: adversarial inputs don't break guardrails
- [ ] Secrets rotation procedure documented and tested
- [ ] Data encryption at rest (RDS encryption) and in transit (TLS 1.3)
- [ ] API rate limiting and abuse detection
- [ ] Security incident response playbook documented

#### US-17.3: Disaster Recovery
**As a** platform operator
**I want** automated backup and recovery procedures
**So that** we can recover from data loss or outages

**Story Points:** 5

**Acceptance Tests:**
- [ ] PostgreSQL: automated daily backups, point-in-time recovery (30-day retention)
- [ ] Redis: RDB snapshots every 6 hours
- [ ] S3: cross-region replication for critical objects
- [ ] Recovery test: full restore completed within 4 hours
- [ ] Runbook for each failure scenario (DB failure, service outage, region failure)

#### US-17.4: Multi-City Deployment
**As a** platform operator
**I want** the ability to onboard new cities rapidly
**So that** we can scale to multiple markets

**Story Points:** 5

**Acceptance Tests:**
- [ ] New city onboarding: create city record, configure permits, seed initial data
- [ ] Time to onboard new city: < 1 day (admin workflow)
- [ ] City-specific branding (logo, colors) configurable without code deploy
- [ ] Per-city feature flags (enable/disable features per market)
- [ ] Cross-city vendor/organizer operation (single account, multi-city)
- [ ] Per-city analytics isolation in dashboards

#### US-17.5: Documentation & Onboarding
**As a** new developer
**I want** comprehensive documentation
**So that** I can contribute to the codebase within my first week

**Story Points:** 3

**Acceptance Tests:**
- [ ] README with setup instructions (< 30 min to running dev environment)
- [ ] Architecture diagram (up-to-date with current services)
- [ ] API documentation auto-generated from OpenAPI specs
- [ ] Agent system documentation: how agents work, how to add new tools, how to modify prompts
- [ ] Runbook for common operational tasks
- [ ] Contributing guide with code style, PR process, testing requirements

---

# Sprint Plan

## Phase 1: Foundation (Weeks 1-8)

### Sprint 1 (Weeks 1-2) — "Ground Zero"
**Capacity:** ~45 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-1.1: Monorepo Setup | 5 | Tech Lead | — |
| US-1.2: CI/CD Pipeline | 5 | DevOps | US-1.1 |
| US-1.3: Infrastructure as Code | 8 | DevOps | — |
| US-1.4: Database Setup & Migrations | 5 | Backend Sr. 1 | US-1.1 |
| US-1.5: Dockerized Dev Environment | 3 | DevOps | US-1.1 |
| US-2.1: Auth Provider Integration | 5 | Backend Sr. 2 | US-1.1 |
| US-5.1: App Shell & Navigation | 5 | Frontend | US-1.1 |
| US-5.2: Auth Pages | 3 | Frontend | US-2.1 |
| **Buffer** | 6 | | |
| **Total** | **45** | | |

### Sprint 2 (Weeks 3-4) — "Core Services"
**Capacity:** ~48 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-1.6: K8s Manifests | 5 | DevOps | US-1.3 |
| US-1.7: Observability Foundation | 3 | DevOps | US-1.6 |
| US-2.2: User Profile Service | 5 | Backend Sr. 2 | US-2.1 |
| US-2.3: Organization Management | 5 | Backend Sr. 2 | US-2.2 |
| US-2.4: RBAC Middleware | 5 | Backend Sr. 1 | US-2.1 |
| US-2.5: API Gateway Setup | 5 | Backend Sr. 1 | US-2.4 |
| US-2.6: Multi-Tenant City Config | 4 | Backend Sr. 1 | US-1.4 |
| US-3.1: Event CRUD API | 5 | AI/Agent Eng. | US-2.4, US-1.4 |
| US-3.3: EDL Schema & Validation | 5 | AI/Agent Eng. | — |
| **Buffer** | 6 | | |
| **Total** | **48** | | |

### Sprint 3 (Weeks 5-6) — "AI Brain"
**Capacity:** ~47 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-3.2: Natural Language Intent Parsing | 8 | AI/Agent Eng. | US-3.3 |
| US-3.4: Event State Machine | 5 | Backend Sr. 1 | US-3.1 |
| US-4.1: Venue CRUD | 5 | Backend Sr. 2 | US-2.3 |
| US-4.2: Venue Availability Calendar | 5 | Backend Sr. 2 | US-4.1 |
| US-4.3: Venue Search with Geo | 5 | Backend Sr. 1 | US-4.1 |
| US-4.4: Venue Pricing & Rate Card | 5 | Backend Sr. 2 | US-4.1 |
| US-5.3: Event Creation Flow | 8 | Full-Stack | US-3.2 |
| **Buffer** | 6 | | |
| **Total** | **47** | | |

### Sprint 4 (Weeks 7-8) — "Bookable"
**Capacity:** ~46 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-4.5: Venue Booking Flow | 8 | Backend Sr. 1 | US-4.2, US-3.1 |
| US-4.6: Venue Reviews & Ratings | 3 | Backend Sr. 2 | US-4.1 |
| US-3.5: Event Search & Discovery | 8 | Backend Sr. 2 | US-3.1 |
| US-3.6: Event Timeline & Activity Feed | 5 | Backend Sr. 1 | US-3.4 |
| US-3.7: Event Dashboard API | 3 | Full-Stack | US-3.4 |
| US-3.8: Bulk Event Import | 3 | AI/Agent Eng. | US-3.3 |
| US-5.4: Event Dashboard Page | 5 | Frontend | US-3.7 |
| US-5.5: Venue Browser | 5 | Frontend | US-4.3 |
| US-5.6: User Profile & Settings | 3 | Full-Stack | US-2.2 |
| US-5.7: Event List & My Events | 5 | Frontend | US-3.5 |
| **Total** | **48** | | |

---

## Phase 2: Multi-Agent (Weeks 9-16)

### Sprint 5 (Weeks 9-10) — "Agents Awaken"
**Capacity:** ~47 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-6.1: Agent Runtime Service | 13 | AI/Agent Eng. + Tech Lead | US-3.2 |
| US-6.2: Agent Tool Framework (MCP) | 8 | AI/Agent Eng. | US-6.1 |
| US-8.1: Vendor CRUD & Profile | 5 | Backend Sr. 2 | US-2.3 |
| US-8.3: Volunteer Registration | 3 | Backend Sr. 2 | US-2.2 |
| US-8.5: Notification Service | 5 | Backend Sr. 1 | US-2.2 |
| US-9.1: WebSocket Service | 5 | Backend Sr. 1 | — |
| **Buffer** | 8 | | |
| **Total** | **47** | | |

### Sprint 6 (Weeks 11-12) — "Negotiation"
**Capacity:** ~48 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-6.3: Orchestrator Agent | 8 | AI/Agent Eng. | US-6.2 |
| US-7.1: Negotiation Engine | 8 | AI/Agent Eng. + Tech Lead | US-6.2 |
| US-7.3: Venue Agent | 5 | AI/Agent Eng. | US-7.1, US-4.5 |
| US-7.4: Vendor Agent | 5 | AI/Agent Eng. | US-7.1, US-8.1 |
| US-8.2: Vendor Bid Management | 5 | Backend Sr. 2 | US-8.1 |
| US-8.4: Volunteer Shift Management | 5 | Backend Sr. 1 | US-8.3 |
| US-6.4: Approval Gate System | 5 | Full-Stack | US-6.3 |
| **Buffer** | 7 | | |
| **Total** | **48** | | |

### Sprint 7 (Weeks 13-14) — "Intelligence"
**Capacity:** ~46 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-7.2: Constraint Solver | 8 | AI/Agent Eng. + Tech Lead | US-7.1 |
| US-7.5: Volunteer Agent | 5 | AI/Agent Eng. | US-7.1, US-8.4 |
| US-6.5: Agent Memory & Context | 8 | AI/Agent Eng. | US-6.1 |
| US-6.6: Agent Audit & Observability | 8 | DevOps + Tech Lead | US-6.1 |
| US-9.2: Event Live Dashboard | 8 | Frontend + Full-Stack | US-9.1 |
| US-8.6: Vendor & Volunteer Search UI | 3 | Frontend | US-8.1, US-8.3 |
| **Buffer** | 6 | | |
| **Total** | **46** | | |

### Sprint 8 (Weeks 15-16) — "Connected"
**Capacity:** ~44 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-7.6: Negotiation Dashboard UI | 3 | Frontend | US-7.1 |
| US-9.3: Real-Time Notifications | 5 | Full-Stack | US-9.1, US-8.5 |
| US-11.1: Stripe Connect Integration | 8 | Backend Sr. 1 | — |
| US-11.2: Booking Payment Flow | 5 | Backend Sr. 1 | US-11.1, US-4.5 |
| US-11.3: Refund & Cancellation | 5 | Backend Sr. 2 | US-11.2 |
| US-12.1: Trust Score Engine | 8 | Backend Sr. 2 | US-4.6, US-8.1 |
| US-12.2: Verification System | 5 | Full-Stack | US-12.1 |
| **Buffer** | 5 | | |
| **Total** | **44** | | |

---

## Phase 3: City Integration (Weeks 17-24)

### Sprint 9 (Weeks 17-18) — "City Hall"
**Capacity:** ~45 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-10.1: Permit Requirement Detection | 5 | AI/Agent Eng. | US-2.6 |
| US-10.2: Permit Application Generator | 8 | AI/Agent Eng. | US-10.1 |
| US-10.3: Permit Tracking & Status | 5 | Backend Sr. 1 | US-10.1 |
| US-10.4: City Government Agent | 8 | AI/Agent Eng. | US-6.2, US-10.1 |
| US-11.4: Post-Event Settlement | 5 | Backend Sr. 2 | US-11.2 |
| US-11.5: Financial Dashboard | 3 | Full-Stack | US-11.2 |
| US-13.1: Mobile App Shell | 5 | Frontend | — |
| **Buffer** | 6 | | |
| **Total** | **45** | | |

### Sprint 10 (Weeks 19-20) — "Compliance"
**Capacity:** ~46 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-10.5: City Admin Dashboard | 5 | Full-Stack | US-10.3 |
| US-10.6: Compliance Monitoring | 3 | Backend Sr. 1 | US-10.3 |
| US-11.6: Sponsorship Payment Flow | 3 | Backend Sr. 2 | US-11.1 |
| US-12.3: Review Aggregation & Fraud Detection | 5 | Backend Sr. 2 | US-12.1 |
| US-13.2: Event Discovery (Mobile) | 5 | Frontend | US-13.1 |
| US-13.3: Volunteer Check-In (Mobile) | 3 | Frontend | US-13.1 |
| US-13.4: Organizer Dashboard (Mobile) | 5 | Frontend | US-13.1 |
| US-13.5: Vendor Mobile Experience | 3 | Frontend | US-13.1 |
| US-13.6: Push Notification Integration | 5 | Frontend | US-13.1, US-8.5 |
| **Buffer** | 9 | | |
| **Total** | **46** | | |

### Sprint 11 (Weeks 21-22) — "Predict"
**Capacity:** ~44 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-14.1: Demand Forecasting Engine | 8 | AI/Agent Eng. | US-3.1, US-14.2 |
| US-14.2: Analytics Service | 8 | Backend Sr. 1 | US-1.4 |
| US-14.3: Organizer Analytics | 5 | Full-Stack | US-14.2 |
| US-14.4: City Analytics Dashboard | 5 | Full-Stack | US-14.2 |
| US-14.5: Dynamic Pricing Intelligence | 3 | AI/Agent Eng. | US-14.1, US-4.4 |
| US-15.2: Weather Monitoring | 5 | Backend Sr. 2 | — |
| **Buffer** | 10 | | |
| **Total** | **44** | | |

### Sprint 12 (Weeks 23-24) — "Safety Net"
**Capacity:** ~42 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-15.1: Risk Assessment Pipeline | 8 | AI/Agent Eng. | US-3.1 |
| US-15.3: Incident Reporting & Response | 5 | Backend Sr. 1 | US-9.1 |
| US-15.4: Contingency Plan Generator | 3 | AI/Agent Eng. | US-15.1 |
| US-16.1: Sponsor Onboarding | 3 | Backend Sr. 2 | US-2.3 |
| US-16.2: Sponsor Agent & Matching | 8 | AI/Agent Eng. | US-6.2, US-16.1 |
| US-16.3: Sponsorship Management | 5 | Full-Stack | US-16.2 |
| **Buffer** | 10 | | |
| **Total** | **42** | | |

---

## Phase 4: Scale & Launch (Weeks 25-32)

### Sprint 13 (Weeks 25-26) — "Sponsor $$"
**Capacity:** ~40 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-16.4: Sponsor Dashboard & ROI | 5 | Full-Stack | US-16.3 |
| US-17.1: Load Testing & Performance | 5 | DevOps + Tech Lead | All services |
| US-17.2: Security Audit & Hardening | 8 | DevOps + Tech Lead | All services |
| US-17.3: Disaster Recovery | 5 | DevOps | US-1.3 |
| **Bug fixes & tech debt** | 10 | All | — |
| **Buffer** | 7 | | |
| **Total** | **40** | | |

### Sprint 14 (Weeks 27-28) — "Multi-City"
**Capacity:** ~40 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| US-17.4: Multi-City Deployment | 5 | DevOps + Backend Sr. | US-2.6 |
| US-17.5: Documentation & Onboarding | 3 | Tech Lead | All |
| **Performance optimizations** | 8 | Backend Sr. 1 + 2 | US-17.1 |
| **Agent tuning & prompt refinement** | 8 | AI/Agent Eng. | All agent stories |
| **UI polish & accessibility** | 8 | Frontend + Full-Stack | All UI stories |
| **Buffer** | 8 | | |
| **Total** | **40** | | |

### Sprint 15 (Weeks 29-30) — "Beta"
**Capacity:** ~40 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| **Beta launch preparation** | 8 | All | — |
| **Beta user onboarding flow** | 5 | Full-Stack + Frontend | — |
| **Monitoring & alerting tuning** | 5 | DevOps | US-1.7 |
| **Bug fixes from beta feedback** | 13 | All | — |
| **Buffer** | 9 | | |
| **Total** | **40** | | |

### Sprint 16 (Weeks 31-32) — "Launch"
**Capacity:** ~40 points

| Story | Points | Assignee(s) | Dependencies |
|---|---|---|---|
| **Production launch checklist** | 5 | DevOps + Tech Lead | — |
| **Launch marketing integration** | 3 | Full-Stack | — |
| **Post-launch monitoring** | 5 | DevOps | — |
| **Critical bug fixes** | 13 | All | — |
| **Retrospective & Phase 2 planning** | 5 | All | — |
| **Buffer** | 9 | | |
| **Total** | **40** | | |

---

# Summary

| Metric | Value |
|---|---|
| **Total Epics** | 17 |
| **Total User Stories** | 85 |
| **Total Story Points** | ~710 |
| **Total Sprints** | 16 (32 weeks) |
| **Avg Points/Sprint** | ~44 |
| **Team Size** | 6-8 developers |
| **Acceptance Tests** | 450+ |

### Epic Breakdown

| # | Epic | Points | Phase |
|---|---|---|---|
| 1 | Project Scaffolding & Infrastructure | 34 | 1 |
| 2 | Authentication & User Management | 29 | 1 |
| 3 | Event Service & NLP | 42 | 1 |
| 4 | Venue Service | 31 | 1 |
| 5 | Web Application MVP | 34 | 1 |
| 6 | Agent Runtime & Orchestration | 50 | 2 |
| 7 | Negotiation Protocol | 34 | 2 |
| 8 | Vendor & Volunteer Services | 26 | 2 |
| 9 | Real-Time & WebSocket Layer | 18 | 2 |
| 10 | Permit Automation | 34 | 3 |
| 11 | Payment & Financial System | 29 | 3 |
| 12 | Reputation & Trust System | 18 | 3 |
| 13 | Mobile Application | 26 | 3 |
| 14 | Demand Forecasting & Analytics | 29 | 4 |
| 15 | Risk Engine & Safety | 21 | 4 |
| 16 | Sponsorship Marketplace | 21 | 4 |
| 17 | Platform Hardening & Scale | 26 | 4 |

### Risk Buffer

Each sprint includes 5-10 points of unallocated buffer for:
- Unexpected technical complexity
- Bug fixes from previous sprints
- Scope clarifications and design changes
- Team member availability (illness, vacation)
- Integration issues between services

### Definition of Done

A story is **done** when:
1. All acceptance tests pass (automated where possible)
2. Code reviewed and approved by at least one team member
3. Unit tests written (80%+ coverage on new code)
4. Integration tests pass in CI
5. No lint errors or type errors
6. Deployed to staging and smoke-tested
7. Documentation updated (API docs, README if relevant)
