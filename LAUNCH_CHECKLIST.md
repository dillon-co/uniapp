# UniApp Launch Checklist

## Pre-Launch (T-2 weeks)

### Infrastructure
- [ ] Production PostgreSQL cluster provisioned with pgvector + PostGIS
- [ ] Redis cluster with persistence and AOF enabled
- [ ] NATS JetStream cluster configured
- [ ] Kubernetes cluster provisioned (min 3 nodes, 4 CPU / 16GB each)
- [ ] DNS configured: `api.uniapp.dev`, `uniapp.dev`
- [ ] TLS certificates via cert-manager (Let's Encrypt)
- [ ] CDN configured for web app (Cloudflare or CloudFront)
- [ ] Ingress controller (nginx or Traefik) deployed

### Security
- [ ] JWT_SECRET is 64+ chars of random entropy (rotate from dev key)
- [ ] All secrets in Kubernetes Secrets (not in source code)
- [ ] CORS origins updated to production domains only
- [ ] Rate limiting verified: 1000 req/min per user
- [ ] CSP headers configured in security plugin
- [ ] SQL injection audit completed (Drizzle ORM — parameterized by default ✓)
- [ ] Dependency audit: `pnpm audit`
- [ ] Anthropic API key has billing alerts configured

### Database
- [ ] All migrations run on production DB: `pnpm db:migrate`
- [ ] Seed data loaded: Austin, TX + any other launch cities
- [ ] Database backups configured (daily pg_dump to S3)
- [ ] Connection pooling configured (PgBouncer recommended for production)
- [ ] pgvector and PostGIS extensions verified: `SELECT * FROM pg_extension;`

### AI / Claude
- [ ] ANTHROPIC_API_KEY has sufficient rate limits for expected load
- [ ] Agent budget caps set appropriately ($5 default, $50 max)
- [ ] Test orchestration with a real event end-to-end
- [ ] Prompt caching verified (cache_read_input_tokens > 0 on repeated calls)

## Pre-Launch (T-1 week)

### Testing
- [ ] All API endpoints tested via `pnpm test`
- [ ] Auth flow tested: register → login → protected route → refresh → logout
- [ ] Event lifecycle: create → orchestrate → approve → negotiate → confirm → live → settle
- [ ] Booking conflict detection tested (overlapping dates should 409)
- [ ] WebSocket tested: connect → auth → subscribe → receive events
- [ ] NL event parsing tested with 10+ diverse inputs
- [ ] Constraint solver tested with budget overflow scenario
- [ ] Bulk import tested with 10 events

### Performance
- [ ] Load test API with k6 (`infra/load-test/`) — target: 1000 req/s
- [ ] Ensure p95 response time < 500ms for non-AI endpoints
- [ ] Ensure p95 response time < 5s for AI endpoints
- [ ] HPA configured and tested under synthetic load
- [ ] Database query performance profiled (add indexes if > 100ms)

### Monitoring
- [ ] Prometheus scraping configured
- [ ] Grafana dashboards imported
- [ ] Alert rules applied and tested (fire a test alert)
- [ ] PagerDuty / Slack integration for alerts
- [ ] Error tracking (Sentry) configured in API

### Content
- [ ] Terms of Service and Privacy Policy pages added
- [ ] At least 2 launch cities configured (Austin + 1 more)
- [ ] Demo event created and publicly visible
- [ ] `admin@uniapp.dev` platform admin account created with strong password

## Launch Day (T-0)

### Deploy
- [ ] Build and push Docker images from latest main: CI pipeline
- [ ] Deploy production: `kubectl apply -k infra/k8s/overlays/production/`
- [ ] Verify health: `curl https://api.uniapp.dev/health`
- [ ] Verify web: `curl https://uniapp.dev`
- [ ] Verify WebSocket: test with wscat or browser DevTools
- [ ] Run smoke tests manually end-to-end

### Communication
- [ ] Status page configured (statuspage.io or similar)
- [ ] Launch announcement prepared (blog, Twitter/X, LinkedIn)
- [ ] Customer support channel ready (Discord, Slack, or Intercom)
- [ ] Documentation site live (can use GitHub Pages from /docs)

### Monitoring
- [ ] All dashboards green before announcing
- [ ] On-call rotation confirmed for first 48 hours
- [ ] Rollback plan documented (kubectl rollout undo deployment/uniapp-api)

## Post-Launch (T+1 week)

- [ ] Review agent cost reports — optimize if > $X/event
- [ ] Monitor error rates — fix any issues immediately
- [ ] Collect user feedback on orchestration accuracy
- [ ] Review audit logs for unexpected agent behavior
- [ ] Performance tuning based on real traffic patterns
- [ ] Memory pruning job scheduled (cron: `DELETE FROM agent_memory WHERE created_at < NOW() - INTERVAL '6 months'`)

## Rollback Procedure

```bash
# Rollback API to previous version
kubectl rollout undo deployment/uniapp-api -n uniapp

# Rollback Web to previous version
kubectl rollout undo deployment/uniapp-web -n uniapp

# Check rollback status
kubectl rollout status deployment/uniapp-api -n uniapp

# If DB migration must be rolled back:
# 1. Take DB snapshot first
# 2. Apply down migration manually
# 3. Deploy old image
```

## Emergency Contacts

| Role | Contact | When to Page |
|------|---------|--------------|
| Platform On-Call | PagerDuty | Any P0/P1 alert |
| Anthropic Support | console.anthropic.com | API outage |
| DB On-Call | PagerDuty | DB unavailable |
| CEO/CTO | Direct | Customer data breach |
