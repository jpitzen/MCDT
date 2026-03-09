# Phase 6: Quick API Reference

## Analytics Endpoints

### Get Aggregate Metrics
```bash
GET /api/analytics/metrics?days=30&cloudProvider=aws
```
**Response**:
```json
{
  "data": {
    "timeRange": { "start": "2025-10-20", "end": "2025-11-19", "days": 30 },
    "totalDeployments": 42,
    "successCount": 39,
    "failureCount": 3,
    "averageDuration": 1250,
    "averageCost": 450,
    "successRate": 92.86,
    "cloudProviderBreakdown": {
      "aws": { "deployments": 20, "successRate": 95 },
      "gcp": { "deployments": 15, "successRate": 93 }
    }
  }
}
```

### Get Historical Trends
```bash
GET /api/analytics/trends?metric=success&interval=daily&days=30
```
**Response**: Time-series data for charts (x=date, y=success_rate)

### Get Predictive Analytics
```bash
GET /api/analytics/predictions?prediction=duration
```
**Response**:
```json
{
  "data": {
    "prediction": "duration",
    "predictions": {
      "expected": 1200,
      "min": 900,
      "max": 1500,
      "confidence": 0.95
    }
  }
}
```

### Export Analytics
```bash
GET /api/analytics/export?format=csv&days=30
```
**Response**: CSV file download

---

## Alert Endpoints

### Create Alert Channel
```bash
POST /api/alerts/channels
Content-Type: application/json

{
  "name": "Production Alerts",
  "channelType": "slack",
  "description": "Alerts for production deployments",
  "slackWebhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "slackChannel": "#deployments",
  "enabled": true
}
```

### Create Alert Rule
```bash
POST /api/alerts/rules
Content-Type: application/json

{
  "name": "Failed Deployments",
  "description": "Alert on deployment failures",
  "enabled": true,
  "severity": "high",
  "channelIds": ["550e8400-e29b-41d4-a716-446655440000"],
  "condition": {
    "field": "status",
    "operator": "=",
    "value": "failed"
  }
}
```

### List Alerts
```bash
GET /api/alerts/channels
GET /api/alerts/rules
GET /api/alerts/history?days=7&severity=high
```

### Test Channel
```bash
POST /api/alerts/channels/{channelId}/test
```

---

## Template Endpoints

### List Templates
```bash
GET /api/templates?cloudProvider=aws&category=production
```
**Response**:
```json
{
  "data": {
    "builtin": [
      {
        "id": "eks-production",
        "name": "Production EKS Cluster",
        "cloudProvider": "aws",
        "category": "production",
        "parameterCount": 5
      }
    ],
    "custom": []
  }
}
```

### Get Template Details
```bash
GET /api/templates/eks-production
```

### Validate Template Config
```bash
POST /api/templates/eks-production/validate
Content-Type: application/json

{
  "config": {
    "clusterName": "my-prod-cluster",
    "nodeCount": 5,
    "maxNodeCount": 10
  }
}
```
**Response**:
```json
{
  "data": {
    "valid": true,
    "errors": [],
    "finalConfig": {
      "clusterName": "my-prod-cluster",
      "kubernetesVersion": "1.27",
      "nodeCount": 5,
      "...": "..."
    }
  }
}
```

### Quick Deploy from Template
```bash
POST /api/templates/eks-production/deploy
Content-Type: application/json

{
  "credentialId": "550e8400-e29b-41d4-a716-446655440000",
  "config": {
    "clusterName": "my-prod-cluster"
  }
}
```
**Response**:
```json
{
  "data": {
    "deploymentId": "xyz123",
    "clusterName": "my-prod-cluster",
    "status": "initializing",
    "createdAt": "2025-11-19T16:30:00Z"
  }
}
```

---

## Logs Endpoints

### Get Deployment Logs
```bash
GET /api/logs/{deploymentId}?phase=terraform&level=error&limit=50
```

### Search Logs
```bash
GET /api/logs/search?query=pod+failed&deploymentId={deploymentId}&startDate=2025-11-19
```

### Export Logs
```bash
POST /api/logs/{deploymentId}/export?format=csv
```
**Response**: CSV file download

---

## Built-in Templates

### 1. eks-basic
- 2 nodes (t3.medium)
- Basic monitoring
- No RDS or auto-scaling
- Perfect for: Development, testing

### 2. eks-production
- 3-10 nodes (auto-scaling)
- RDS database support
- Advanced monitoring & logging
- Perfect for: Production workloads

### 3. gke-basic
- 2 nodes (n1-standard-1)
- Basic monitoring
- Perfect for: GCP projects

### 4. aks-basic
- 2 nodes (Standard_B2s)
- Basic monitoring
- Perfect for: Azure projects

---

## Common Workflows

### 1. Deploy from Template in 3 Steps
```bash
# Step 1: Get template
GET /api/templates/eks-production

# Step 2: Validate config
POST /api/templates/eks-production/validate
{ "config": { "clusterName": "my-cluster" } }

# Step 3: Deploy
POST /api/templates/eks-production/deploy
{ "credentialId": "xxx", "config": { "clusterName": "my-cluster" } }
```

### 2. Setup Alerts for Failures
```bash
# Step 1: Create Slack channel
POST /api/alerts/channels
{ "name": "Slack Alerts", "channelType": "slack", "slackWebhookUrl": "..." }

# Step 2: Create rule for failures
POST /api/alerts/rules
{
  "name": "Deployment Failures",
  "condition": { "field": "status", "operator": "=", "value": "failed" },
  "channelIds": ["channel-id"],
  "severity": "high"
}
```

### 3. Analyze Performance
```bash
# Get trends
GET /api/analytics/trends?metric=success&interval=daily&days=30

# Export data
GET /api/analytics/export?format=csv&days=30

# Make predictions
GET /api/analytics/predictions?prediction=duration
```

---

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 201 | Created | Resource created |
| 400 | Bad Request | Check input validation |
| 401 | Unauthorized | Log in again |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Check logs |

### Example Error Response
```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "clusterName", "message": "Invalid format" }
    ]
  }
}
```

---

## Authentication

All requests require JWT token in header:
```bash
Authorization: Bearer {jwt_token}
```

### Get Token
```bash
POST /api/auth/login
{
  "username": "admin@example.com",
  "password": "password"
}
```

---

## Rate Limits

- Analytics: 60 requests/minute
- Alerts: 30 requests/minute
- Templates: 20 requests/minute
- Logs: 100 requests/minute

---

## Documentation Links

- [Full API Docs](./PHASE_6_IMPLEMENTATION_GUIDE.md)
- [Security Guide](./SECURITY_HARDENING_SUMMARY.md)
- [Deployment Guide](./README.md)

---

**Last Updated**: November 19, 2025  
**API Version**: v1.0  
**Status**: Production Ready
