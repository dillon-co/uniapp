# Deployment Guide

## Prerequisites

- Docker + Docker Compose (local dev)
- Kubernetes cluster (production) — EKS, GKE, or AKS recommended
- `kubectl` configured for your cluster
- `kustomize` v5+
- GitHub Container Registry access (ghcr.io)
- PostgreSQL 16 with `pgvector` and `postgis` extensions
- Redis 7
- NATS 2 with JetStream

## Local Development

```bash
# One-command setup
./scripts/dev-setup.sh

# Or step by step:
cp .env.example .env          # Edit ANTHROPIC_API_KEY
docker compose up -d           # Start Postgres, Redis, NATS
pnpm install                   # Install all dependencies
pnpm db:migrate                # Run migrations
pnpm db:seed                   # Seed Austin + SF cities
pnpm dev                       # Start API (3001) + Web (3000)
```

### Services
| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API | http://localhost:3001 |
| NATS Monitor | http://localhost:8222 |
| Drizzle Studio | `pnpm db:studio` → http://localhost:4983 |

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
DATABASE_URL=postgresql://uniapp:uniapp_dev@localhost:5432/uniapp
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
JWT_SECRET=<32+ random chars — generate: openssl rand -hex 32>
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

## Database Migrations

```bash
# Generate SQL from schema changes
pnpm db:generate

# Run pending migrations
pnpm db:migrate

# Reset local DB (destructive!)
./scripts/reset-db.sh
```

## Docker Build

```bash
# Build API image
docker build -f apps/api/Dockerfile -t uniapp-api:local .

# Build Web image
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.uniapp.dev \
  -t uniapp-web:local .

# Run locally
docker run -p 3001:3001 --env-file .env uniapp-api:local
docker run -p 3000:3000 uniapp-web:local
```

CI/CD automatically builds and pushes to `ghcr.io/dillon-co/uniapp-api:latest` and `ghcr.io/dillon-co/uniapp-web:latest` on every push to `main`.

## Kubernetes Deployment

### Initial Setup

```bash
# Create namespace
kubectl apply -f infra/k8s/base/namespace.yaml

# Create secrets (never commit actual secrets)
kubectl create secret generic uniapp-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=redis-url="redis://..." \
  --from-literal=jwt-secret="$(openssl rand -hex 32)" \
  --from-literal=anthropic-api-key="sk-ant-..." \
  -n uniapp
```

### Deploy

```bash
# Staging
kubectl apply -k infra/k8s/overlays/staging/

# Production
kubectl apply -k infra/k8s/overlays/production/

# Check rollout
kubectl rollout status deployment/uniapp-api -n uniapp
kubectl rollout status deployment/uniapp-web -n uniapp
```

### Update Images

```bash
# After CI builds new images:
kubectl set image deployment/uniapp-api \
  api=ghcr.io/dillon-co/uniapp-api:<sha> \
  -n uniapp

kubectl set image deployment/uniapp-web \
  web=ghcr.io/dillon-co/uniapp-web:<sha> \
  -n uniapp
```

### Useful Commands

```bash
# Tail API logs
kubectl logs -f deployment/uniapp-api -n uniapp

# Port-forward for debugging
kubectl port-forward deployment/uniapp-api 3001:3001 -n uniapp

# Scale manually
kubectl scale deployment/uniapp-api --replicas=5 -n uniapp

# Run migration job in cluster
kubectl run migrate --rm -it \
  --image=ghcr.io/dillon-co/uniapp-api:latest \
  --env-from=secret/uniapp-secrets \
  -n uniapp \
  -- node apps/api/dist/migrate.js
```

## Production Checklist

- [ ] `JWT_SECRET` is 32+ chars of random entropy
- [ ] `ANTHROPIC_API_KEY` is set and has sufficient quota
- [ ] PostgreSQL has `pgvector` and `postgis` extensions enabled
- [ ] All migrations run successfully (`pnpm db:migrate`)
- [ ] Redis persistence enabled (`appendonly yes`)
- [ ] NATS JetStream enabled (`--js`)
- [ ] HPA enabled and tested under load
- [ ] Prometheus scraping `/api/v1/metrics/prometheus`
- [ ] Alert rules applied (`kubectl apply -f infra/monitoring/`)
- [ ] `NEXT_PUBLIC_API_URL` set to production API URL in web build

## Monitoring

- **Metrics**: `GET /api/v1/metrics` (JSON) or `GET /api/v1/metrics/prometheus` (Prometheus text)
- **Health**: `GET /health` (liveness), `GET /health/ready` (readiness)
- **Agent costs**: `GET /api/v1/events/:id/agents` → `meta.totalCostUsd`
- **Prometheus rules**: `infra/monitoring/prometheus-rules.yaml`
