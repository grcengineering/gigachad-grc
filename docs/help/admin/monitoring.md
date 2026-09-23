# Monitoring & Metrics

Monitor the health and performance of your GigaChad GRC platform.

## Overview

The monitoring stack provides:
- Real-time service health
- Performance metrics
- Resource utilization
- Alert notifications
- Historical trends

## Accessing Monitoring

### Prometheus

Direct access to metrics:
- **Local gateway URL**: https://prometheus.localhost
- **Direct debugging URL**: http://localhost:9090
- **Purpose**: Query raw metrics, view targets

### Grafana

Visual dashboards:
- **Local gateway URL**: https://grafana.localhost
- **Direct debugging URL**: http://localhost:3003
- **Login**: `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` from the protected `.env`

The production Compose file does not include this local monitoring stack. Configure and secure external monitoring separately for production.

## Pre-Built Dashboards

### GRC Platform Overview

The main dashboard shows:

| Panel | Description |
|-------|-------------|
| **Service Health** | Status of all services |
| **Request Rate** | Requests per second by service |
| **Error Rate** | Percentage of failed requests |
| **Response Time (p95)** | 95th percentile latency |
| **Memory Usage** | Memory consumption per service |
| **Database Connections** | Active DB connections |

### Service-Specific Dashboards

Individual dashboards for:
- Controls Service
- Audit Service
- Risk Management
- Authentication (Keycloak)

## Key Metrics

### Application Metrics

| Metric | Description |
|--------|-------------|
| `http_requests_total` | Total HTTP requests |
| `http_request_duration_seconds` | Request latency histogram |
| `process_cpu_seconds_total` | CPU usage |
| `process_resident_memory_bytes` | Memory usage |

### Database Metrics

| Metric | Description |
|--------|-------------|
| `prisma_client_queries_active` | Active database queries |
| `prisma_client_connection_pool_size` | Connection pool size |
| `prisma_client_query_duration` | Query execution time |

### Business Metrics

| Metric | Description |
|--------|-------------|
| `grc_controls_total` | Total controls count |
| `grc_risks_total` | Total risks by severity |
| `grc_evidence_uploads` | Evidence upload count |
| `grc_audit_requests_open` | Open audit requests |

## Alert Rules

### Pre-Configured Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| **High Error Rate** | >5% errors for 5 min | Critical |
| **Service Down** | No response for 2 min | Critical |
| **High Memory** | >80% for 10 min | Warning |
| **Slow Queries** | p95 > 5s | Warning |

### Custom Alerts

Create custom alerts in Prometheus:

```yaml
groups:
  - name: custom-alerts
    rules:
      - alert: HighRiskCount
        expr: grc_risks_total{severity="critical"} > 10
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "High number of critical risks"
```

## Using Grafana

### Navigating Dashboards

1. Click dashboard name to switch
2. Use time picker for date range
3. Click panels to drill down
4. Use variables for filtering

### Creating Dashboards

1. Click **+** → **Dashboard**
2. Add panels with visualizations
3. Configure queries
4. Save dashboard

### Sharing Dashboards

- Export as JSON
- Share via link
- Embed in other tools
- Schedule reports

## Query Examples

### PromQL Queries

Request rate:
```promql
sum(rate(http_requests_total[5m])) by (job)
```

Error rate:
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

p95 latency:
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job))
```

Memory usage:
```promql
process_resident_memory_bytes / 1024 / 1024
```

## Health Checks

### Service Health

Each service exposes health endpoint:
```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}
```

### Prometheus Targets

View all scrape targets:
1. Go to Prometheus UI
2. Click **Status** → **Targets**
3. See target status and errors

## Troubleshooting

### No Metrics Showing

1. Verify service is running
2. Check `/api/metrics` endpoint
3. Verify Prometheus config
4. Check network connectivity

### Grafana Won't Load

1. Check Grafana container status
2. Verify datasource configured
3. Check credentials
4. Review Grafana logs

### Missing Data Points

1. Check scrape interval
2. Verify time range
3. Check for service restarts
4. Review retention settings

## Best Practices

### Production Setup

- Change default passwords
- Enable authentication
- Configure TLS
- Set appropriate retention

### Alert Management

- Set meaningful thresholds
- Avoid alert fatigue
- Document alert responses
- Test alert delivery

### Data Retention

- Configure based on needs
- Monitor storage usage
- Archive historical data
- Plan for growth

## Related Topics

- [Organization Settings](organization.md)
- [Audit Logs](audit-logs.md)
- [Deployment Guide](/docs/DEPLOYMENT.md)

