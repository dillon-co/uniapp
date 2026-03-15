# UniApp API Reference

Base URL: `https://api.uniapp.dev` (production) | `http://localhost:3001` (local)

All endpoints return JSON. Errors follow [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807).

## Authentication

All protected endpoints require a Bearer JWT in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Tokens expire after 15 minutes. Use the refresh endpoint to obtain a new token.

---

## Auth `/api/v1/auth`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/register` | Create account, returns tokens | No |
| POST | `/login` | Authenticate, returns tokens | No |
| POST | `/refresh` | Exchange refresh token for new access token | No |
| POST | `/forgot-password` | Send password reset email | No |
| POST | `/reset-password` | Reset password with token | No |
| GET | `/me` | Get current user profile | Yes |

### POST /api/v1/auth/register
```json
{ "email": "user@example.com", "password": "min8chars", "name": "Jane Smith", "cityId": "uuid" }
```
Returns: `{ data: { user, accessToken, refreshToken, expiresIn } }`

---

## Users `/api/v1/users`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/me` | Current user profile | Yes |
| PATCH | `/me` | Update name/phone/preferences | Yes |
| GET | `/:id` | Get user by ID | Admin |

---

## Events `/api/v1/events`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Create event | Organizer |
| GET | `/` | List events (mine + public confirmed) | Yes |
| GET | `/:id` | Get event detail | Yes |
| PATCH | `/:id` | Update event fields | Owner/Admin |
| DELETE | `/:id` | Soft-delete (→ cancelled) | Owner/Admin |
| POST | `/:id/transition` | State machine transition | Owner/Admin |
| GET | `/:id/history` | Full audit timeline | Yes |
| GET | `/:id/dashboard` | Aggregated stats + warnings | Owner/Admin |
| POST | `/:id/orchestrate` | AI multi-agent planning (4 agents parallel) | Organizer |
| POST | `/:id/match-volunteers` | Auto-match volunteers to shifts | Organizer |
| POST | `/:id/approve` | Trigger orchestration with approval gate | Organizer |
| GET | `/:id/agents` | Agent run history | Owner/Admin |
| GET | `/:id/approvals` | List approval gates | Owner/Admin |
| POST | `/:id/approvals/:gateId/respond` | Approve/reject gate | Owner |
| POST | `/:id/settle` | Post-event financial settlement | Owner/Admin |
| GET | `/:id/financial` | Financial dashboard | Owner/Admin |
| POST | `/:id/risk-assess` | AI risk assessment | Owner/Admin |
| POST | `/:id/forecast` | AI demand forecast | Owner/Admin |
| POST | `/:id/find-sponsors` | AI sponsor matching | Owner/Admin |
| GET | `/:id/negotiations` | All negotiations for event | Owner/Admin |
| GET | `/:id/permits` | Permits for event | Owner/Admin |
| POST | `/parse` | Natural language → EDL (no side effects) | Yes |
| POST | `/import` | Bulk NL import (max 500) | Organizer |
| GET | `/search` | Full-text + geo event search | Yes |
| GET | `/search/suggest` | Autocomplete (top 5) | Yes |

### Event State Machine
```
draft → planning → negotiating → confirmed → live → completed → settled
                                         ↘ cancelled (from any)
```

---

## Venues `/api/v1/venues`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Create venue | Yes |
| GET | `/search` | Geo + capacity + type search | Yes |
| GET | `/:id` | Venue details | Yes |
| PATCH | `/:id` | Update venue | Venue Manager/Admin |
| DELETE | `/:id` | Delete venue | Venue Manager/Admin |
| GET | `/:id/availability` | Check date availability | Yes |
| GET | `/:id/pricing` | Rate card + tier calculation | Yes |
| POST | `/:id/reviews` | Submit review (completed booking req.) | Yes |
| GET | `/:id/reviews` | List reviews + aggregate rating | Yes |
| GET | `/:id/rating` | Aggregate rating only | No |
| POST | `/:id/price-recommend` | AI dynamic pricing recommendation | Yes |

---

## Bookings `/api/v1/bookings`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Create booking request | Organizer |
| GET | `/` | List my bookings | Yes |
| GET | `/:id` | Booking detail | Yes |
| POST | `/:id/respond` | Approve / reject (venue manager) | Venue Manager |
| POST | `/:id/confirm` | Confirm approved booking (organizer) | Organizer |
| POST | `/:id/cancel` | Cancel booking | Owner/Admin |
| POST | `/:id/pay` | Mock payment for booking | Yes |

---

## Vendors `/api/v1/vendors`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Create vendor profile | Yes |
| GET | `/search` | Category + price search | Yes |
| GET | `/:id` | Vendor detail | Yes |
| PATCH | `/:id` | Update vendor | Vendor/Admin |

## Bids `/api/v1/bids`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Submit bid | Yes |
| GET | `/` | List bids (by vendorId or eventId) | Yes |
| GET | `/:id` | Bid detail | Yes |
| POST | `/:id/respond` | Accept / reject / counter | Yes |
| POST | `/:id/withdraw` | Withdraw bid | Yes |

---

## Volunteers `/api/v1/volunteers`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Register volunteer profile | Yes |
| GET | `/me` | My volunteer profile | Yes |
| PATCH | `/me` | Update skills/availability/preferences | Yes |
| GET | `/shifts` | Browse available shifts | Yes |
| POST | `/shifts` | Create shift (organizer) | Organizer |
| POST | `/shifts/:id/signup` | Sign up for shift | Yes |
| POST | `/shifts/:id/checkin` | Check in to shift | Yes |
| POST | `/shifts/:id/checkout` | Check out from shift | Yes |
| POST | `/track-hours/:id` | Record verified hours | Yes |

---

## Negotiations `/api/v1/negotiations`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Initiate negotiation | Yes |
| GET | `/` | List negotiations for event | Yes |
| GET | `/:id` | Negotiation detail + rounds | Yes |
| POST | `/:id/respond` | Submit round response | Yes |
| POST | `/:id/ai-counter` | Generate AI counter-proposal | Yes |

---

## Notifications `/api/v1/notifications`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List notifications (unreadOnly query param) | Yes |
| PATCH | `/:id/read` | Mark read | Yes |
| POST | `/read-all` | Mark all read | Yes |

---

## Agents `/api/v1/agents`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/run` | Run a specialist agent | Organizer |
| GET | `/status/:eventId` | Active agent count | Yes |
| POST | `/city-check` | City compliance check | Yes |

**Agent types:** `orchestrator`, `venue-scout`, `vendor-coordinator`, `volunteer-coordinator`, `permit-processor`

---

## Constraints `/api/v1/constraints`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/solve` | AI constraint resolution (effort:max) | Yes |
| POST | `/budget-check` | Budget overflow resolution | Yes |

---

## Permits `/api/v1/permits` (Sprint 9)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List permits for event | Yes |
| POST | `/` | Create permit application | Yes |
| PATCH | `/:id` | Update permit status | Admin |
| POST | `/generate` | AI-generate permit application | Yes |

---

## Payments `/api/v1/payments`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/create-intent` | Create mock payment intent | Yes |
| POST | `/confirm` | Confirm payment | Yes |
| GET | `/booking/:bookingId` | Payment for booking | Yes |
| POST | `/:paymentId/refund` | Refund payment | Yes |

---

## Trust `/api/v1/trust`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/compute/:entityType/:entityId` | Recompute trust score | Admin |

---

## Memory `/api/v1/memory`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Save memory (admin) | Admin |
| GET | `/` | Recall memories | Yes |
| GET | `/context` | Synthesized context for agent prompt | Yes |
| DELETE | `/prune` | Delete memories >6 months | Admin |

---

## Cities `/api/v1/cities`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List all cities | No |
| GET | `/:slug` | City details | No |
| POST | `/` | Create city | Platform Admin |
| PATCH | `/:id` | Update city config | Admin |

---

## WebSocket `/ws`

Connect: `ws://api.uniapp.dev/ws`

### Protocol

**Authenticate:**
```json
{ "type": "auth", "token": "<jwt>" }
```
Response: `{ "event": "authenticated", "data": { "userId": "..." } }`

**Subscribe to room:**
```json
{ "type": "subscribe", "room": "event:<eventId>" }
```
Rooms: `event:<id>`, `user:<id>`

**Events pushed to clients:**
- `booking_updated` — booking status changed
- `event_state_changed` — event transitioned
- `approval_gate_resolved` — gate approved/rejected
- `orchestration_complete` — AI planning finished
- `volunteer_matching_complete` — volunteer assignments made
- `notification` — new in-app notification

---

## Error Response Format (RFC 7807)

```json
{
  "type": "https://uniapp.dev/errors/notfound",
  "title": "NotFoundError",
  "status": 404,
  "detail": "Event not found",
  "instance": "<trace-id>"
}
```

## Rate Limits

- 1000 requests/minute per authenticated user
- 429 response with `Retry-After` header on limit exceeded
- Auth endpoints: stricter limits apply
