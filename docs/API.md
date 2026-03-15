# UniApp API Reference

Base URL: `https://api.uniapp.dev/api/v1`
Authentication: Bearer JWT token from `POST /auth/login`

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login with email/password |
| POST | /auth/register | Register new user |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/forgot-password | Request password reset |
| POST | /auth/reset-password | Reset password with token |
| GET | /auth/me | Get current user profile |

## Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /events | List events |
| POST | /events | Create event |
| GET | /events/:id | Get event by ID |
| PATCH | /events/:id | Update event |
| DELETE | /events/:id | Delete event |
| GET | /events/:id/history | Event audit history |
| POST | /events/:id/forecast | AI demand forecast |
| POST | /events/:id/risk-assess | AI risk assessment |
| POST | /events/:id/contingency-plan | Generate contingency plan |
| POST | /events/:id/settle | Post-event settlement |
| GET | /events/:id/financial | Financial summary |
| GET | /events/:id/permits | List permits |
| POST | /events/:id/permits | Create permit |
| POST | /events/:id/permits/generate | AI permit generation |
| GET | /events/:id/incidents | List incidents |
| POST | /events/:id/incidents | Report incident |
| GET | /events/:id/negotiations | List negotiations |
| GET | /events/:id/sponsorships | List sponsorships |
| POST | /events/:id/sponsorships | Add sponsorship |
| GET | /events/search | Search events |
| GET | /events/dashboard | Dashboard summary |

## Venues

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /venues | List venues |
| POST | /venues | Create venue |
| GET | /venues/:id | Get venue |
| PATCH | /venues/:id | Update venue |
| DELETE | /venues/:id | Delete venue |
| POST | /venues/:id/price-recommend | AI pricing recommendation |
| GET | /venues/:id/reviews | List reviews |
| POST | /venues/:id/reviews | Create review |
| GET | /venues/:id/rating | Get aggregate rating |
| GET | /venues/reviews/fraud-check | Admin: review fraud analysis |

## Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /bookings | List bookings |
| POST | /bookings | Create booking |
| GET | /bookings/:id | Get booking |
| POST | /bookings/:id/respond | Approve/reject booking |
| POST | /bookings/:id/confirm | Confirm booking |
| POST | /bookings/:id/cancel | Cancel booking |
| POST | /bookings/:id/pay | Pay for booking |

## Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /payments/create-intent | Create payment intent |
| POST | /payments/confirm | Confirm payment |
| GET | /payments/booking/:bookingId | Get payments for booking |
| POST | /payments/:paymentId/refund | Refund payment |

## Negotiations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /negotiations | List negotiations |
| POST | /negotiations | Initiate negotiation |
| GET | /negotiations/:id | Get negotiation |
| POST | /negotiations/:id/respond | Submit response |
| POST | /negotiations/:id/ai-counter | AI counter proposal |

## Vendors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /vendors | List vendors |
| POST | /vendors | Create vendor |
| GET | /vendors/:id | Get vendor |
| PATCH | /vendors/:id | Update vendor |

## Volunteers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /volunteers | List volunteers |
| POST | /volunteers | Register volunteer |
| GET | /events/:id/volunteer-match | AI volunteer matching |

## Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /agents/run | Run an AI agent |
| GET | /agents/status/:eventId | Agent status |
| POST | /agents/city-check | City compliance check |

## Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /analytics/record | Record metric |
| GET | /analytics/events/:id | Event analytics |
| GET | /analytics/cities/:id | City analytics |

## Compliance & City

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /compliance/events | Events with compliance status |
| GET | /compliance/summary | Aggregate compliance stats |

## Sponsors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /sponsors | List sponsors |
| POST | /sponsors | Create sponsor |
| GET | /sponsors/:id | Get sponsor |
| PATCH | /sponsors/:id | Update sponsor |
| DELETE | /sponsors/:id | Deactivate sponsor |
| POST | /sponsors/events/:eventId/find-sponsors | AI sponsor matching |

## Trust & Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /trust/:entityType/:entityId | Get trust score |
| POST | /trust/compute/:entityType/:entityId | Compute trust score |
| POST | /trust/compute-batch | Batch compute (admin) |
| GET | /verifications | List verifications |
| POST | /verifications | Submit verification |
| GET | /verifications/:id | Get verification |
| PATCH | /verifications/:id | Update verification status |

## Weather & Infrastructure

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /weather | Get weather forecast |
| GET | /notifications | List notifications |
| GET | /memory | Agent memory entries |
| GET | /api/v1/openapi.json | OpenAPI spec |
| GET | /api/docs | Swagger UI |
