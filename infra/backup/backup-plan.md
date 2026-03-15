# UniApp Disaster Recovery & Backup Plan

## Recovery Time Objectives

| Component | RTO | RPO |
|-----------|-----|-----|
| API Service | 5 minutes | 1 hour |
| Database | 30 minutes | 15 minutes |
| File Storage | 1 hour | 24 hours |
| Full Platform | 1 hour | 15 minutes |

## Database Backup Strategy

### Automated Backups
- **Frequency**: Every 15 minutes (incremental WAL streaming), full daily backup at 02:00 UTC
- **Retention**: 7 days daily, 4 weeks weekly, 12 months monthly
- **Storage**: AWS S3 bucket `uniapp-backups-prod` with cross-region replication to `us-west-2`
- **Encryption**: AES-256 at rest, TLS 1.3 in transit

### Backup Procedure
1. `pg_dump` executed via Kubernetes CronJob (see `backup-cronjob.yaml`)
2. Compressed with gzip before upload
3. Uploaded to S3 with server-side encryption
4. Backup integrity verified with MD5 checksum
5. Alert sent to ops team on success/failure

### Restore Procedure
1. Provision new RDS PostgreSQL instance (or restore existing)
2. Download latest backup from S3: `aws s3 cp s3://uniapp-backups-prod/latest.sql.gz .`
3. Decompress: `gunzip latest.sql.gz`
4. Restore: `psql $DATABASE_URL < latest.sql`
5. Verify data integrity with row counts
6. Run smoke tests against restored database
7. Update DATABASE_URL in Kubernetes secrets
8. Restart API pods: `kubectl rollout restart deployment/uniapp-api`

## Application Recovery

### API Service Failure
1. Kubernetes HPA and health checks automatically restart failed pods
2. If entire cluster fails, deploy from image registry: `kubectl apply -f infra/k8s/`
3. Verify deployment: `kubectl rollout status deployment/uniapp-api`

### Database Failure
1. Promote read replica to primary (RDS Multi-AZ automatic failover ~60s)
2. If replica not available, restore from latest S3 backup
3. Update connection strings in Kubernetes secrets
4. Restart all API pods

### Complete Region Failure
1. Activate DR region (eu-west-1) in Route 53
2. Update DNS failover records (TTL 60s)
3. Restore database from cross-region S3 replica
4. Deploy application to DR cluster
5. Verify all services operational
6. Communicate status via status page (https://status.uniapp.dev)

## Monitoring & Alerts

- Database backup success/failure → PagerDuty alert
- Backup size anomaly (>50% variation) → Slack #ops-alerts
- S3 replication lag > 5 minutes → PagerDuty
- RPO breach → PagerDuty P1 alert

## Runbooks
- [Database Restore](./runbooks/db-restore.md)
- [Region Failover](./runbooks/region-failover.md)
- [API Rollback](./runbooks/api-rollback.md)
