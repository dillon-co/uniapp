#!/usr/bin/env bash
set -euo pipefail

REPO="dillon-co/uniapp"

s() {
  local title="$1" labels="$2" milestone="$3" body="$4"
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --milestone "$milestone" --body "$body" 2>&1 | tail -1
}

echo "=== Phase 1 Stories ==="

# ── Epic 1: Project Scaffolding ──

s "US-1.1: Monorepo Setup" "user-story,phase-1,devops,sprint-1" "Sprint 1 (Weeks 1-2)" "$(cat <<'B'
**As a** developer
**I want** a Turborepo monorepo with shared configs, linting, and type checking
**So that** the team has a consistent, fast development environment from the start

**Story Points:** 5 | **Epic:** #1

## Acceptance Tests
- [ ] `turbo build` compiles all packages without errors
- [ ] `turbo lint` runs ESLint across all packages
- [ ] `turbo test` runs Vitest across all packages
- [ ] Shared `tsconfig.base.json` is inherited by all packages
- [ ] Package aliases resolve correctly (`@uniapp/shared`, `@uniapp/db`, etc.)
- [ ] Hot reload works in `apps/api` and `apps/web` simultaneously
B
)"

s "US-1.2: CI/CD Pipeline" "user-story,phase-1,devops,sprint-1" "Sprint 1 (Weeks 1-2)" "$(cat <<'B'
**As a** developer
**I want** automated lint, test, build, and deploy on every push
**So that** broken code never reaches staging or production

**Story Points:** 5 | **Epic:** #1

## Acceptance Tests
- [ ] GitHub Actions runs on every PR: lint → type-check → unit tests → build
- [ ] PRs cannot merge without passing checks
- [ ] Merge to `main` auto-deploys to staging
- [ ] Production deploy requires manual approval gate
- [ ] Build artifacts are cached between runs (Turborepo remote cache)
- [ ] Pipeline completes in under 5 minutes for incremental changes
B
)"

s "US-1.3: Infrastructure as Code" "user-story,phase-1,devops,sprint-1" "Sprint 1 (Weeks 1-2)" "$(cat <<'B'
**As a** DevOps engineer
**I want** Terraform modules for all cloud resources
**So that** infrastructure is reproducible and version-controlled

**Story Points:** 8 | **Epic:** #1

## Acceptance Tests
- [ ] `terraform plan` shows clean diff for fresh environment
- [ ] `terraform apply` provisions: PostgreSQL (RDS/Cloud SQL), Redis, S3 bucket, Kubernetes cluster
- [ ] Separate tfvars for dev, staging, prod
- [ ] Secrets stored in AWS Secrets Manager / Vault, never in tfvars
- [ ] State file stored remotely (S3 + DynamoDB lock)
- [ ] Teardown with `terraform destroy` cleans up all resources
B
)"

s "US-1.4: Database Setup & Migrations" "user-story,phase-1,backend,sprint-1" "Sprint 1 (Weeks 1-2)" "$(cat <<'B'
**As a** backend engineer
**I want** PostgreSQL with pgvector and PostGIS extensions, with a migration framework
**So that** schema changes are tracked and deployable

**Story Points:** 5 | **Epic:** #1

## Acceptance Tests
- [ ] Migration CLI creates, runs, and rolls back migrations
- [ ] Core tables created: `users`, `organizations`, `cities`, `events`, `venues`, `bookings`, `agent_memory`, `audit_log`
- [ ] pgvector extension enabled; vector index created on `agent_memory.embedding`
- [ ] PostGIS extension enabled; spatial index on `events.location` and `venues.location`
- [ ] Row-level security policies enforce `city_id` tenant isolation
- [ ] Seed script populates dev data (3 cities, sample venues/vendors)
B
)"

s "US-1.5: Dockerized Dev Environment" "user-story,phase-1,devops,sprint-1" "Sprint 1 (Weeks 1-2)" "$(cat <<'B'
**As a** developer
**I want** `docker compose up` to spin up all dependencies locally
**So that** I can develop without external service accounts

**Story Points:** 3 | **Epic:** #1

## Acceptance Tests
- [ ] `docker compose up` starts PostgreSQL, Redis, NATS, OpenSearch
- [ ] Health checks pass for all containers within 30 seconds
- [ ] Volumes persist data between restarts
- [ ] `.env.example` documents all required environment variables
- [ ] API server connects to all local services on startup
B
)"

s "US-1.6: Kubernetes Manifests & Helm Charts" "user-story,phase-1,devops,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As a** DevOps engineer
**I want** k8s deployment manifests for all services
**So that** services can be deployed and scaled in staging/prod

**Story Points:** 5 | **Epic:** #1

## Acceptance Tests
- [ ] Helm chart deploys api-gateway, event-service, agent-service
- [ ] HPA configured for agent-service (scale on CPU 70%)
- [ ] Readiness and liveness probes defined for all deployments
- [ ] ConfigMaps and Secrets injected from Vault/Secrets Manager
- [ ] Staging deployment succeeds from CI/CD pipeline
B
)"

s "US-1.7: Observability Foundation" "user-story,phase-1,devops,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As a** DevOps engineer
**I want** structured logging, metrics, and tracing from day one
**So that** we can debug issues before they become incidents

**Story Points:** 3 | **Epic:** #1

## Acceptance Tests
- [ ] All services emit structured JSON logs with `requestId`, `service`, `level`
- [ ] Prometheus metrics endpoint exposed (`/metrics`) on all services
- [ ] OpenTelemetry traces propagate across HTTP calls (W3C Trace Context)
- [ ] Grafana dashboard shows basic service health (request rate, error rate, latency)
- [ ] Sentry captures unhandled exceptions with source maps
B
)"

# ── Epic 2: Auth & Users ──

s "US-2.1: Auth Provider Integration" "user-story,phase-1,backend,sprint-1" "Sprint 1 (Weeks 1-2)" "$(cat <<'B'
**As a** user
**I want** to sign up and log in with email/password or social login
**So that** I can access the platform securely

**Story Points:** 5 | **Epic:** #2

## Acceptance Tests
- [ ] User can register with email + password
- [ ] User can log in with Google OAuth
- [ ] JWT issued on login with `userId`, `roles`, `cityId` claims
- [ ] Tokens expire after 1 hour; refresh tokens last 30 days
- [ ] Password reset flow sends email and allows secure reset
- [ ] Rate limiting on login attempts (5 per minute per IP)
B
)"

s "US-2.2: User Profile Service" "user-story,phase-1,backend,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As a** user
**I want** to create and manage my profile with role selection
**So that** the platform knows my capabilities and preferences

**Story Points:** 5 | **Epic:** #2

## Acceptance Tests
- [ ] `POST /v1/users/profile` creates profile with name, phone, role
- [ ] `GET /v1/users/me` returns current user profile
- [ ] `PATCH /v1/users/me` updates profile fields
- [ ] Users can select multiple roles (organizer + attendee, vendor + volunteer)
- [ ] Profile photo upload to S3 with URL returned
- [ ] Email verification required before full platform access
B
)"

s "US-2.3: Organization Management" "user-story,phase-1,backend,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As a** venue owner or vendor company
**I want** to register my organization on the platform
**So that** I can offer services and receive bookings

**Story Points:** 5 | **Epic:** #2

## Acceptance Tests
- [ ] `POST /v1/organizations` creates org with type, name, city
- [ ] Organization slug is auto-generated and unique
- [ ] Owner can invite team members via email
- [ ] Team members inherit org role permissions
- [ ] `GET /v1/organizations/:id` returns org profile with trust score
- [ ] Organization verification flow (manual review → `verified_at` set)
B
)"

s "US-2.4: RBAC Middleware" "user-story,phase-1,backend,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As a** backend engineer
**I want** role-based access control enforced on every API endpoint
**So that** users can only access resources they're authorized for

**Story Points:** 5 | **Epic:** #2

## Acceptance Tests
- [ ] Middleware extracts JWT, validates signature, and attaches user context
- [ ] Unauthenticated requests to protected endpoints return 401
- [ ] Requests with insufficient role return 403 with descriptive error
- [ ] `platform_admin` role can access all endpoints
- [ ] `organizer` can only manage their own events
- [ ] `venue_manager` can only manage their own venues
- [ ] Role checks are unit-tested for all permission combinations
B
)"

s "US-2.5: API Gateway Setup" "user-story,phase-1,backend,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As a** backend engineer
**I want** an API gateway handling routing, rate limiting, and CORS
**So that** all client requests are properly validated and routed

**Story Points:** 5 | **Epic:** #2

## Acceptance Tests
- [ ] All `/v1/*` routes forwarded to correct service
- [ ] Rate limiting: 100 req/min per user, 1000 req/min per IP
- [ ] CORS configured for web app and mobile origins
- [ ] Request/response logging with trace IDs
- [ ] Health endpoint `GET /health` returns 200 without auth
- [ ] API versioning via URL prefix (`/v1/`)
B
)"

s "US-2.6: Multi-Tenant City Configuration" "user-story,phase-1,backend,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As a** platform admin
**I want** to onboard new cities with their specific configurations
**So that** the platform operates correctly per jurisdiction

**Story Points:** 4 | **Epic:** #2

## Acceptance Tests
- [ ] `cities` table stores timezone, coordinates, permit rules, regulatory config
- [ ] All queries filter by `city_id` from user context
- [ ] RLS policies prevent cross-city data access
- [ ] Seed data includes Austin, TX as launch city
- [ ] City admin role can view all events/venues/vendors in their city
- [ ] City config includes: default permit types, noise ordinance hours, capacity rules
B
)"

# ── Epic 3: Event Service & NLP ──

s "US-3.1: Event CRUD API" "user-story,phase-1,backend,ai-agents,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As an** organizer
**I want** to create, read, update, and delete events
**So that** I can manage my events on the platform

**Story Points:** 5 | **Epic:** #3

## Acceptance Tests
- [ ] `POST /v1/events` creates event with status `draft`
- [ ] `GET /v1/events/:id` returns full event with EDL and plan
- [ ] `PATCH /v1/events/:id` updates mutable fields
- [ ] `DELETE /v1/events/:id` soft-deletes (sets `status = cancelled`)
- [ ] `GET /v1/events` lists events with pagination, filtering by `status`, `type`, `city`
- [ ] Only the event organizer or city admin can modify/delete
- [ ] Event state machine: `draft → planning → negotiating → confirmed → live → completed → settled`
B
)"

s "US-3.2: Natural Language Intent Parsing" "user-story,phase-1,ai-agents,sprint-3" "Sprint 3 (Weeks 5-6)" "$(cat <<'B'
**As an** organizer
**I want** to describe my event in plain English and get a structured plan
**So that** I don't need to fill out complex forms

**Story Points:** 8 | **Epic:** #3

## Acceptance Tests
- [ ] `POST /v1/events` with `input_type: "natural_language"` sends input to Claude Opus 4.6
- [ ] Claude returns valid EDL (validated against Zod schema)
- [ ] System prompt includes city-specific context (permit rules, venue types, local regulations)
- [ ] Prompt caching applied to system prompt
- [ ] Response within 5 seconds (p95)
- [ ] Handles ambiguous input gracefully with clarification notes
- [ ] Structured output guarantees valid JSON (no parsing failures)
- [ ] Refusal handled — returns 422 with explanation if Claude refuses
B
)"

s "US-3.3: EDL Schema & Validation" "user-story,phase-1,ai-agents,sprint-2" "Sprint 2 (Weeks 3-4)" "$(cat <<'B'
**As a** backend engineer
**I want** a strongly-typed Event Description Language with validation
**So that** all downstream services consume consistent structured data

**Story Points:** 5 | **Epic:** #3

## Acceptance Tests
- [ ] `@uniapp/edl` package exports TypeScript types and Zod schemas
- [ ] All EDL fields have documented constraints
- [ ] Invalid EDL payloads rejected with field-level error messages
- [ ] EDL supports partial updates (PATCH semantics)
- [ ] EDL versioning field (`edl_version: "1.0"`)
- [ ] 100% test coverage on validation logic
B
)"

s "US-3.4: Event State Machine" "user-story,phase-1,backend,sprint-3" "Sprint 3 (Weeks 5-6)" "$(cat <<'B'
**As an** organizer
**I want** clear event states with valid transitions
**So that** I always know where my event stands

**Story Points:** 5 | **Epic:** #3

## Acceptance Tests
- [ ] State transitions enforced: `draft → planning`, `planning → negotiating`, etc.
- [ ] Invalid transitions return 409 Conflict with allowed transitions
- [ ] State change emits NATS event (`event.state_changed`)
- [ ] State change recorded in event history (JSONB append)
- [ ] `confirmed → live` requires all bookings confirmed + permits approved
- [ ] `live → completed` auto-triggers post-event settlement workflow
B
)"

s "US-3.5: Event Search & Discovery" "user-story,phase-1,backend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As an** attendee
**I want** to search for events by location, date, type, and keyword
**So that** I can find interesting things happening in my city

**Story Points:** 8 | **Epic:** #3

## Acceptance Tests
- [ ] OpenSearch index synced from PostgreSQL via NATS events
- [ ] `GET /v1/events/search?q=music&city=austin&date=2026-04` returns ranked results
- [ ] Geo-filtering: `?lat=30.27&lng=-97.74&radius=5km`
- [ ] Faceted search with counts by type, date range, price range
- [ ] Results sorted by relevance
- [ ] Search returns within 200ms (p95)
- [ ] Autocomplete endpoint: `GET /v1/events/suggest?q=str`
B
)"

s "US-3.6: Event Timeline & Activity Feed" "user-story,phase-1,backend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As an** organizer
**I want** a timeline showing every action taken on my event
**So that** I can track progress and understand what agents are doing

**Story Points:** 5 | **Epic:** #3

## Acceptance Tests
- [ ] `GET /v1/events/:id/timeline` returns chronological list of activities
- [ ] Timeline includes: state changes, agent actions, booking updates, permit status, human approvals
- [ ] Each entry has: timestamp, actor, action type, description, metadata
- [ ] Real-time updates via WebSocket subscription
- [ ] Filterable by activity type
- [ ] Pagination with cursor (latest first)
B
)"

s "US-3.7: Event Dashboard API" "user-story,phase-1,backend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As an** organizer
**I want** a summary dashboard for each event
**So that** I can see status at a glance

**Story Points:** 3 | **Epic:** #3

## Acceptance Tests
- [ ] `GET /v1/events/:id/dashboard` returns aggregated status
- [ ] Response includes: booking status, permit status, budget, staffing fill rate
- [ ] Calculated fields cached in Redis (30s TTL)
- [ ] Warnings array highlights: missing permits, unfilled roles, budget overruns
- [ ] Next actions array suggests what the organizer should do
B
)"

s "US-3.8: Bulk Event Import" "user-story,phase-1,backend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As an** organizer
**I want** to import events from a CSV or JSON file
**So that** I can onboard my existing event calendar

**Story Points:** 3 | **Epic:** #3

## Acceptance Tests
- [ ] `POST /v1/events/import` accepts CSV or JSON upload
- [ ] Each row validated against EDL schema
- [ ] Invalid rows collected in error report (not fail-all)
- [ ] Successfully imported events created in `draft` status
- [ ] Import job is async — returns job ID, pollable
- [ ] Max 500 events per import
B
)"

# ── Epic 4: Venue Service ──

s "US-4.1: Venue CRUD" "user-story,phase-1,backend,sprint-3" "Sprint 3 (Weeks 5-6)" "$(cat <<'B'
**As a** venue manager
**I want** to register and manage my venue on the platform
**So that** organizers can discover and book my space

**Story Points:** 5 | **Epic:** #4

## Acceptance Tests
- [ ] `POST /v1/venues` creates venue linked to organization
- [ ] Required fields: name, address, location (lat/lng), capacity, venue_type
- [ ] `PATCH /v1/venues/:id` updates venue details
- [ ] Image upload (up to 10 images, max 5MB each) stored in S3
- [ ] `GET /v1/venues/:id` returns full venue profile
- [ ] Only venue org members can edit; anyone can read
B
)"

s "US-4.2: Venue Availability Calendar" "user-story,phase-1,backend,sprint-3" "Sprint 3 (Weeks 5-6)" "$(cat <<'B'
**As a** venue manager
**I want** to manage my venue's availability calendar
**So that** only open dates are bookable

**Story Points:** 5 | **Epic:** #4

## Acceptance Tests
- [ ] `POST /v1/venues/:id/availability` sets available time blocks
- [ ] `GET /v1/venues/:id/availability?start=...&end=...` returns available slots
- [ ] Blocked dates/times can be set
- [ ] Confirmed bookings automatically block the calendar
- [ ] Overlapping availability blocks are merged
- [ ] Calendar data cached in Redis with invalidation on booking changes
B
)"

s "US-4.3: Venue Search with Geo & Filters" "user-story,phase-1,backend,sprint-3" "Sprint 3 (Weeks 5-6)" "$(cat <<'B'
**As an** organizer
**I want** to search venues by location, capacity, type, and amenities
**So that** I can find the right space for my event

**Story Points:** 5 | **Epic:** #4

## Acceptance Tests
- [ ] `GET /v1/venues/search?lat=...&lng=...&radius=10km&capacity_min=500&type=outdoor`
- [ ] Results include distance from search point
- [ ] Filter by amenities, availability date range
- [ ] Results sorted by relevance (distance + rating + availability match)
- [ ] Returns within 200ms (p95)
B
)"

s "US-4.4: Venue Pricing & Rate Card" "user-story,phase-1,backend,sprint-3" "Sprint 3 (Weeks 5-6)" "$(cat <<'B'
**As a** venue manager
**I want** to set pricing by event type, day of week, and season
**So that** my pricing is transparent and automated

**Story Points:** 5 | **Epic:** #4

## Acceptance Tests
- [ ] Pricing stored as JSONB rate card
- [ ] `GET /v1/venues/:id/pricing?event_type=market&date=...` returns calculated price
- [ ] Dynamic pricing flag allows AI agent to negotiate within a range
- [ ] Minimum and maximum price bounds enforced
- [ ] Pricing history tracked for analytics
B
)"

s "US-4.5: Venue Booking Flow" "user-story,phase-1,backend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As an** organizer
**I want** to request a venue booking with automatic conflict detection
**So that** double-bookings never happen

**Story Points:** 8 | **Epic:** #4

## Acceptance Tests
- [ ] `POST /v1/bookings` creates booking request
- [ ] Distributed lock (Redis) prevents race conditions
- [ ] Booking status flow: `pending → approved → confirmed → completed`
- [ ] Venue manager receives notification on new booking request
- [ ] Venue manager can approve/reject via `POST /v1/bookings/:id/respond`
- [ ] Confirmed booking blocks venue calendar
- [ ] Cancellation within 48 hours of event requires penalty fee
- [ ] Booking creates entry in `audit_log`
B
)"

s "US-4.6: Venue Reviews & Ratings" "user-story,phase-1,backend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As an** organizer
**I want** to leave reviews for venues after my event
**So that** future organizers can make informed decisions

**Story Points:** 3 | **Epic:** #4

## Acceptance Tests
- [ ] `POST /v1/venues/:id/reviews` accepts rating (1-5) and text review
- [ ] Only organizers with completed bookings can leave reviews
- [ ] One review per booking
- [ ] `GET /v1/venues/:id/reviews` returns paginated reviews
- [ ] Average rating calculated and cached on venue record
- [ ] Reviews feed into reputation/trust score
B
)"

# ── Epic 5: Web App MVP ──

s "US-5.1: App Shell & Navigation" "user-story,phase-1,frontend,sprint-1" "Sprint 1 (Weeks 1-2)" "$(cat <<'B'
**As a** user
**I want** a responsive web app with clear navigation
**So that** I can access all platform features

**Story Points:** 5 | **Epic:** #5

## Acceptance Tests
- [ ] Next.js app with App Router, Tailwind CSS, Radix UI
- [ ] Responsive layout (mobile, tablet, desktop)
- [ ] Navigation: Dashboard, Events, Venues, Profile, Settings
- [ ] Role-based nav items
- [ ] Loading states and error boundaries on all pages
- [ ] Lighthouse score > 90
B
)"

s "US-5.2: Auth Pages" "user-story,phase-1,frontend,sprint-1" "Sprint 1 (Weeks 1-2)" "$(cat <<'B'
**As a** user
**I want** login, signup, and password reset pages
**So that** I can access my account

**Story Points:** 3 | **Epic:** #5

## Acceptance Tests
- [ ] Login page with email/password and Google OAuth button
- [ ] Signup page with role selection
- [ ] Password reset flow
- [ ] Auth state persisted in httpOnly cookies
- [ ] Redirect to dashboard after login
- [ ] Protected routes redirect to login if unauthenticated
B
)"

s "US-5.3: Event Creation Flow" "user-story,phase-1,frontend,sprint-3" "Sprint 3 (Weeks 5-6)" "$(cat <<'B'
**As an** organizer
**I want** a guided event creation experience with natural language input
**So that** I can go from idea to structured plan in minutes

**Story Points:** 8 | **Epic:** #5

## Acceptance Tests
- [ ] Step 1: Free-text input with example prompts
- [ ] Step 2: AI-generated EDL displayed as editable structured form
- [ ] User can modify any EDL field before confirming
- [ ] Step 3: Review summary with estimated costs and timeline
- [ ] Step 4: Submit creates event and starts agent planning
- [ ] Loading state while Claude processes
- [ ] Error states for invalid input, API failures, refusals
- [ ] Mobile-friendly form layout
B
)"

s "US-5.4: Event Dashboard Page" "user-story,phase-1,frontend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As an** organizer
**I want** a dashboard showing my event's status, timeline, and key metrics
**So that** I can monitor progress at a glance

**Story Points:** 5 | **Epic:** #5

## Acceptance Tests
- [ ] Status card: current state, next required action
- [ ] Timeline: scrollable activity feed
- [ ] Metrics: budget, staffing, bookings
- [ ] Warnings panel
- [ ] Approve/reject buttons for pending checkpoints
- [ ] Auto-refresh via polling or WebSocket
B
)"

s "US-5.5: Venue Browser" "user-story,phase-1,frontend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As an** organizer or attendee
**I want** to browse venues on a map with filters
**So that** I can discover available spaces

**Story Points:** 5 | **Epic:** #5

## Acceptance Tests
- [ ] Map view (Mapbox) with venue pins
- [ ] List view with venue cards
- [ ] Filter sidebar: capacity, type, amenities, date range, price range
- [ ] Click venue → venue detail page
- [ ] Venue detail: photos, description, availability calendar, pricing, reviews
- [ ] "Request Booking" button (organizers only)
B
)"

s "US-5.6: User Profile & Settings" "user-story,phase-1,frontend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As a** user
**I want** to manage my profile, organization, and notification preferences
**So that** the platform is personalized to me

**Story Points:** 3 | **Epic:** #5

## Acceptance Tests
- [ ] Profile page: edit name, phone, photo, bio
- [ ] Organization page: view/edit org details
- [ ] Notification preferences: toggle channels per category
- [ ] Connected accounts (Google)
- [ ] Delete account flow with confirmation
B
)"

s "US-5.7: Event List & My Events" "user-story,phase-1,frontend,sprint-4" "Sprint 4 (Weeks 7-8)" "$(cat <<'B'
**As a** user
**I want** to see public events and my own events in separate views
**So that** I can discover events and manage my own

**Story Points:** 5 | **Epic:** #5

## Acceptance Tests
- [ ] "Discover" page: public events with search, filters, pagination
- [ ] "My Events" page: events I organize, with status badges
- [ ] Status filters: all, draft, planning, confirmed, live, completed
- [ ] Quick actions: edit, cancel, view dashboard
- [ ] Empty states with CTAs
- [ ] Sort by date, status, or creation time
B
)"

echo "=== Phase 2 Stories ==="

# ── Epic 6: Agent Runtime ──

s "US-6.1: Agent Runtime Service" "user-story,phase-2,ai-agents,sprint-5" "Sprint 5 (Weeks 9-10)" "$(cat <<'B'
**As the** platform
**I want** a service that spawns, manages, and monitors AI agents
**So that** agents can autonomously coordinate event logistics

**Story Points:** 13 | **Epic:** #6

## Acceptance Tests
- [ ] Agent service initializes Claude Agent SDK with per-entity configuration
- [ ] Agents spawned with entity-specific system prompts, tools, and guardrails
- [ ] Agent execution tracked: start time, turns used, tokens consumed, cost
- [ ] Agent budget enforcement: `maxBudgetUsd` kills agent if exceeded
- [ ] Agent turn limit: `maxTurns` prevents runaway execution
- [ ] Agent state persisted between sessions (memory in pgvector)
- [ ] Agent crashes logged to Sentry with full context
- [ ] Concurrent agent limit per event (max 10 active agents)
B
)"

s "US-6.2: Agent Tool Framework (MCP)" "user-story,phase-2,ai-agents,sprint-5" "Sprint 5 (Weeks 9-10)" "$(cat <<'B'
**As an** AI engineer
**I want** entity-specific tools exposed via MCP servers
**So that** agents can interact with platform services safely

**Story Points:** 8 | **Epic:** #6

## Acceptance Tests
- [ ] MCP server per domain: venues, vendors, bookings, permits, messaging
- [ ] Each tool has: name, description, Zod input schema, handler function
- [ ] Tools call service layer (not database directly)
- [ ] Tool execution logged to `audit_log`
- [ ] Tool errors return structured error messages
- [ ] Tools are unit-tested with mock service layer
B
)"

s "US-6.3: Orchestrator Agent" "user-story,phase-2,ai-agents,sprint-6" "Sprint 6 (Weeks 11-12)" "$(cat <<'B'
**As the** platform
**I want** a master orchestrator agent that decomposes event plans and delegates to specialist agents
**So that** complex events are planned through coordinated multi-agent collaboration

**Story Points:** 8 | **Epic:** #6

## Acceptance Tests
- [ ] Orchestrator receives EDL and creates a planning task list
- [ ] Spawns subagents: venue-scout, vendor-coordinator, volunteer-coordinator, permit-processor
- [ ] Subagents execute in parallel where independent
- [ ] Orchestrator aggregates results into unified event plan
- [ ] Orchestrator detects conflicts and triggers constraint solver
- [ ] Creates approval checkpoints at configured gates
- [ ] Full orchestration completes within 3 minutes for standard event (p90)
B
)"

s "US-6.4: Approval Gate System" "user-story,phase-2,ai-agents,sprint-6" "Sprint 6 (Weeks 11-12)" "$(cat <<'B'
**As an** organizer
**I want** to review and approve key decisions before agents commit
**So that** I maintain control over my event planning

**Story Points:** 5 | **Epic:** #6

## Acceptance Tests
- [ ] Approval gates configurable per event
- [ ] Agent pauses execution when gate is reached
- [ ] `POST /v1/events/:id/approve` resumes agent execution
- [ ] Organizer can modify plan before approving
- [ ] Rejection triggers re-planning with organizer's feedback
- [ ] Timeout: 24h reminder, 48h escalation
- [ ] Notification sent on every approval request
B
)"

s "US-6.5: Agent Memory & Context" "user-story,phase-2,ai-agents,sprint-7" "Sprint 7 (Weeks 13-14)" "$(cat <<'B'
**As an** AI engineer
**I want** agents to remember past interactions, preferences, and outcomes per entity
**So that** agents improve over time and maintain context

**Story Points:** 8 | **Epic:** #6

## Acceptance Tests
- [ ] Agent memory stored in `agent_memory` table with vector embeddings
- [ ] Memory retrieved via semantic search (pgvector cosine similarity)
- [ ] Venue agent remembers past bookings, preferred event types, pricing history
- [ ] Vendor agent remembers past deliveries, reliability score
- [ ] Memory injected into agent system prompt as relevant context
- [ ] Memory pruning after 6 months
- [ ] Memory never leaks between entities (strict isolation)
B
)"

s "US-6.6: Agent Audit & Observability" "user-story,phase-2,ai-agents,devops,sprint-7" "Sprint 7 (Weeks 13-14)" "$(cat <<'B'
**As a** platform operator
**I want** full observability into what every agent is doing
**So that** I can debug issues, monitor costs, and ensure safety

**Story Points:** 8 | **Epic:** #6

## Acceptance Tests
- [ ] Every agent action logged: tool calls, thinking summaries, decisions, errors
- [ ] `GET /v1/events/:id/agents` returns all agents and their status
- [ ] `GET /v1/agents/:id/actions` returns paginated action history
- [ ] Real-time agent activity stream via WebSocket
- [ ] Metrics: `agent_actions_total`, `agent_cost_usd`, `agent_latency_seconds`
- [ ] Alert: agent failure rate > 5% triggers PagerDuty
- [ ] Cost dashboard: per-event and per-agent-type AI spend
B
)"

# ── Epic 7: Negotiation ──

s "US-7.1: Negotiation Engine" "user-story,phase-2,ai-agents,backend,sprint-6" "Sprint 6 (Weeks 11-12)" "$(cat <<'B'
**As the** platform
**I want** a structured negotiation protocol between agents
**So that** bookings and contracts are reached through fair, transparent negotiation

**Story Points:** 8 | **Epic:** #7

## Acceptance Tests
- [ ] `negotiations` table tracks all active and resolved negotiations
- [ ] Negotiation flow: propose → counter/accept/reject → resolve → commit
- [ ] Each round stored as a `NegotiationMessage` in JSONB
- [ ] Maximum 10 rounds before auto-escalation to human
- [ ] Negotiation timeout: 4h per round, 24h total
- [ ] NATS events emitted on each round
- [ ] Both parties can view full negotiation history
B
)"

s "US-7.2: Constraint Solver" "user-story,phase-2,ai-agents,sprint-7" "Sprint 7 (Weeks 13-14)" "$(cat <<'B'
**As the** platform
**I want** automated conflict resolution between competing agent proposals
**So that** events don't deadlock on unresolvable constraints

**Story Points:** 8 | **Epic:** #7

## Acceptance Tests
- [ ] Hard constraints never violated
- [ ] Soft constraints relaxed in priority order
- [ ] Uses Claude (high effort) to propose creative alternatives
- [ ] Solver outputs: resolution + rationale + trade-offs
- [ ] If no resolution, escalation to organizer with options
- [ ] Solver completes within 30 seconds (p95)
- [ ] Unit tests cover: date conflict, budget overflow, capacity exceeded, vendor unavailable
B
)"

s "US-7.3: Venue Agent" "user-story,phase-2,ai-agents,sprint-6" "Sprint 6 (Weeks 11-12)" "$(cat <<'B'
**As a** venue
**I want** an AI agent that manages my bookings, pricing, and calendar
**So that** I receive relevant booking requests and respond intelligently

**Story Points:** 5 | **Epic:** #7

## Acceptance Tests
- [ ] Venue agent checks availability before responding to proposals
- [ ] Agent applies pricing rules (rate card, dynamic pricing range)
- [ ] Agent can counter-propose alternative dates
- [ ] Agent respects venue rules (noise ordinances, max hours)
- [ ] Agent learns from past bookings
- [ ] Venue manager can override any agent decision
B
)"

s "US-7.4: Vendor Agent" "user-story,phase-2,ai-agents,sprint-6" "Sprint 6 (Weeks 11-12)" "$(cat <<'B'
**As a** vendor
**I want** an AI agent that finds relevant events, submits bids, and manages contracts
**So that** I get business without manual prospecting

**Story Points:** 5 | **Epic:** #7

## Acceptance Tests
- [ ] Vendor agent monitors new events matching vendor category
- [ ] Agent auto-generates bids within configured price range
- [ ] Agent manages inventory constraints
- [ ] Agent negotiates terms (quantity, delivery time, payment)
- [ ] Agent handles contract acceptance/rejection
- [ ] Vendor can set auto-accept rules
B
)"

s "US-7.5: Volunteer Agent" "user-story,phase-2,ai-agents,sprint-7" "Sprint 7 (Weeks 13-14)" "$(cat <<'B'
**As a** volunteer
**I want** an AI agent that matches me with relevant volunteer opportunities
**So that** I can contribute to events matching my skills and availability

**Story Points:** 5 | **Epic:** #7

## Acceptance Tests
- [ ] Agent matches skills to event staffing requirements
- [ ] Agent checks volunteer availability calendar
- [ ] Agent handles shift scheduling
- [ ] Agent sends confirmation with event details
- [ ] Agent tracks verified hours
- [ ] Volunteer can set preferences: max distance, event types, time of day
B
)"

s "US-7.6: Negotiation Dashboard UI" "user-story,phase-2,frontend,sprint-8" "Sprint 8 (Weeks 15-16)" "$(cat <<'B'
**As an** organizer
**I want** to see all active negotiations for my event
**So that** I can monitor agent progress and intervene if needed

**Story Points:** 3 | **Epic:** #7

## Acceptance Tests
- [ ] Negotiations page shows all active/completed negotiations per event
- [ ] Each negotiation shows: parties, current round, status, proposed terms
- [ ] Chat-style view of negotiation history
- [ ] "Override" button lets organizer manually set terms
- [ ] Real-time updates via WebSocket
- [ ] Visual indicators: green (agreed), yellow (negotiating), red (stalled)
B
)"

# ── Epic 8: Vendor & Volunteer Services ──

s "US-8.1: Vendor CRUD & Profile" "user-story,phase-2,backend,sprint-5" "Sprint 5 (Weeks 9-10)" "$(cat <<'B'
**As a** vendor
**I want** to register my business with services, pricing, and portfolio
**So that** event organizers can find and hire me

**Story Points:** 5 | **Epic:** #8

## Acceptance Tests
- [ ] `POST /v1/vendors` creates vendor profile linked to organization
- [ ] Fields: categories, service area, pricing range, capacity
- [ ] Portfolio: photos, past events, certifications
- [ ] `GET /v1/vendors/search` with filters
- [ ] Vendor dashboard: incoming bids, active contracts, earnings
B
)"

s "US-8.2: Vendor Bid Management" "user-story,phase-2,backend,sprint-6" "Sprint 6 (Weeks 11-12)" "$(cat <<'B'
**As a** vendor
**I want** to view, accept, reject, and counter booking requests
**So that** I can manage my business pipeline

**Story Points:** 5 | **Epic:** #8

## Acceptance Tests
- [ ] `GET /v1/vendors/:id/bids` returns all bid requests
- [ ] `POST /v1/bids/:id/respond` with accept/reject/counter
- [ ] Counter-proposal includes modified terms
- [ ] Accepted bids create confirmed bookings
- [ ] Notification on new bid
- [ ] Bid expiration: auto-decline after 48 hours
B
)"

s "US-8.3: Volunteer Registration & Skills" "user-story,phase-2,backend,sprint-5" "Sprint 5 (Weeks 9-10)" "$(cat <<'B'
**As a** volunteer
**I want** to register with my skills, availability, and preferences
**So that** I'm matched with relevant opportunities

**Story Points:** 3 | **Epic:** #8

## Acceptance Tests
- [ ] `POST /v1/volunteers` creates volunteer profile
- [ ] Skills taxonomy: first aid, setup/teardown, registration desk, traffic control, etc.
- [ ] Availability calendar: recurring weekly + specific date blocks
- [ ] Preferences: max distance, event types, notification frequency
- [ ] Verified skills with document upload
B
)"

s "US-8.4: Volunteer Shift Management" "user-story,phase-2,backend,sprint-6" "Sprint 6 (Weeks 11-12)" "$(cat <<'B'
**As a** volunteer
**I want** to browse, sign up for, and check in to volunteer shifts
**So that** I can contribute to events in my community

**Story Points:** 5 | **Epic:** #8

## Acceptance Tests
- [ ] `GET /v1/shifts` returns available shifts with filters
- [ ] `POST /v1/shifts/:id/signup` registers volunteer
- [ ] `POST /v1/shifts/:id/checkin` records check-in
- [ ] `POST /v1/shifts/:id/checkout` records checkout with hours
- [ ] Waitlist if shift full; auto-promote on cancellation
- [ ] Shift reminder notifications
- [ ] Verified hours added to volunteer record
B
)"

s "US-8.5: Notification Service" "user-story,phase-2,backend,sprint-5" "Sprint 5 (Weeks 9-10)" "$(cat <<'B'
**As a** user
**I want** to receive notifications about bookings, shifts, approvals, and updates
**So that** I stay informed without constantly checking the app

**Story Points:** 5 | **Epic:** #8

## Acceptance Tests
- [ ] Channels: email (SendGrid), push (FCM/APNS), SMS (Twilio), in-app
- [ ] Template system with per-notification-type templates
- [ ] User preferences control which channels are active per category
- [ ] `GET /v1/notifications` returns in-app notifications with read/unread
- [ ] `PATCH /v1/notifications/:id/read` marks as read
- [ ] Batching: group notifications within 5-minute window
- [ ] Notification logged with delivery status
B
)"

s "US-8.6: Vendor & Volunteer Search UI" "user-story,phase-2,frontend,sprint-7" "Sprint 7 (Weeks 13-14)" "$(cat <<'B'
**As an** organizer
**I want** to browse vendors and volunteers from the web app
**So that** I can manually select providers if I want to override agent selections

**Story Points:** 3 | **Epic:** #8

## Acceptance Tests
- [ ] Vendor directory with filters, search, and profile cards
- [ ] Volunteer pool browser (visible only to organizers with active events)
- [ ] "Invite to Event" action
- [ ] Compare view for side-by-side vendor comparison
B
)"

# ── Epic 9: Real-Time ──

s "US-9.1: WebSocket Service" "user-story,phase-2,backend,sprint-5" "Sprint 5 (Weeks 9-10)" "$(cat <<'B'
**As a** developer
**I want** a scalable WebSocket service for real-time updates
**So that** dashboards and notifications update instantly

**Story Points:** 5 | **Epic:** #9

## Acceptance Tests
- [ ] Socket.io server with namespace per feature
- [ ] Auth via JWT in connection handshake
- [ ] Horizontal scaling via Redis adapter
- [ ] Heartbeat every 30 seconds; auto-reconnect on client
- [ ] Max 10,000 concurrent connections per pod
B
)"

s "US-9.2: Event Live Dashboard" "user-story,phase-2,frontend,sprint-7" "Sprint 7 (Weeks 13-14)" "$(cat <<'B'
**As an** organizer
**I want** a real-time dashboard during my live event
**So that** I can monitor attendance, staffing, and incidents

**Story Points:** 8 | **Epic:** #9

## Acceptance Tests
- [ ] Live attendance counter
- [ ] Staffing board: who's checked in, who's missing
- [ ] Incident feed
- [ ] Agent activity stream
- [ ] Weather widget
- [ ] Quick actions: send announcement, request backup staff, report incident
- [ ] Dashboard works on mobile browser
B
)"

s "US-9.3: Real-Time Notifications" "user-story,phase-2,frontend,sprint-8" "Sprint 8 (Weeks 15-16)" "$(cat <<'B'
**As a** user
**I want** in-app notifications to appear instantly without page refresh
**So that** I can respond to approvals and updates quickly

**Story Points:** 5 | **Epic:** #9

## Acceptance Tests
- [ ] Notification badge updates in real time
- [ ] Notification dropdown with mark-all-read
- [ ] Click notification navigates to relevant page
- [ ] Toast for high-priority items
- [ ] Notifications persist if offline; delivered on reconnect
B
)"

echo "=== Phase 3 Stories ==="

# ── Epic 10: Permits ──

s "US-10.1: Permit Requirement Detection" "user-story,phase-3,ai-agents,sprint-9" "Sprint 9 (Weeks 17-18)" "$(cat <<'B'
**As the** platform
**I want** to automatically determine required permits based on event type, size, and location
**So that** organizers never miss a required permit

**Story Points:** 5 | **Epic:** #10

## Acceptance Tests
- [ ] Permit rules configured per city (JSONB in `cities` table)
- [ ] Rules engine evaluates EDL against city rules
- [ ] `GET /v1/events/:id/permits/required` returns list with deadlines
- [ ] Claude assists with ambiguous cases
- [ ] Rules updated without code deploy
B
)"

s "US-10.2: Permit Application Generator" "user-story,phase-3,ai-agents,sprint-9" "Sprint 9 (Weeks 17-18)" "$(cat <<'B'
**As an** organizer
**I want** permit applications auto-generated from my event details
**So that** I don't have to fill out government forms manually

**Story Points:** 8 | **Epic:** #10

## Acceptance Tests
- [ ] Claude generates permit application text from EDL + venue data
- [ ] Output matches city-specific form requirements
- [ ] Includes: event details, safety plan, site map, insurance info
- [ ] PDF generation for paper submission jurisdictions
- [ ] Organizer reviews and approves before submission
- [ ] Application stored in `permits` table
B
)"

s "US-10.3: Permit Tracking & Status" "user-story,phase-3,backend,sprint-9" "Sprint 9 (Weeks 17-18)" "$(cat <<'B'
**As an** organizer
**I want** to track the status of all my permit applications
**So that** I know if my event is on track for approval

**Story Points:** 5 | **Epic:** #10

## Acceptance Tests
- [ ] Permit status: draft, submitted, under_review, approved, rejected, expired
- [ ] Deadline tracking with notifications: 14d, 7d, 3d before event
- [ ] If rejected: notification with reason and re-application guidance
- [ ] Permit dashboard on event page
- [ ] Event cannot transition to `confirmed` with pending critical permits
B
)"

s "US-10.4: City Government Agent" "user-story,phase-3,ai-agents,sprint-9" "Sprint 9 (Weeks 17-18)" "$(cat <<'B'
**As the** platform
**I want** a government agent that interfaces with city regulatory requirements
**So that** compliance is automated and accurate

**Story Points:** 8 | **Epic:** #10

## Acceptance Tests
- [ ] Agent has tools: check permit rules, validate compliance, generate safety plan
- [ ] Agent maps event requirements to jurisdiction-specific regulations
- [ ] Agent generates compliance checklists
- [ ] Agent monitors ongoing compliance
- [ ] Agent escalates to city admin for ambiguous rules
- [ ] Agent never auto-approves permits (always human)
B
)"

s "US-10.5: City Admin Dashboard" "user-story,phase-3,frontend,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As a** city administrator
**I want** a dashboard showing all events and permits in my jurisdiction
**So that** I can manage public event coordination efficiently

**Story Points:** 5 | **Epic:** #10

## Acceptance Tests
- [ ] List of all events by status, date, location (map view)
- [ ] Permit queue: pending applications sorted by event date
- [ ] Approve/reject permits with notes
- [ ] Calendar view with conflict detection
- [ ] Analytics: events per month, permit approval rate
- [ ] Export reports (CSV/PDF)
B
)"

s "US-10.6: Compliance Monitoring" "user-story,phase-3,backend,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As a** city administrator
**I want** automated compliance monitoring for approved events
**So that** safety requirements are tracked through event day

**Story Points:** 3 | **Epic:** #10

## Acceptance Tests
- [ ] Compliance checklist generated from permit conditions
- [ ] Items tracked: insurance uploaded, safety plan approved, fire inspection
- [ ] Overdue items trigger notification
- [ ] Post-event compliance report auto-generated
- [ ] Non-compliance flagged for future permit decisions
B
)"

# ── Epic 11: Payments ──

s "US-11.1: Stripe Connect Integration" "user-story,phase-3,backend,sprint-8" "Sprint 8 (Weeks 15-16)" "$(cat <<'B'
**As the** platform
**I want** multi-party payments via Stripe Connect
**So that** vendors, venues, and the platform are paid correctly

**Story Points:** 8 | **Epic:** #11

## Acceptance Tests
- [ ] Organizations onboard via Stripe Connect Express accounts
- [ ] Payments split: vendor/venue payout + platform fee (3-8%)
- [ ] Escrow: funds held until event completion
- [ ] Webhook handling for payment status updates
- [ ] PCI compliance via Stripe Elements
B
)"

s "US-11.2: Booking Payment Flow" "user-story,phase-3,backend,sprint-8" "Sprint 8 (Weeks 15-16)" "$(cat <<'B'
**As an** organizer
**I want** to pay for venue and vendor bookings through the platform
**So that** my payments are secure and bookings guaranteed

**Story Points:** 5 | **Epic:** #11

## Acceptance Tests
- [ ] Deposit payment required to confirm booking
- [ ] Full payment due X days before event
- [ ] Payment page with Stripe Elements (card, Apple Pay, Google Pay)
- [ ] Payment receipt emailed
- [ ] Payment status visible on dashboard
- [ ] Failed payment triggers retry notification
B
)"

s "US-11.3: Refund & Cancellation" "user-story,phase-3,backend,sprint-8" "Sprint 8 (Weeks 15-16)" "$(cat <<'B'
**As an** organizer
**I want** a clear refund policy for cancelled bookings
**So that** I know the financial implications

**Story Points:** 5 | **Epic:** #11

## Acceptance Tests
- [ ] Cancellation policy per provider (full > 30d, 50% > 14d, none < 7d)
- [ ] `POST /v1/bookings/:id/cancel` calculates and processes refund
- [ ] Refund processed via Stripe with reason code
- [ ] Platform fee non-refundable (configurable)
- [ ] Cancellation recorded in audit log
B
)"

s "US-11.4: Post-Event Settlement" "user-story,phase-3,backend,sprint-9" "Sprint 9 (Weeks 17-18)" "$(cat <<'B'
**As the** platform
**I want** automated settlement after event completion
**So that** vendors and venues are paid promptly

**Story Points:** 5 | **Epic:** #11

## Acceptance Tests
- [ ] Settlement triggered on event `completed` status
- [ ] Final invoices generated for all bookings
- [ ] Escrow released minus disputes/adjustments
- [ ] Platform fee transferred
- [ ] Settlement report emailed to organizer
- [ ] Completes within 3 business days
B
)"

s "US-11.5: Financial Dashboard" "user-story,phase-3,frontend,sprint-9" "Sprint 9 (Weeks 17-18)" "$(cat <<'B'
**As an** organizer or venue/vendor manager
**I want** a financial overview of my platform activity
**So that** I can track revenue, expenses, and outstanding payments

**Story Points:** 3 | **Epic:** #11

## Acceptance Tests
- [ ] Organizer view: total spend, by-event breakdown, upcoming payments
- [ ] Venue/Vendor view: total earnings, pending payouts, history
- [ ] Exportable to CSV
- [ ] Date range filters
- [ ] Revenue over time chart
B
)"

s "US-11.6: Sponsorship Payment Flow" "user-story,phase-3,backend,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As a** sponsor
**I want** to fund events through the platform
**So that** my sponsorship is tracked and my brand is represented

**Story Points:** 3 | **Epic:** #11

## Acceptance Tests
- [ ] Sponsor creates funding offer with amount and conditions
- [ ] Organizer can accept/reject
- [ ] Accepted sponsorship creates payment obligation
- [ ] Sponsor logo added to event page
- [ ] Sponsorship ROI report
B
)"

# ── Epic 12: Reputation ──

s "US-12.1: Trust Score Engine" "user-story,phase-3,backend,sprint-8" "Sprint 8 (Weeks 15-16)" "$(cat <<'B'
**As the** platform
**I want** a composite trust score for every participant
**So that** reliable participants are prioritized

**Story Points:** 8 | **Epic:** #12

## Acceptance Tests
- [ ] Trust score (0-100) from: completion rate, ratings, verification, tenure, volume
- [ ] Weights configurable per entity type
- [ ] Score recalculated on relevant events
- [ ] Score stored on `organizations` and `users` tables
- [ ] Score history in TimescaleDB
- [ ] Score visible on public profiles
B
)"

s "US-12.2: Verification System" "user-story,phase-3,backend,sprint-8" "Sprint 8 (Weeks 15-16)" "$(cat <<'B'
**As a** vendor or venue manager
**I want** to verify my business credentials on the platform
**So that** organizers trust me and I receive priority

**Story Points:** 5 | **Epic:** #12

## Acceptance Tests
- [ ] Document upload for: business license, insurance, food safety cert
- [ ] Admin review queue
- [ ] Verified badge on profile
- [ ] Verified entities weighted higher in search/matching
- [ ] Expiring credentials trigger renewal notifications
- [ ] Verification changes logged in audit trail
B
)"

s "US-12.3: Review Aggregation & Fraud Detection" "user-story,phase-3,backend,ai-agents,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As the** platform
**I want** to aggregate reviews and detect fraudulent patterns
**So that** trust scores reflect genuine quality

**Story Points:** 5 | **Epic:** #12

## Acceptance Tests
- [ ] Reviews aggregated across events
- [ ] Suspicious review detection (same IP, review bombing)
- [ ] Flagged reviews queued for manual review
- [ ] Review response feature
- [ ] Review sentiment analyzed (Claude Haiku)
B
)"

# ── Epic 13: Mobile ──

s "US-13.1: Mobile App Shell" "user-story,phase-3,frontend,sprint-9" "Sprint 9 (Weeks 17-18)" "$(cat <<'B'
**As a** mobile user
**I want** a native iOS/Android app with core navigation
**So that** I can use UniApp on the go

**Story Points:** 5 | **Epic:** #13

## Acceptance Tests
- [ ] React Native (Expo) with tab navigation
- [ ] Tabs: Discover, My Events, Notifications, Profile
- [ ] Auth screens with biometric option
- [ ] Push notification setup (FCM/APNS)
- [ ] Deep linking to event pages
- [ ] Offline-capable cached event data
B
)"

s "US-13.2: Event Discovery (Mobile)" "user-story,phase-3,frontend,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As an** attendee
**I want** to discover events near me on my phone

**Story Points:** 5 | **Epic:** #13

## Acceptance Tests
- [ ] Map view with event pins
- [ ] List view with swipeable event cards
- [ ] Filters: date, type, distance, price
- [ ] Event detail page
- [ ] Save/bookmark events
- [ ] Share via native share sheet
B
)"

s "US-13.3: Volunteer Check-In (Mobile)" "user-story,phase-3,frontend,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As a** volunteer
**I want** to check in and out of shifts from my phone

**Story Points:** 3 | **Epic:** #13

## Acceptance Tests
- [ ] QR code scanner for check-in
- [ ] Manual check-in with geofence verification (200m)
- [ ] Active shift view: timer, details, emergency contacts
- [ ] Check-out button with hours summary
- [ ] Shift history with total verified hours
B
)"

s "US-13.4: Organizer Dashboard (Mobile)" "user-story,phase-3,frontend,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As an** organizer
**I want** to monitor my event from my phone during the event

**Story Points:** 5 | **Epic:** #13

## Acceptance Tests
- [ ] Real-time metrics: attendance, staffing, incidents
- [ ] Approve/reject checkpoints via push notification
- [ ] Quick actions: send announcement, escalate issue
- [ ] Agent activity feed
- [ ] Contact list for all stakeholders
B
)"

s "US-13.5: Vendor Mobile Experience" "user-story,phase-3,frontend,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As a** vendor on-site at an event
**I want** event-day tools on my phone

**Story Points:** 3 | **Epic:** #13

## Acceptance Tests
- [ ] Active event card with load-in time, setup location, contacts
- [ ] Check-in confirmation
- [ ] Issue reporting (photo + description)
- [ ] Messaging with organizer
- [ ] Post-event invoice confirmation
B
)"

s "US-13.6: Push Notification Integration" "user-story,phase-3,frontend,sprint-10" "Sprint 10 (Weeks 19-20)" "$(cat <<'B'
**As a** mobile user
**I want** to receive push notifications for relevant updates

**Story Points:** 5 | **Epic:** #13

## Acceptance Tests
- [ ] Push for: booking updates, shift reminders, approvals, event changes
- [ ] Preferences sync with web app
- [ ] Tap notification opens relevant screen (deep link)
- [ ] Notification grouping by event
- [ ] Do Not Disturb schedule (configurable quiet hours)
- [ ] Badge count reflects unread
B
)"

echo "=== Phase 4 Stories ==="

# ── Epic 14: Analytics ──

s "US-14.1: Demand Forecasting Engine" "user-story,phase-4,ai-agents,sprint-11" "Sprint 11 (Weeks 21-22)" "$(cat <<'B'
**As the** platform
**I want** AI-powered attendance and resource predictions

**Story Points:** 8 | **Epic:** #14

## Acceptance Tests
- [ ] Claude + code execution analyzes historical event data
- [ ] Confidence intervals for: attendance, staffing, vendor demand
- [ ] Factors: city-wide event density, weather, local calendar
- [ ] `GET /v1/events/:id/forecast` returns forecast
- [ ] Forecast recalculated on event changes
- [ ] Accuracy tracking: actual vs. predicted
B
)"

s "US-14.2: Analytics Service" "user-story,phase-4,backend,sprint-11" "Sprint 11 (Weeks 21-22)" "$(cat <<'B'
**As the** platform
**I want** a time-series analytics pipeline

**Story Points:** 8 | **Epic:** #14

## Acceptance Tests
- [ ] TimescaleDB ingests metrics from NATS events
- [ ] Tracks: events created, bookings, revenue, attendance, agent costs
- [ ] Pre-built aggregations: daily, weekly, monthly
- [ ] `GET /v1/analytics/events?city=austin&period=monthly`
- [ ] Analytics dashboard with charts
- [ ] Export to CSV/PDF
B
)"

s "US-14.3: Organizer Analytics" "user-story,phase-4,frontend,sprint-11" "Sprint 11 (Weeks 21-22)" "$(cat <<'B'
**As an** organizer
**I want** analytics across all my events

**Story Points:** 5 | **Epic:** #14

## Acceptance Tests
- [ ] Summary: total events, attendance, revenue, ratings
- [ ] Trends: attendance growth, budget efficiency
- [ ] Comparison: side-by-side between events
- [ ] AI-generated recommendations
- [ ] Top performing venues, vendors, time slots
B
)"

s "US-14.4: City Analytics Dashboard" "user-story,phase-4,frontend,sprint-11" "Sprint 11 (Weeks 21-22)" "$(cat <<'B'
**As a** city administrator
**I want** city-wide event analytics

**Story Points:** 5 | **Epic:** #14

## Acceptance Tests
- [ ] Heatmap: event density by neighborhood
- [ ] Trends: events per month, permit processing time
- [ ] Underserved areas: low event activity neighborhoods
- [ ] Economic impact estimates
- [ ] Safety metrics: incident rate, compliance scores
- [ ] Exportable reports for city council
B
)"

s "US-14.5: Dynamic Pricing Intelligence" "user-story,phase-4,ai-agents,sprint-11" "Sprint 11 (Weeks 21-22)" "$(cat <<'B'
**As a** venue manager
**I want** AI-recommended pricing based on demand signals

**Story Points:** 3 | **Epic:** #14

## Acceptance Tests
- [ ] Recommendations based on demand, day, season, event type, competitors
- [ ] Manager can accept/reject/modify
- [ ] A/B testing framework
- [ ] Revenue impact tracking
B
)"

# ── Epic 15: Risk ──

s "US-15.1: Risk Assessment Pipeline" "user-story,phase-4,ai-agents,sprint-12" "Sprint 12 (Weeks 23-24)" "$(cat <<'B'
**As the** platform
**I want** every event assessed for risk at creation and continuously

**Story Points:** 8 | **Epic:** #15

## Acceptance Tests
- [ ] Risk assessment on creation and on every significant change
- [ ] Claude evaluates: safety, weather, compliance, financial, reputational
- [ ] Each risk scored: severity + probability
- [ ] `GET /v1/events/:id/risk` returns risk report
- [ ] High/critical risks trigger notification
- [ ] Risk history tracked
B
)"

s "US-15.2: Weather Monitoring" "user-story,phase-4,backend,sprint-11" "Sprint 11 (Weeks 21-22)" "$(cat <<'B'
**As the** platform
**I want** automated weather monitoring for outdoor events

**Story Points:** 5 | **Epic:** #15

## Acceptance Tests
- [ ] Weather API integration
- [ ] 7-day forecast monitored for outdoor events
- [ ] Alerts for: severe weather, extreme heat, heavy rain, high wind
- [ ] Alert levels: advisory (72h), warning (24h), emergency (immediate)
- [ ] Contingency suggestions generated by Claude
- [ ] Historical weather data feeds forecasting
B
)"

s "US-15.3: Incident Reporting & Response" "user-story,phase-4,backend,sprint-12" "Sprint 12 (Weeks 23-24)" "$(cat <<'B'
**As an** event organizer or staff
**I want** to report and track incidents during live events

**Story Points:** 5 | **Epic:** #15

## Acceptance Tests
- [ ] `POST /v1/events/:id/incidents` creates incident report
- [ ] Fields: severity, category, description, photos
- [ ] Critical incidents auto-notify city admin and emergency contacts
- [ ] Incident response tracking: assigned responder, status, resolution
- [ ] Post-event incident summary in settlement report
- [ ] Incidents feed trust scores
B
)"

s "US-15.4: Contingency Plan Generator" "user-story,phase-4,ai-agents,sprint-12" "Sprint 12 (Weeks 23-24)" "$(cat <<'B'
**As an** organizer
**I want** AI-generated contingency plans for likely risks

**Story Points:** 3 | **Epic:** #15

## Acceptance Tests
- [ ] Claude generates plans based on risk assessment
- [ ] Plans include: trigger conditions, actions, responsible parties, comm templates
- [ ] Weather plan: indoor backup, rain delay, refund policy
- [ ] Staffing plan: backup pool, emergency contacts
- [ ] Plans stored on event record and shared with stakeholders
B
)"

# ── Epic 16: Sponsorship ──

s "US-16.1: Sponsor Onboarding" "user-story,phase-4,backend,sprint-12" "Sprint 12 (Weeks 23-24)" "$(cat <<'B'
**As a** sponsor
**I want** to create a sponsor profile with brand guidelines and funding criteria

**Story Points:** 3 | **Epic:** #16

## Acceptance Tests
- [ ] Registration with: company info, logo, brand guidelines, budget range
- [ ] Targeting criteria: event types, demographics, geographic area
- [ ] Funding models: flat fee, per-attendee, in-kind
- [ ] Sponsor profile page visible to organizers
B
)"

s "US-16.2: Sponsor Agent & Matching" "user-story,phase-4,ai-agents,sprint-12" "Sprint 12 (Weeks 23-24)" "$(cat <<'B'
**As the** platform
**I want** an AI agent that matches sponsors to relevant events

**Story Points:** 8 | **Epic:** #16

## Acceptance Tests
- [ ] Agent evaluates events against sponsor criteria
- [ ] Matching score: audience fit, brand alignment, budget match, ROI
- [ ] Agent generates sponsorship proposals
- [ ] Agent negotiates within sponsor's configured ranges
- [ ] Monthly opportunity digest emailed to sponsors
- [ ] Match quality tracked for algorithm improvement
B
)"

s "US-16.3: Sponsorship Management" "user-story,phase-4,frontend,sprint-12" "Sprint 12 (Weeks 23-24)" "$(cat <<'B'
**As an** organizer
**I want** to manage sponsorship offers for my events

**Story Points:** 5 | **Epic:** #16

## Acceptance Tests
- [ ] Incoming offers on event dashboard
- [ ] Accept/reject/counter terms
- [ ] Sponsorship deliverables checklist
- [ ] Payment tracked through payment service
- [ ] Post-event sponsorship report
B
)"

s "US-16.4: Sponsor Dashboard & ROI" "user-story,phase-4,frontend,sprint-13" "Sprint 13 (Weeks 25-26)" "$(cat <<'B'
**As a** sponsor
**I want** a dashboard showing my sponsored events and their impact

**Story Points:** 5 | **Epic:** #16

## Acceptance Tests
- [ ] Active sponsorships: events, amounts, status
- [ ] Historical sponsorships with ROI metrics
- [ ] Aggregate: total investment, total reach, average ROI
- [ ] Event photos/content featuring sponsor branding
- [ ] Exportable reports
B
)"

# ── Epic 17: Hardening ──

s "US-17.1: Load Testing & Performance" "user-story,phase-4,devops,sprint-13" "Sprint 13 (Weeks 25-26)" "$(cat <<'B'
**As a** platform operator
**I want** verified performance under load

**Story Points:** 5 | **Epic:** #17

## Acceptance Tests
- [ ] k6 load tests: event creation, search, booking, WebSocket
- [ ] API handles 500 req/s sustained (p99 < 500ms)
- [ ] WebSocket handles 10,000 concurrent connections per pod
- [ ] Database queries < 50ms (p95)
- [ ] Agent service handles 50 concurrent sessions
- [ ] Results documented with bottleneck analysis
B
)"

s "US-17.2: Security Audit & Hardening" "user-story,phase-4,devops,sprint-13" "Sprint 13 (Weeks 25-26)" "$(cat <<'B'
**As a** platform operator
**I want** a comprehensive security review

**Story Points:** 8 | **Epic:** #17

## Acceptance Tests
- [ ] OWASP Top 10 audit passed
- [ ] Penetration test on API
- [ ] Agent prompt injection testing
- [ ] Secrets rotation procedure tested
- [ ] Data encryption at rest and in transit (TLS 1.3)
- [ ] API rate limiting and abuse detection
- [ ] Security incident response playbook documented
B
)"

s "US-17.3: Disaster Recovery" "user-story,phase-4,devops,sprint-13" "Sprint 13 (Weeks 25-26)" "$(cat <<'B'
**As a** platform operator
**I want** automated backup and recovery procedures

**Story Points:** 5 | **Epic:** #17

## Acceptance Tests
- [ ] PostgreSQL: automated daily backups, PITR (30-day retention)
- [ ] Redis: RDB snapshots every 6 hours
- [ ] S3: cross-region replication
- [ ] Recovery test: full restore within 4 hours
- [ ] Runbook for each failure scenario
B
)"

s "US-17.4: Multi-City Deployment" "user-story,phase-4,devops,sprint-14" "Sprint 14 (Weeks 27-28)" "$(cat <<'B'
**As a** platform operator
**I want** rapid new city onboarding

**Story Points:** 5 | **Epic:** #17

## Acceptance Tests
- [ ] New city onboarding < 1 day
- [ ] City-specific branding configurable without deploy
- [ ] Per-city feature flags
- [ ] Cross-city vendor/organizer operation
- [ ] Per-city analytics isolation
B
)"

s "US-17.5: Documentation & Onboarding" "user-story,phase-4,devops,sprint-14" "Sprint 14 (Weeks 27-28)" "$(cat <<'B'
**As a** new developer
**I want** comprehensive documentation

**Story Points:** 3 | **Epic:** #17

## Acceptance Tests
- [ ] README: setup in < 30 min
- [ ] Architecture diagram (current)
- [ ] Auto-generated API docs from OpenAPI
- [ ] Agent system documentation
- [ ] Runbook for common ops tasks
- [ ] Contributing guide
B
)"

echo ""
echo "=== All user stories created ==="
