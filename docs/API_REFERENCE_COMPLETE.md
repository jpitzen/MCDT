# ZLAWS API Quick Reference Guide

**Version**: Phase 6 (Complete)  
**Last Updated**: January 2025  
**Status**: Production Ready  

## Base URL
```
http://localhost:5000/api
https://your-domain.com/api (production)
```

## Authentication
All endpoints (except `/auth/register`, `/auth/login`, `/health`) require JWT token in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Quick Start - Authentication

### Register User
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "username": "username"
}

# Response (201):
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

# Response (200):
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "role": "operator"
  }
}
```

## Teams API (18 endpoints)

### Team CRUD

**List Teams**
```bash
GET /teams?page=1&limit=10
Authorization: Bearer token

# Response:
{
  "status": "success",
  "data": [...],
  "pagination": {"page": 1, "limit": 10, "total": 5}
}
```

**Create Team**
```bash
POST /teams
Content-Type: application/json
Authorization: Bearer token

{
  "name": "DevOps Team",
  "description": "Infrastructure deployment",
  "maxMembers": 20,
  "isPublic": false,
  "tags": ["production", "infrastructure"]
}
```

**Get Team Details**
```bash
GET /teams/{teamId}
Authorization: Bearer token
```

**Update Team**
```bash
PUT /teams/{teamId}
Content-Type: application/json
Authorization: Bearer token

{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

**Delete Team**
```bash
DELETE /teams/{teamId}
Authorization: Bearer token
```

### Member Management

**Invite Member**
```bash
POST /teams/{teamId}/members/invite
Content-Type: application/json
Authorization: Bearer token

{
  "email": "newuser@example.com",
  "role": "operator"  # admin, operator, viewer, custom
}
```

**Accept Invitation**
```bash
POST /teams/{teamId}/members/{memberId}/accept
Authorization: Bearer token
```

**Update Member Role**
```bash
PUT /teams/{teamId}/members/{memberId}/role
Content-Type: application/json
Authorization: Bearer token

{
  "role": "admin"
}
```

**Remove Member**
```bash
DELETE /teams/{teamId}/members/{memberId}
Authorization: Bearer token
```

### Resource Sharing

**Share Resource**
```bash
POST /teams/{teamId}/resources/share
Content-Type: application/json
Authorization: Bearer token

{
  "resourceId": "deployment-uuid",
  "resourceType": "deployment",  # deployment, credential, template, alert, log
  "permissions": ["read", "write"],
  "expiresAt": "2025-12-31T23:59:59Z"  # optional
}
```

**List Shared Resources**
```bash
GET /teams/{teamId}/resources
Authorization: Bearer token
```

**Update Permissions**
```bash
PUT /teams/{teamId}/resources/{resourceId}/permissions
Content-Type: application/json
Authorization: Bearer token

{
  "permissions": ["read"]
}
```

**Unshare Resource**
```bash
DELETE /teams/{teamId}/resources/{resourceId}
Authorization: Bearer token
```

## Cost Analysis API (10 endpoints)

### Cost Calculations

**Get Deployment Cost**
```bash
GET /cost/deployment/{deploymentId}
Authorization: Bearer token

# Response:
{
  "status": "success",
  "data": {
    "deploymentId": "uuid",
    "deploymentName": "Production",
    "cost": {
      "monthly": 482.15,
      "yearly": 5787.80,
      "breakdown": {
        "compute": 400.00,
        "storage": 60.15,
        "network": 22.00
      }
    }
  }
}
```

**Get All Deployment Costs**
```bash
GET /cost/deployments
Authorization: Bearer token

# Response:
{
  "status": "success",
  "data": {
    "deployments": [...],
    "summary": {
      "totalMonthlyCost": 2410.75,
      "totalYearlyCost": 28929.00
    }
  }
}
```

### Optimization Recommendations

**Get Opportunities**
```bash
GET /cost/deployment/{deploymentId}/opportunities
Authorization: Bearer token

# Response includes:
{
  "recommendations": [
    {
      "ruleId": "reserved-instances",
      "title": "Use Reserved Instances",
      "potentialSavings": 192.86,
      "priority": "high"
    }
  ],
  "estimatedSavings": 337.51
}
```

**Get All Opportunities**
```bash
GET /cost/opportunities
Authorization: Bearer token
```

### Trends & Reports

**Get Cost Trends**
```bash
GET /cost/trends/{deploymentId}?days=30
Authorization: Bearer token
```

**Compare Configurations**
```bash
POST /cost/compare
Content-Type: application/json
Authorization: Bearer token

{
  "configurations": [
    {"name": "Current", "provider": "AWS", "nodeType": "t3.large", "nodeCount": 3},
    {"name": "Optimized", "provider": "AWS", "nodeType": "t3.medium", "nodeCount": 4}
  ]
}
```

**Generate Report**
```bash
GET /cost/report
Authorization: Bearer token
```

**Export Costs (CSV)**
```bash
GET /cost/export
Authorization: Bearer token
```

**Set Budget Alert**
```bash
POST /cost/budget
Content-Type: application/json
Authorization: Bearer token

{
  "monthlyBudget": 3000,
  "alertThreshold": 0.8
}
```

**Get Provider Info**
```bash
GET /cost/providers
Authorization: Bearer token
```

## Deployments API (Core Endpoints)

### Deployment CRUD

**Create Deployment**
```bash
POST /deployments
Content-Type: application/json
Authorization: Bearer token

{
  "name": "Production EKS",
  "provider": "AWS",  # AWS, GCP, Azure
  "region": "us-east-1",
  "config": {
    "nodeCount": 3,
    "nodeType": "t3.medium",
    "kubernetesVersion": "1.27"
  }
}
```

**List Deployments**
```bash
GET /deployments?status=active&provider=AWS
Authorization: Bearer token
```

**Get Deployment Details**
```bash
GET /deployments/{deploymentId}
Authorization: Bearer token
```

**Update Deployment**
```bash
PUT /deployments/{deploymentId}
Content-Type: application/json
Authorization: Bearer token

{
  "config": {...}
}
```

**Delete Deployment**
```bash
DELETE /deployments/{deploymentId}
Authorization: Bearer token
```

### Deployment Operations

**Deploy Infrastructure**
```bash
POST /deployments/{deploymentId}/deploy
Authorization: Bearer token
```

**Destroy Infrastructure**
```bash
POST /deployments/{deploymentId}/destroy
Authorization: Bearer token
```

**Get Logs**
```bash
GET /deployments/{deploymentId}/logs?lines=100
Authorization: Bearer token
```

## Credentials API

### Credential Management

**Create Credential**
```bash
POST /credentials
Content-Type: application/json
Authorization: Bearer token

{
  "name": "AWS Production",
  "provider": "AWS",
  "credentials": {
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}

# Note: Credentials are encrypted with AES-256-GCM
```

**List Credentials**
```bash
GET /credentials
Authorization: Bearer token

# Response masks sensitive data
```

**Delete Credential**
```bash
DELETE /credentials/{credentialId}
Authorization: Bearer token
```

## Analytics API

### Metrics & Insights

**Get Metrics**
```bash
GET /analytics/metrics?deploymentId=uuid&timeRange=7d
Authorization: Bearer token

# Returns: CPU, memory, disk usage, network
```

**Get Trends**
```bash
GET /analytics/trends?deploymentId=uuid&metric=cpu
Authorization: Bearer token
```

**Get Performance**
```bash
GET /analytics/performance?deploymentId=uuid
Authorization: Bearer token
```

**Get Cost Analysis**
```bash
GET /analytics/cost?deploymentId=uuid&timeRange=30d
Authorization: Bearer token
```

**Export Analytics**
```bash
GET /analytics/export?deploymentId=uuid&format=csv
Authorization: Bearer token
```

**Get Predictions**
```bash
GET /analytics/predictions?deploymentId=uuid&metric=cpu
Authorization: Bearer token
```

## Alerts API

### Alert Management

**Create Alert Channel**
```bash
POST /alerts/channels
Content-Type: application/json
Authorization: Bearer token

{
  "type": "email",  # email, slack, webhook
  "name": "Production Alerts",
  "config": {
    "email": "ops@example.com"
  }
}
```

**Create Alert Rule**
```bash
POST /alerts/rules
Content-Type: application/json
Authorization: Bearer token

{
  "deploymentId": "uuid",
  "metric": "cpu",
  "operator": ">",  # >, <, =, >=, <=
  "threshold": 80,
  "channelId": "uuid",
  "enabled": true
}
```

**List Alert Rules**
```bash
GET /alerts/rules?deploymentId=uuid
Authorization: Bearer token
```

**Get Alert History**
```bash
GET /alerts/history?limit=50
Authorization: Bearer token
```

## Templates API

### Deployment Templates

**List Templates**
```bash
GET /templates?category=aws
Authorization: Bearer token

# Built-in: aws-starter, gcp-starter, azure-starter, production-ready
```

**Get Template Details**
```bash
GET /templates/{templateId}
Authorization: Bearer token
```

**Create Custom Template**
```bash
POST /templates
Content-Type: application/json
Authorization: Bearer token

{
  "name": "Custom Template",
  "description": "Custom deployment template",
  "provider": "AWS",
  "config": {...},
  "parameters": [...]
}
```

**Quick Deploy**
```bash
POST /templates/{templateId}/deploy
Content-Type: application/json
Authorization: Bearer token

{
  "deploymentName": "My Deployment",
  "parameters": {
    "nodeCount": 3,
    "region": "us-east-1"
  }
}
```

## Logs API

### Log Retrieval

**Get Logs**
```bash
GET /logs?deploymentId=uuid&limit=100&offset=0
Authorization: Bearer token
```

**Search Logs**
```bash
POST /logs/search
Content-Type: application/json
Authorization: Bearer token

{
  "deploymentId": "uuid",
  "query": "error",
  "startTime": "2025-01-01T00:00:00Z",
  "endTime": "2025-01-31T23:59:59Z",
  "limit": 50
}
```

**Export Logs**
```bash
GET /logs/export?deploymentId=uuid&format=json
Authorization: Bearer token
```

## Status API

**System Status**
```bash
GET /status
# No authentication required

# Response:
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "cache": "connected",
    "storage": "connected"
  }
}
```

**Health Check**
```bash
GET /health
# No authentication required

# Response:
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Clusters API

**Get Cluster Info**
```bash
GET /clusters/{deploymentId}
Authorization: Bearer token
```

**Get Nodes**
```bash
GET /clusters/{deploymentId}/nodes
Authorization: Bearer token
```

**Scale Cluster**
```bash
POST /clusters/{deploymentId}/scale
Content-Type: application/json
Authorization: Bearer token

{
  "nodeCount": 5
}
```

## Common Response Formats

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed",
  "data": {...}
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Description of error",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### Paginated Response
```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

## Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `sort` | string | Sort by field (e.g., `-createdAt`) |
| `filter` | string | Filter criteria |
| `search` | string | Search query |
| `startDate` | date | Start date (ISO format) |
| `endDate` | date | End date (ISO format) |

## Rate Limiting

- **API Tier**: 100 requests/minute
- **Premium Tier**: 1000 requests/minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Webhooks

### Alert Webhook
```bash
POST your-webhook-url
Content-Type: application/json
X-ZLAWS-Signature: sha256=...

{
  "event": "alert",
  "deploymentId": "uuid",
  "metric": "cpu",
  "value": 85,
  "threshold": 80,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Deployment Webhook
```bash
POST your-webhook-url
Content-Type: application/json
X-ZLAWS-Signature: sha256=...

{
  "event": "deployment:completed",
  "deploymentId": "uuid",
  "status": "success",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## SDK Examples

### JavaScript/Node.js
```javascript
const zlaws = require('@zlaws/sdk');

const client = new zlaws.Client({
  token: 'your-token',
  baseUrl: 'https://api.zlaws.com'
});

// Get deployment cost
const cost = await client.cost.getDeploymentCost('deployment-id');

// Create team
const team = await client.teams.create({
  name: 'DevOps',
  maxMembers: 20
});
```

### Python
```python
import zlaws

client = zlaws.Client(token='your-token')

# List deployments
deployments = client.deployments.list()

# Get optimization opportunities
opps = client.cost.get_opportunities()
```

## Troubleshooting

### 401 Unauthorized
- Token expired: Re-authenticate using login endpoint
- Token invalid: Verify token in Authorization header
- Token missing: Include `Authorization: Bearer token` header

### 403 Forbidden
- Insufficient permissions: Check user role or team membership
- Resource not shared: Owner must share resource first
- Team membership inactive: Accept pending invitation

### 500 Server Error
- Check service status: `GET /status`
- Review logs: Check application error logs
- Contact support: Provide request ID from `X-Request-ID` header

## Support

- **Documentation**: https://docs.zlaws.com
- **Status Page**: https://status.zlaws.com
- **Support Email**: support@zlaws.com
- **Slack Channel**: #zlaws-support
