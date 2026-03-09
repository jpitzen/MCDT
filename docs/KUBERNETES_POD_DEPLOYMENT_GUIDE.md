# Kubernetes Pod Deployment Guide - ZLAWS EKS Deployer

## Overview

This guide explains how to deploy the ZLAWS EKS Deployer backend API server to run in Kubernetes pods on Minikube, AWS EKS, or any Kubernetes cluster.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster (Minikube/EKS)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              zlaws Namespace                                │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                             │   │
│  │  ┌──────────────────┐  ┌──────────────────┐               │   │
│  │  │  Backend Pod 1   │  │  Backend Pod 2   │               │   │
│  │  │  (zlaws-backend) │  │  (zlaws-backend) │               │   │
│  │  │                  │  │                  │               │   │
│  │  │ :5000            │  │ :5000            │               │   │
│  │  └──────────────────┘  └──────────────────┘               │   │
│  │         ▲                      ▲                           │   │
│  │         │                      │                           │   │
│  │         └──────────┬───────────┘                           │   │
│  │                    │                                       │   │
│  │         ┌──────────▼──────────┐                            │   │
│  │         │  Service            │                            │   │
│  │         │  (LoadBalancer)     │                            │   │
│  │         │  :80, :443          │                            │   │
│  │         └─────────────────────┘                            │   │
│  │                    │                                       │   │
│  │  ┌────────────────────────────────┐                        │   │
│  │  │  PostgreSQL StatefulSet        │                        │   │
│  │  │  (eks_deployer_dev)            │                        │   │
│  │  │  :5432                         │                        │   │
│  │  └────────────────────────────────┘                        │   │
│  │                                                             │   │
│  │  ┌────────────────────────────────┐                        │   │
│  │  │  Nginx Reverse Proxy           │                        │   │
│  │  │  (SSL/TLS Termination)         │                        │   │
│  │  │  :443                          │                        │   │
│  │  └────────────────────────────────┘                        │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

        ↓

┌─────────────────────────────────────────────────────────────────────┐
│              External Services (AWS, Local, etc.)                    │
├─────────────────────────────────────────────────────────────────────┤
│  • AWS EKS API                                                      │
│  • AWS Secrets Manager / Vault                                      │
│  • AWS IAM                                                          │
│  • AWS CloudWatch                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before deploying to Kubernetes pods, ensure you have:

1. **Docker:** Installed and running
   ```bash
   docker --version  # v20.10+
   ```

2. **Minikube:** Installed and running (for local development)
   ```bash
   minikube status
   minikube start  # if not running
   ```

3. **kubectl:** Installed and configured
   ```bash
   kubectl version --client
   kubectl config current-context  # should show minikube or your cluster
   ```

4. **Backend API Code:** Built and ready
   ```bash
   cd backend
   npm install
   ```

## Deployment Steps

### Step 1: Build Docker Image

The Docker image contains the Node.js backend application with all dependencies.

```bash
# Navigate to project root
cd /path/to/zlaws

# Build the Docker image
docker build -t zlaws-backend:v1 -f Dockerfile .

# Verify image
docker images | grep zlaws-backend
```

**What's in the image:**
- Node.js 18 Alpine
- Express.js API server
- All npm dependencies (595 packages)
- Environment configuration
- Health check endpoint
- Non-root user for security

### Step 2: Make Image Available to Minikube

For Minikube development, push the image to Minikube's Docker daemon:

```bash
# Set Minikube Docker environment
eval $(minikube docker-env)  # On Mac/Linux
# OR
minikube docker-env --shell powershell | Out-String | Invoke-Expression  # On Windows PowerShell

# Rebuild in Minikube environment
docker build -t zlaws-backend:v1 -f Dockerfile .

# Verify
docker images | grep zlaws-backend
```

**For Production (Docker Hub/Registry):**
```bash
# Tag for Docker Hub
docker tag zlaws-backend:v1 your-docker-username/zlaws-backend:v1

# Push to registry
docker push your-docker-username/zlaws-backend:v1

# Update kubernetes/backend.yaml to use your registry
```

### Step 3: Create Kubernetes Namespace

```bash
# Create namespace for ZLAWS resources
kubectl create namespace zlaws

# Verify
kubectl get namespaces | grep zlaws
```

### Step 4: Deploy Configuration and Secrets

Before deploying pods, configure secrets and config maps:

```bash
# Apply ConfigMap and Secrets
kubectl apply -f kubernetes/backend-config.yaml -n zlaws

# Verify
kubectl get configmap,secrets -n zlaws
```

**ConfigMap contents:**
- Database connection settings
- Environment variables
- API configuration
- Feature flags

**Secrets contents:**
- JWT secret key
- Database password
- Encryption keys
- AWS credentials

### Step 5: Deploy Backend Pods

Using the deployment script (recommended):

```bash
# Deploy backend pods to Kubernetes
./deploy-backend-pods.ps1 -Action deploy

# Or using kubectl directly
kubectl apply -f kubernetes/backend.yaml -n zlaws
```

**What gets created:**
- Deployment: zlaws-backend (manages pods)
- Pods: 2 replicas by default
- Service: LoadBalancer (exposes pods)
- ConfigMap: Environment configuration
- Secrets: Sensitive data

### Step 6: Verify Deployment

```bash
# Check deployment status
kubectl get deployments -n zlaws
kubectl get pods -n zlaws
kubectl get services -n zlaws

# Get more details
kubectl describe deployment zlaws-backend -n zlaws
kubectl describe pod zlaws-backend-xxxxx -n zlaws  # replace xxxxx with pod ID

# Check logs
kubectl logs -n zlaws deployment/zlaws-backend

# Watch logs in real-time
kubectl logs -f -n zlaws deployment/zlaws-backend
```

## Pod Management

### Start Pods

```bash
# Using deployment script
./deploy-backend-pods.ps1 -Action start

# Or scale to desired replicas
kubectl scale deployment zlaws-backend -n zlaws --replicas=2
```

### Stop Pods

```bash
# Using deployment script (graceful shutdown)
./deploy-backend-pods.ps1 -Action stop

# Or scale to zero
kubectl scale deployment zlaws-backend -n zlaws --replicas=0
```

### View Logs

```bash
# Using deployment script
./deploy-backend-pods.ps1 -Action logs

# Or view specific pod
kubectl logs -n zlaws <pod-name>

# View last 100 lines
kubectl logs -n zlaws deployment/zlaws-backend --tail=100

# Stream logs in real-time
kubectl logs -f -n zlaws deployment/zlaws-backend
```

### Open Pod Shell

```bash
# Using deployment script
./deploy-backend-pods.ps1 -Action shell

# Or directly
kubectl exec -it -n zlaws <pod-name> -- /bin/sh

# Run a command in pod
kubectl exec -n zlaws <pod-name> -- npm run verify-db
```

### Scale Deployment

```bash
# Using deployment script
./deploy-backend-pods.ps1 -Action scale -Replicas 5

# Or directly
kubectl scale deployment zlaws-backend -n zlaws --replicas=5

# Autoscale based on CPU
kubectl autoscale deployment zlaws-backend --min=2 --max=10 --cpu-percent=80 -n zlaws
```

### Rollback Deployment

```bash
# Using deployment script
./deploy-backend-pods.ps1 -Action rollback

# Or view rollout history
kubectl rollout history deployment/zlaws-backend -n zlaws

# Rollback to previous version
kubectl rollout undo deployment/zlaws-backend -n zlaws

# Rollback to specific revision
kubectl rollout undo deployment/zlaws-backend -n zlaws --to-revision=2
```

## Access Pod Services

### From Local Machine (Port Forwarding)

```bash
# Forward local port to pod
kubectl port-forward -n zlaws service/zlaws-backend 8080:80

# Then access from browser or curl
curl http://localhost:8080/health

# In another terminal
curl -X GET http://localhost:8080/api/users \
  -H "Authorization: Bearer <jwt-token>"
```

### From Inside Cluster

```bash
# Use service DNS name
curl http://zlaws-backend.zlaws.svc.cluster.local/health

# From another pod
kubectl exec -it -n zlaws <other-pod> -- \
  curl http://zlaws-backend/health
```

### Minikube Service Access

```bash
# Get service IP and port
minikube service zlaws-backend -n zlaws

# Or directly
minikube service list -n zlaws
```

## Pod Resource Management

### Set Resource Limits

Edit `kubernetes/backend.yaml`:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Then apply:
```bash
kubectl apply -f kubernetes/backend.yaml -n zlaws
```

### Check Resource Usage

```bash
# View pod resource usage
kubectl top pods -n zlaws

# View node resource usage
kubectl top nodes

# Watch pod metrics
watch kubectl top pods -n zlaws
```

## Health Checks

### Readiness Probe

Checks if pod is ready to receive traffic:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Liveness Probe

Checks if pod should be restarted:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Check Probe Status

```bash
# View probe status in describe output
kubectl describe pod -n zlaws <pod-name>

# Look for "Ready" and "Restart Count"
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n zlaws -o wide

# Check pod events
kubectl describe pod -n zlaws <pod-name>

# Check pod logs
kubectl logs -n zlaws <pod-name>

# Check events
kubectl get events -n zlaws --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Verify PostgreSQL pod is running
kubectl get pods -n zlaws -l app=postgres

# Check database logs
kubectl logs -n zlaws pod/zlaws-postgres-0

# Test connection from backend pod
kubectl exec -n zlaws <backend-pod> -- \
  psql -h zlaws-postgres-headless -U postgres -d eks_deployer_dev -c "SELECT 1"
```

### Out of Memory (OOMKilled)

```bash
# Check resource limits
kubectl get pods -n zlaws -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources}{"\n"}{end}'

# Increase limits in backend.yaml and reapply
# Then check usage
kubectl top pods -n zlaws
```

### Image Pull Failed

```bash
# Check image exists locally (Minikube)
eval $(minikube docker-env)
docker images | grep zlaws-backend

# For registry: verify credentials
kubectl get secrets -n zlaws

# Check image pull events
kubectl describe pod -n zlaws <pod-name> | grep -i image
```

## Kubernetes Manifest Structure

The deployment uses these manifests:

### 1. Namespace (`kubernetes/namespace.yaml`)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: zlaws
```

### 2. ConfigMap & Secrets (`kubernetes/backend-config.yaml`)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zlaws-backend-config
  namespace: zlaws
data:
  DB_HOST: zlaws-postgres-headless
  DB_PORT: "5432"
  DB_NAME: eks_deployer_dev
  NODE_ENV: production
---
apiVersion: v1
kind: Secret
metadata:
  name: zlaws-backend-secrets
  namespace: zlaws
type: Opaque
stringData:
  DB_USER: postgres
  DB_PASSWORD: <password>
  JWT_SECRET: <jwt-secret>
  ENCRYPTION_KEY: <encryption-key>
```

### 3. Deployment (`kubernetes/backend.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zlaws-backend
  namespace: zlaws
spec:
  replicas: 2
  selector:
    matchLabels:
      app: zlaws-backend
  template:
    metadata:
      labels:
        app: zlaws-backend
    spec:
      containers:
      - name: backend
        image: zlaws-backend:v1
        imagePullPolicy: Never  # For Minikube local images
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - configMapRef:
            name: zlaws-backend-config
        - secretRef:
            name: zlaws-backend-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: zlaws-backend
  namespace: zlaws
spec:
  type: LoadBalancer
  selector:
    app: zlaws-backend
  ports:
  - name: http
    port: 80
    targetPort: 5000
  - name: https
    port: 443
    targetPort: 5000
```

## Production Deployment (AWS EKS)

For production EKS deployment:

1. **Push image to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   
   docker tag zlaws-backend:v1 <account-id>.dkr.ecr.us-east-1.amazonaws.com/zlaws-backend:v1
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/zlaws-backend:v1
   ```

2. **Update manifests:**
   - Change `imagePullPolicy` to `IfNotPresent`
   - Update image URL to ECR registry
   - Add image pull secrets if using private registry
   - Increase resource requests/limits
   - Add HPA for autoscaling

3. **Deploy to EKS:**
   ```bash
   kubectl apply -f kubernetes/ --namespace=zlaws
   kubectl wait --for=condition=ready pod -l app=zlaws-backend -n zlaws --timeout=120s
   ```

## Next Steps

1. Deploy backend pods: `./deploy-backend-pods.ps1 -Action deploy`
2. Verify pods running: `kubectl get pods -n zlaws`
3. Access service: `kubectl port-forward -n zlaws svc/zlaws-backend 8080:80`
4. Test endpoint: `curl http://localhost:8080/health`
5. View logs: `./deploy-backend-pods.ps1 -Action logs`
6. Scale replicas: `./deploy-backend-pods.ps1 -Action scale -Replicas 5`

---

**Status:** ✓ Ready for pod-based deployment in Kubernetes

