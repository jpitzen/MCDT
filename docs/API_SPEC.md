# API Specification

EKS Deployer Backend API Documentation

## Base URL

```
http://localhost:5000/api
```

## Authentication

All endpoints (except `/auth/login`) require JWT authentication via Bearer token:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /auth/login

User login and token generation.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "Administrator",
    "role": "admin"
  }
}
```

### POST /auth/logout

User logout and token invalidation.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### GET /auth/profile

Get current user profile.

**Response (200):**
```json
{
  "user": {
    "id": "1",
    "email": "user@example.com",
    "name": "Administrator",
    "role": "admin"
  }
}
```

---

## Credentials Endpoints

### POST /credentials

Add new AWS credentials.

**Request:**
```json
{
  "name": "prod-cluster",
  "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "region": "us-east-1",
  "description": "Production cluster credentials"
}
```

**Response (201):**
```json
{
  "message": "Credentials added successfully",
  "credential": {
    "id": "cred-abc123",
    "name": "prod-cluster",
    "region": "us-east-1",
    "description": "Production cluster credentials",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastRotated": "2024-01-15T10:30:00Z"
  }
}
```

### GET /credentials

List all stored credentials.

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "credentials": [
    {
      "id": "cred-abc123",
      "name": "prod-cluster",
      "region": "us-east-1",
      "description": "Production cluster credentials",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastRotated": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### GET /credentials/:id

Get specific credential details (without sensitive data).

**Response (200):**
```json
{
  "credential": {
    "id": "cred-abc123",
    "name": "prod-cluster",
    "region": "us-east-1",
    "description": "Production cluster credentials"
  }
}
```

### DELETE /credentials/:id

Remove stored credentials.

**Response (200):**
```json
{
  "message": "Credentials deleted successfully"
}
```

### POST /credentials/:id/validate

Validate AWS credentials by testing connection.

**Response (200):**
```json
{
  "valid": true,
  "message": "Credentials are valid",
  "awsAccount": "123456789012",
  "awsUser": "arn:aws:iam::123456789012:user/deployer"
}
```

### PUT /credentials/:id/rotate

Rotate AWS access keys.

**Response (200):**
```json
{
  "message": "Credentials rotated successfully",
  "credential": {
    "id": "cred-abc123",
    "lastRotated": "2024-01-15T10:30:00Z",
    "nextRotationDue": "2024-04-15T10:30:00Z"
  }
}
```

---

## Deployments Endpoints

### POST /deployments

Start new EKS deployment.

**Request:**
```json
{
  "credentialId": "cred-abc123",
  "clusterName": "prod-cluster-1",
  "region": "us-east-1",
  "kubernetesVersion": "1.30",
  "nodeType": "t3.medium",
  "minNodes": 2,
  "maxNodes": 10,
  "config": {
    "rdsEnabled": true,
    "efsEnabled": true,
    "s3Enabled": true,
    "autoscalingEnabled": true
  }
}
```

**Response (202):**
```json
{
  "deploymentId": "dep-xyz789",
  "message": "Deployment started",
  "status": "PENDING",
  "createdAt": "2024-01-15T10:30:00Z",
  "estimatedDuration": "45-60 minutes"
}
```

### GET /deployments

List all deployments.

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- `clusterName` (optional): Filter by cluster name
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "deployments": [
    {
      "deploymentId": "dep-xyz789",
      "clusterName": "prod-cluster-1",
      "region": "us-east-1",
      "status": "COMPLETED",
      "progress": 100,
      "createdAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T12:30:00Z",
      "duration": "2 hours"
    }
  ],
  "total": 10,
  "limit": 20,
  "offset": 0
}
```

### GET /deployments/:id

Get deployment details and progress.

**Response (200):**
```json
{
  "deploymentId": "dep-xyz789",
  "clusterName": "prod-cluster-1",
  "region": "us-east-1",
  "status": "IN_PROGRESS",
  "progress": 65,
  "currentPhase": {
    "phase": 5,
    "name": "Setup EBS CSI Driver",
    "status": "IN_PROGRESS",
    "startedAt": "2024-01-15T10:45:00Z"
  },
  "phases": [
    {
      "phase": 1,
      "name": "Install Tools",
      "status": "COMPLETED",
      "duration": "5 minutes"
    },
    {
      "phase": 2,
      "name": "Create EKS Cluster",
      "status": "COMPLETED",
      "duration": "15 minutes"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "estimatedCompletion": "2024-01-15T11:45:00Z"
}
```

### GET /deployments/:id/logs

Stream deployment logs.

**Query Parameters:**
- `phase` (optional): Filter logs by phase number
- `tail` (optional): Return last N lines (default: 100)

**Response (200):**
```json
{
  "deploymentId": "dep-xyz789",
  "phase": "5",
  "logs": [
    {
      "timestamp": "2024-01-15T10:45:00Z",
      "level": "INFO",
      "message": "Phase 5: Setting up EBS CSI Driver"
    },
    {
      "timestamp": "2024-01-15T10:45:15Z",
      "level": "INFO",
      "message": "Creating IAM policy for EBS CSI Driver"
    }
  ],
  "totalLines": 156
}
```

### POST /deployments/:id/pause

Pause ongoing deployment.

**Response (200):**
```json
{
  "deploymentId": "dep-xyz789",
  "message": "Deployment paused",
  "status": "PAUSED"
}
```

### POST /deployments/:id/resume

Resume paused deployment.

**Response (200):**
```json
{
  "deploymentId": "dep-xyz789",
  "message": "Deployment resumed",
  "status": "IN_PROGRESS"
}
```

### POST /deployments/:id/rollback

Rollback failed deployment.

**Request:**
```json
{
  "phases": [5, 6, 7]
}
```

**Response (202):**
```json
{
  "deploymentId": "dep-xyz789",
  "message": "Rollback initiated",
  "status": "ROLLING_BACK"
}
```

### DELETE /deployments/:id

Delete/cancel deployment.

**Query Parameters:**
- `cascade` (optional): Also delete associated resources (default: false)

**Response (200):**
```json
{
  "message": "Deployment deleted successfully"
}
```

---

## Clusters Endpoints

### GET /clusters

List all EKS clusters.

**Response (200):**
```json
{
  "clusters": [
    {
      "clusterId": "cls-abc123",
      "name": "prod-cluster-1",
      "region": "us-east-1",
      "status": "ACTIVE",
      "kubernetesVersion": "1.30",
      "nodeGroups": 3,
      "totalNodes": 9,
      "createdAt": "2024-01-08T10:30:00Z"
    }
  ]
}
```

### GET /clusters/:id

Get cluster details.

**Response (200):**
```json
{
  "cluster": {
    "clusterId": "cls-abc123",
    "name": "prod-cluster-1",
    "region": "us-east-1",
    "status": "ACTIVE",
    "kubernetesVersion": "1.30",
    "endpoint": "https://api.eks.amazonaws.com",
    "vpc": { "vpcId": "vpc-12345678" },
    "nodeGroups": [
      {
        "name": "standard-workers",
        "status": "ACTIVE",
        "desiredSize": 3,
        "currentSize": 3,
        "minSize": 2,
        "maxSize": 10,
        "instanceType": "t3.medium"
      }
    ],
    "createdAt": "2024-01-08T10:30:00Z",
    "resources": {
      "ebs": { "count": 3, "totalSize": "150Gi" },
      "efs": { "count": 1 },
      "rds": { "count": 1 }
    }
  }
}
```

### GET /clusters/:id/status

Get real-time cluster status.

**Response (200):**
```json
{
  "clusterId": "cls-abc123",
  "status": "ACTIVE",
  "nodeHealth": {
    "ready": 9,
    "notReady": 0,
    "unknown": 0
  },
  "podHealth": {
    "running": 45,
    "pending": 2,
    "failed": 0
  },
  "resources": {
    "cpu": {
      "allocated": "6000m",
      "available": "12000m",
      "percentage": 50
    },
    "memory": {
      "allocated": "24Gi",
      "available": "48Gi",
      "percentage": 50
    }
  },
  "lastUpdate": "2024-01-15T10:30:00Z"
}
```

### DELETE /clusters/:id

Delete/destroy cluster.

**Response (202):**
```json
{
  "message": "Cluster deletion initiated",
  "clusterId": "cls-abc123"
}
```

---

## Status Endpoints

### GET /status

Get overall system status.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "aws": "connected",
    "vault": "connected"
  },
  "deployments": {
    "active": 1,
    "pending": 2,
    "completed": 15,
    "failed": 1
  },
  "clusters": {
    "total": 3,
    "active": 3,
    "inactive": 0,
    "totalNodes": 27
  }
}
```

### GET /status/services

Get service health details.

**Response (200):**
```json
{
  "services": [
    { "name": "Database", "status": "healthy", "latency": "2ms" },
    { "name": "AWS SDK", "status": "healthy", "latency": "150ms" },
    { "name": "Vault", "status": "healthy", "latency": "50ms" },
    { "name": "Deployment Engine", "status": "healthy" }
  ]
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "errors": [
    {
      "msg": "Cluster name is required",
      "param": "clusterName",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "error": {
    "status": 401,
    "message": "Unauthorized",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 404 Not Found

```json
{
  "error": {
    "status": 404,
    "message": "Deployment not found",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 500 Internal Server Error

```json
{
  "error": {
    "status": 500,
    "message": "Internal Server Error",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Rate Limiting

- Default: 100 requests per minute per IP
- Authentication endpoints: 10 requests per minute

---

## WebSocket Events (Real-time Updates)

Connect to `ws://localhost:5000/ws` for real-time deployment updates:

```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

// Deployment progress update
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle: deployment progress, logs, status changes
};
```
