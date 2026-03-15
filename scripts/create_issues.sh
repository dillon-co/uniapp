#!/usr/bin/env bash
set -euo pipefail

REPO="dillon-co/uniapp"

issue() {
  local title="$1" labels="$2" milestone="$3" body="$4"
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --milestone "$milestone" --body "$body" 2>&1 | tail -1
}

echo "=== Creating Epic Issues ==="

# Epic 1
issue "Epic 1: Project Scaffolding & Infrastructure" "epic,phase-1,devops" "Sprint 1 (Weeks 1-2)" "$(cat <<'BODY'
## Goal
Monorepo, CI/CD pipeline, dev environment, and core infrastructure running so the team can ship from day one.

## Owner
DevOps + Tech Lead

## Total Points: 34

## User Stories
- [ ] US-1.1: Monorepo Setup (5 pts)
- [ ] US-1.2: CI/CD Pipeline (5 pts)
- [ ] US-1.3: Infrastructure as Code (8 pts)
- [ ] US-1.4: Database Setup & Migrations (5 pts)
- [ ] US-1.5: Dockerized Dev Environment (3 pts)
- [ ] US-1.6: Kubernetes Manifests & Helm Charts (5 pts)
- [ ] US-1.7: Observability Foundation (3 pts)
BODY
)"

# Epic 2
issue "Epic 2: Authentication & User Management" "epic,phase-1,backend" "Sprint 1 (Weeks 1-2)" "$(cat <<'BODY'
## Goal
Users can register, log in, and manage their profiles. RBAC is enforced across all APIs.

## Owner
Backend Senior + Full-Stack

## Total Points: 29

## User Stories
- [ ] US-2.1: Auth Provider Integration (5 pts)
- [ ] US-2.2: User Profile Service (5 pts)
- [ ] US-2.3: Organization Management (5 pts)
- [ ] US-2.4: RBAC Middleware (5 pts)
- [ ] US-2.5: API Gateway Setup (5 pts)
- [ ] US-2.6: Multi-Tenant City Configuration (4 pts)
BODY
)"

# Epic 3
issue "Epic 3: Event Service & Natural Language Processing" "epic,phase-1,ai-agents,backend" "Sprint 2 (Weeks 3-4)" "$(cat <<'BODY'
## Goal
Users can describe events in plain English and get structured plans. The NL→EDL pipeline is production-quality.

## Owner
AI/Agent Engineer + Backend Senior

## Total Points: 42

## User Stories
- [ ] US-3.1: Event CRUD API (5 pts)
- [ ] US-3.2: Natural Language Intent Parsing (8 pts)
- [ ] US-3.3: EDL Schema & Validation (5 pts)
- [ ] US-3.4: Event State Machine (5 pts)
- [ ] US-3.5: Event Search & Discovery (8 pts)
- [ ] US-3.6: Event Timeline & Activity Feed (5 pts)
- [ ] US-3.7: Event Dashboard API (3 pts)
- [ ] US-3.8: Bulk Event Import (3 pts)
BODY
)"

# Epic 4
issue "Epic 4: Venue Service" "epic,phase-1,backend" "Sprint 3 (Weeks 5-6)" "$(cat <<'BODY'
## Goal
Venues are registered, searchable, and bookable with availability management.

## Owner
Backend Senior + Full-Stack

## Total Points: 31

## User Stories
- [ ] US-4.1: Venue CRUD (5 pts)
- [ ] US-4.2: Venue Availability Calendar (5 pts)
- [ ] US-4.3: Venue Search with Geo & Filters (5 pts)
- [ ] US-4.4: Venue Pricing & Rate Card (5 pts)
- [ ] US-4.5: Venue Booking Flow (8 pts)
- [ ] US-4.6: Venue Reviews & Ratings (3 pts)
BODY
)"

# Epic 5
issue "Epic 5: Web Application MVP" "epic,phase-1,frontend" "Sprint 3 (Weeks 5-6)" "$(cat <<'BODY'
## Goal
Functional web app for event creation, venue browsing, and basic dashboard.

## Owner
Full-Stack + Frontend

## Total Points: 34

## User Stories
- [ ] US-5.1: App Shell & Navigation (5 pts)
- [ ] US-5.2: Auth Pages (3 pts)
- [ ] US-5.3: Event Creation Flow (8 pts)
- [ ] US-5.4: Event Dashboard Page (5 pts)
- [ ] US-5.5: Venue Browser (5 pts)
- [ ] US-5.6: User Profile & Settings (3 pts)
- [ ] US-5.7: Event List & My Events (5 pts)
BODY
)"

# Epic 6
issue "Epic 6: Agent Runtime & Orchestration" "epic,phase-2,ai-agents" "Sprint 5 (Weeks 9-10)" "$(cat <<'BODY'
## Goal
Multi-agent system that can plan events autonomously with human checkpoints.

## Owner
AI/Agent Engineer + Tech Lead

## Total Points: 50

## User Stories
- [ ] US-6.1: Agent Runtime Service (13 pts)
- [ ] US-6.2: Agent Tool Framework / MCP (8 pts)
- [ ] US-6.3: Orchestrator Agent (8 pts)
- [ ] US-6.4: Approval Gate System (5 pts)
- [ ] US-6.5: Agent Memory & Context (8 pts)
- [ ] US-6.6: Agent Audit & Observability (8 pts)
BODY
)"

# Epic 7
issue "Epic 7: Negotiation Protocol" "epic,phase-2,ai-agents,backend" "Sprint 6 (Weeks 11-12)" "$(cat <<'BODY'
## Goal
Agents negotiate terms through a structured protocol with conflict resolution.

## Owner
AI/Agent Engineer + Backend Senior

## Total Points: 34

## User Stories
- [ ] US-7.1: Negotiation Engine (8 pts)
- [ ] US-7.2: Constraint Solver (8 pts)
- [ ] US-7.3: Venue Agent (5 pts)
- [ ] US-7.4: Vendor Agent (5 pts)
- [ ] US-7.5: Volunteer Agent (5 pts)
- [ ] US-7.6: Negotiation Dashboard UI (3 pts)
BODY
)"

# Epic 8
issue "Epic 8: Vendor & Volunteer Services" "epic,phase-2,backend" "Sprint 5 (Weeks 9-10)" "$(cat <<'BODY'
## Goal
Vendors and volunteers can register, manage profiles, and receive AI-matched opportunities.

## Owner
Backend Senior + Full-Stack

## Total Points: 26

## User Stories
- [ ] US-8.1: Vendor CRUD & Profile (5 pts)
- [ ] US-8.2: Vendor Bid Management (5 pts)
- [ ] US-8.3: Volunteer Registration & Skills (3 pts)
- [ ] US-8.4: Volunteer Shift Management (5 pts)
- [ ] US-8.5: Notification Service (5 pts)
- [ ] US-8.6: Vendor & Volunteer Search UI (3 pts)
BODY
)"

# Epic 9
issue "Epic 9: Real-Time & WebSocket Layer" "epic,phase-2,backend,frontend" "Sprint 5 (Weeks 9-10)" "$(cat <<'BODY'
## Goal
Live dashboards, agent activity streams, and real-time notifications.

## Owner
Backend Senior + Frontend

## Total Points: 18

## User Stories
- [ ] US-9.1: WebSocket Service (5 pts)
- [ ] US-9.2: Event Live Dashboard (8 pts)
- [ ] US-9.3: Real-Time Notifications (5 pts)
BODY
)"

# Epic 10
issue "Epic 10: Permit Automation" "epic,phase-3,ai-agents,backend" "Sprint 9 (Weeks 17-18)" "$(cat <<'BODY'
## Goal
AI-driven permit identification, application generation, and tracking.

## Owner
AI/Agent Engineer + Backend Senior

## Total Points: 34

## User Stories
- [ ] US-10.1: Permit Requirement Detection (5 pts)
- [ ] US-10.2: Permit Application Generator (8 pts)
- [ ] US-10.3: Permit Tracking & Status (5 pts)
- [ ] US-10.4: City Government Agent (8 pts)
- [ ] US-10.5: City Admin Dashboard (5 pts)
- [ ] US-10.6: Compliance Monitoring (3 pts)
BODY
)"

# Epic 11
issue "Epic 11: Payment & Financial System" "epic,phase-3,backend" "Sprint 8 (Weeks 15-16)" "$(cat <<'BODY'
## Goal
Secure payments with escrow, split payouts, and platform fees.

## Owner
Backend Senior

## Total Points: 29

## User Stories
- [ ] US-11.1: Stripe Connect Integration (8 pts)
- [ ] US-11.2: Booking Payment Flow (5 pts)
- [ ] US-11.3: Refund & Cancellation (5 pts)
- [ ] US-11.4: Post-Event Settlement (5 pts)
- [ ] US-11.5: Financial Dashboard (3 pts)
- [ ] US-11.6: Sponsorship Payment Flow (3 pts)
BODY
)"

# Epic 12
issue "Epic 12: Reputation & Trust System" "epic,phase-3,backend,ai-agents" "Sprint 8 (Weeks 15-16)" "$(cat <<'BODY'
## Goal
Verifiable trust scores that incentivize reliability and quality.

## Owner
Backend Senior + AI/Agent Engineer

## Total Points: 18

## User Stories
- [ ] US-12.1: Trust Score Engine (8 pts)
- [ ] US-12.2: Verification System (5 pts)
- [ ] US-12.3: Review Aggregation & Fraud Detection (5 pts)
BODY
)"

# Epic 13
issue "Epic 13: Mobile Application" "epic,phase-3,frontend" "Sprint 9 (Weeks 17-18)" "$(cat <<'BODY'
## Goal
React Native app for organizers, vendors, volunteers, and attendees.

## Owner
Frontend/Mobile Engineer

## Total Points: 26

## User Stories
- [ ] US-13.1: Mobile App Shell (5 pts)
- [ ] US-13.2: Event Discovery Mobile (5 pts)
- [ ] US-13.3: Volunteer Check-In Mobile (3 pts)
- [ ] US-13.4: Organizer Dashboard Mobile (5 pts)
- [ ] US-13.5: Vendor Mobile Experience (3 pts)
- [ ] US-13.6: Push Notification Integration (5 pts)
BODY
)"

# Epic 14
issue "Epic 14: Demand Forecasting & Analytics" "epic,phase-4,ai-agents,backend" "Sprint 11 (Weeks 21-22)" "$(cat <<'BODY'
## Goal
AI-powered demand prediction, resource optimization, and city-wide analytics.

## Owner
AI/Agent Engineer + Backend Senior

## Total Points: 29

## User Stories
- [ ] US-14.1: Demand Forecasting Engine (8 pts)
- [ ] US-14.2: Analytics Service (8 pts)
- [ ] US-14.3: Organizer Analytics (5 pts)
- [ ] US-14.4: City Analytics Dashboard (5 pts)
- [ ] US-14.5: Dynamic Pricing Intelligence (3 pts)
BODY
)"

# Epic 15
issue "Epic 15: Risk Engine & Safety" "epic,phase-4,ai-agents" "Sprint 12 (Weeks 23-24)" "$(cat <<'BODY'
## Goal
Continuous risk monitoring with automated contingency triggering.

## Owner
AI/Agent Engineer

## Total Points: 21

## User Stories
- [ ] US-15.1: Risk Assessment Pipeline (8 pts)
- [ ] US-15.2: Weather Monitoring (5 pts)
- [ ] US-15.3: Incident Reporting & Response (5 pts)
- [ ] US-15.4: Contingency Plan Generator (3 pts)
BODY
)"

# Epic 16
issue "Epic 16: Sponsorship Marketplace" "epic,phase-4,ai-agents,frontend" "Sprint 12 (Weeks 23-24)" "$(cat <<'BODY'
## Goal
Sponsors discover and fund events; organizers receive funding.

## Owner
Full-Stack + AI/Agent Engineer

## Total Points: 21

## User Stories
- [ ] US-16.1: Sponsor Onboarding (3 pts)
- [ ] US-16.2: Sponsor Agent & Matching (8 pts)
- [ ] US-16.3: Sponsorship Management (5 pts)
- [ ] US-16.4: Sponsor Dashboard & ROI (5 pts)
BODY
)"

# Epic 17
issue "Epic 17: Platform Hardening & Scale" "epic,phase-4,devops" "Sprint 13 (Weeks 25-26)" "$(cat <<'BODY'
## Goal
Performance, security, and operational readiness for multi-city launch.

## Owner
DevOps + Tech Lead

## Total Points: 26

## User Stories
- [ ] US-17.1: Load Testing & Performance (5 pts)
- [ ] US-17.2: Security Audit & Hardening (8 pts)
- [ ] US-17.3: Disaster Recovery (5 pts)
- [ ] US-17.4: Multi-City Deployment (5 pts)
- [ ] US-17.5: Documentation & Onboarding (3 pts)
BODY
)"

echo ""
echo "=== All 17 epics created ==="
