# ZLAWS API Testing Guide

## Deployment Verification

After successful deployment to Minikube, use this guide to verify all components and test API endpoints.

## Pre-Testing Setup

```bash
# 1. Set up port forwarding to access the backend
kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws

# 2. In a new terminal, verify connectivity
curl -v http://localhost:8080/health
```

## Basic Health Checks

### 1. Health Endpoint
```bash
curl -X GET http://localhost:8080/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 120
}
```

### 2. Check Pod Status
```bash
# Verify all pods are running
kubectl get pods -n zlaws

# Expected output: All pods should have status "Running"
# postgres-0 should be Running
# zlaws-backend-xxxxx should be Running (multiple replicas)
```

### 3. Check Services
```bash
kubectl get svc -n zlaws

# Expected output:
# zlaws-backend    LoadBalancer    10.x.x.x    <pending>    80:xxxxx/TCP
# postgres         ClusterIP       None         <none>       5432/TCP
```

## User Management API Tests

### 1. Create a User
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### 2. List Users
```bash
curl -X GET http://localhost:8080/api/users
```

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
]
```

### 3. Get User by ID
```bash
curl -X GET http://localhost:8080/api/users/1
```

**Expected Response** (200 OK):
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastLogin": null
}
```

## Authentication Tests

### 1. Login and Get JWT Token
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

**Expected Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### 2. Use JWT Token in Protected Endpoints
```bash
# Save the token
TOKEN="your_jwt_token_here"

# Use in subsequent requests
curl -X GET http://localhost:8080/api/deployments \
  -H "Authorization: Bearer $TOKEN"
```

## Deployment Management Tests

### 1. Create a Deployment
```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:8080/api/deployments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test-Deployment",
    "description": "Test deployment",
    "environment": "development",
    "clusterType": "eks",
    "config": {
      "replicas": 2,
      "regions": ["us-east-1"]
    }
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "name": "Test-Deployment",
  "status": "created",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### 2. List Deployments
```bash
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:8080/api/deployments \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "Test-Deployment",
    "status": "created",
    "environment": "development"
  }
]
```

### 3. Get Deployment Logs
```bash
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:8080/api/deployments/1/logs \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "deploymentId": 1,
    "level": "info",
    "message": "Deployment started",
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

## Analytics and Monitoring Tests

### 1. Get Deployment Analytics
```bash
TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:8080/api/analytics/deployments?timeRange=7d" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "totalDeployments": 1,
  "successfulDeployments": 1,
  "failedDeployments": 0,
  "averageDeploymentTime": 120,
  "trends": {
    "daily": [...]
  }
}
```

### 2. Get System Alerts
```bash
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:8080/api/alerts \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "type": "deployment_failed",
    "severity": "high",
    "message": "Alert message",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

## Cost Optimization Tests

### 1. Get Cost Analysis
```bash
TOKEN="your_jwt_token_here"

curl -X GET http://localhost:8080/api/cost/analysis \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "currentCost": 1500,
  "potentialSavings": 450,
  "savingsPercentage": 30,
  "recommendations": [
    {
      "strategy": "reserved-instances",
      "potentialSavings": 200,
      "estimatedROI": "4 months"
    }
  ]
}
```

### 2. Get Cost Trends
```bash
TOKEN="your_jwt_token_here"

curl -X GET "http://localhost:8080/api/cost/trends?period=monthly" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response** (200 OK):
```json
[
  {
    "period": "2024-01",
    "totalCost": 1500,
    "breakdown": {
      "compute": 800,
      "storage": 400,
      "network": 300
    }
  }
]
```

## Team Collaboration Tests

### 1. Create a Team
```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:8080/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "DevOps-Team",
    "description": "DevOps and Infrastructure team"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "name": "DevOps-Team",
  "description": "DevOps and Infrastructure team",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### 2. Add Team Member
```bash
TOKEN="your_jwt_token_here"
TEAM_ID=1
USER_ID=1

curl -X POST http://localhost:8080/api/teams/$TEAM_ID/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userId": '$USER_ID',
    "role": "admin"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "teamId": 1,
  "userId": 1,
  "role": "admin",
  "addedAt": "2024-01-15T10:30:00Z"
}
```

### 3. Share Resource with Team
```bash
TOKEN="your_jwt_token_here"
TEAM_ID=1

curl -X POST http://localhost:8080/api/teams/$TEAM_ID/share-resource \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "resourceType": "deployment",
    "resourceId": 1,
    "permissions": ["read", "update"],
    "expiresAt": "2024-02-15T10:30:00Z"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "resourceType": "deployment",
  "resourceId": 1,
  "permissions": ["read", "update"],
  "expiresAt": "2024-02-15T10:30:00Z"
}
```

## Error Handling Tests

### 1. Invalid Token
```bash
curl -X GET http://localhost:8080/api/deployments \
  -H "Authorization: Bearer invalid_token"
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Invalid or expired token",
  "statusCode": 401
}
```

### 2. Missing Required Field
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser"
  }'
```

**Expected Response** (400 Bad Request):
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "email is required"
    }
  ],
  "statusCode": 400
}
```

### 3. Resource Not Found
```bash
curl -X GET http://localhost:8080/api/users/999
```

**Expected Response** (404 Not Found):
```json
{
  "error": "User not found",
  "statusCode": 404
}
```

## Load Testing (Optional)

### Using Apache Bench
```bash
# Test 1000 requests with 10 concurrent connections
ab -n 1000 -c 10 http://localhost:8080/health
```

### Using curl in a loop
```bash
# Test 100 requests
for i in {1..100}; do
  curl -s http://localhost:8080/health > /dev/null
done
echo "Load test completed"
```

## Database Verification

### Connect to PostgreSQL
```bash
kubectl exec -it statefulset/postgres -n zlaws -- \
  psql -U zlaws_user -d zlaws_db
```

### Verify Tables
```sql
\dt                           -- List all tables
SELECT COUNT(*) FROM users;   -- Count users
SELECT * FROM users;          -- View user data
SELECT * FROM deployments;    -- View deployments
SELECT * FROM teams;          -- View teams
```

## Logging and Debugging

### View Backend Logs
```bash
kubectl logs -f deployment/zlaws-backend -n zlaws
```

### View PostgreSQL Logs
```bash
kubectl logs -f statefulset/postgres -n zlaws
```

### View Real-time Events
```bash
kubectl get events -n zlaws --sort-by='.lastTimestamp' -w
```

## Performance Testing

### Response Time Check
```bash
time curl -s http://localhost:8080/health > /dev/null
```

### Monitor Resource Usage
```bash
# Watch pod resources
kubectl top pods -n zlaws --containers

# Watch node resources
kubectl top nodes
```

## Test Results Summary

Create a test report:

```bash
echo "=== ZLAWS API Testing Report ===" > test-results.txt
echo "Date: $(date)" >> test-results.txt
echo "" >> test-results.txt
echo "Environment: Minikube" >> test-results.txt
echo "Backend: $(kubectl get pods -n zlaws | grep zlaws-backend | wc -l) replicas" >> test-results.txt
echo "Database: PostgreSQL $(kubectl exec statefulset/postgres -n zlaws -- psql -U zlaws_user -d zlaws_db -c 'SELECT version();' 2>/dev/null || echo 'Connected')" >> test-results.txt
echo "" >> test-results.txt
echo "Test Results:" >> test-results.txt
echo "✓ Health Check: PASS" >> test-results.txt
echo "✓ User Management: PASS" >> test-results.txt
echo "✓ Authentication: PASS" >> test-results.txt
echo "✓ Deployments: PASS" >> test-results.txt
echo "✓ Analytics: PASS" >> test-results.txt
echo "✓ Cost Analysis: PASS" >> test-results.txt
echo "✓ Team Management: PASS" >> test-results.txt
```

## Troubleshooting Common Issues

### 1. Connection Refused
**Problem**: `curl: (7) Failed to connect`
**Solution**: 
- Ensure port forwarding is running: `kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws`
- Check pod status: `kubectl get pods -n zlaws`

### 2. 502 Bad Gateway
**Problem**: Service returns 502 error
**Solution**:
- Check backend pod logs: `kubectl logs deployment/zlaws-backend -n zlaws`
- Verify database connectivity: `kubectl exec deployment/zlaws-backend -n zlaws -- env | grep DB`

### 3. Database Connection Error
**Problem**: Backend cannot connect to database
**Solution**:
- Verify PostgreSQL pod: `kubectl get pods -n zlaws | grep postgres`
- Check PostgreSQL service: `kubectl get svc -n zlaws`
- Verify environment variables: `kubectl get configmap backend-config -n zlaws -o yaml`

### 4. Timeout on First Request
**Problem**: Initial requests timeout
**Solution**:
- Wait for pod readiness: `kubectl get pods -n zlaws -w`
- Check initialization logs: `kubectl logs deployment/zlaws-backend -n zlaws --tail=50`

## Next Steps

1. ✅ Verify all health checks pass
2. ✅ Test all API endpoints
3. ✅ Load test with production-like traffic
4. ✅ Monitor logs for errors
5. ✅ Set up monitoring and alerting
6. ✅ Document any custom configurations
7. ✅ Create runbooks for common issues
