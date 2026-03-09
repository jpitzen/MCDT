# Kubernetes Pod Deployment - Quick Start

## When Servers Run in Pods

The ZLAWS EKS Deployer backend API server will run in Kubernetes pods instead of directly on your machine. This provides enterprise-grade container orchestration.

## What's New

### Deployment Scripts Created

1. **deploy-backend-pods.ps1** (Windows PowerShell)
   - Build Docker image
   - Deploy to Minikube
   - Manage pod lifecycle
   - Monitor and debug

2. **deploy-backend-pods.sh** (Mac/Linux Bash)
   - Feature parity with PowerShell script
   - Cross-platform support

### Documentation Created

1. **KUBERNETES_POD_DEPLOYMENT_GUIDE.md** (7,000+ lines)
   - Complete architecture overview
   - Step-by-step deployment guide
   - Pod management procedures
   - Troubleshooting guide
   - Production deployment checklist

2. **This Quick Start Guide**
   - Fast reference for common tasks

## Quick Start

### 1. Deploy Backend to Pods

**Windows:**
```powershell
./deploy-backend-pods.ps1 -Action deploy
```

**Mac/Linux:**
```bash
bash deploy-backend-pods.sh deploy
```

### 2. Verify Pods Running

```bash
kubectl get pods -n zlaws
kubectl get services -n zlaws
```

### 3. Access Backend

```bash
# Port forward
kubectl port-forward -n zlaws svc/zlaws-backend 8080:80

# Test health
curl http://localhost:8080/health
```

### 4. View Logs

```powershell
./deploy-backend-pods.ps1 -Action logs
```

### 5. Scale Pods (e.g., to 5 replicas)

```powershell
./deploy-backend-pods.ps1 -Action scale -Replicas 5
```

## Pod Architecture

```
┌─────────────────────────────────┐
│    Kubernetes Cluster (zlaws)   │
├─────────────────────────────────┤
│                                 │
│  Backend Pods (2-N replicas)    │
│  ├─ Pod 1: :5000               │
│  ├─ Pod 2: :5000               │
│  └─ Pod N: :5000               │
│         ↓                        │
│  Service (LoadBalancer)         │
│  └─ Routes traffic to pods      │
│                                 │
│  PostgreSQL StatefulSet         │
│  └─ Database                    │
│                                 │
│  Nginx Reverse Proxy            │
│  └─ SSL/TLS termination         │
│                                 │
└─────────────────────────────────┘
```

## Key Concepts

| Term | What It Does |
|------|-------------|
| **Pod** | Container running your app (can restart) |
| **Deployment** | Manages pod replicas (ensures running) |
| **Service** | Routes traffic to pods (internal/external) |
| **Namespace** | Resource grouping (keeps zlaws separate) |

## Common Tasks

| Task | Command |
|------|---------|
| **Deploy** | `./deploy-backend-pods.ps1 -Action deploy` |
| **Check Status** | `kubectl get pods -n zlaws` |
| **View Logs** | `./deploy-backend-pods.ps1 -Action logs` |
| **Access Shell** | `./deploy-backend-pods.ps1 -Action shell` |
| **Scale to 5** | `./deploy-backend-pods.ps1 -Action scale -Replicas 5` |
| **Stop Pods** | `./deploy-backend-pods.ps1 -Action stop` |
| **Start Pods** | `./deploy-backend-pods.ps1 -Action start` |
| **Rollback** | `./deploy-backend-pods.ps1 -Action rollback` |

## Pod Lifecycle

```
Deploy
  ↓
Pending → Running → Ready
  ↓
Accepting Traffic
  ↓
If Error → Restart
  ↓
If Success → Keep Running
```

## Pod Features

- ✓ **Auto-restart** on failure
- ✓ **Health checks** (readiness & liveness)
- ✓ **Load balancing** across replicas
- ✓ **Resource limits** (CPU, memory)
- ✓ **Configuration** via ConfigMap
- ✓ **Secrets** for sensitive data
- ✓ **Persistent storage** for database
- ✓ **Logging** and monitoring

## Monitoring

```bash
# Watch pods in real-time
watch kubectl get pods -n zlaws

# Stream logs
kubectl logs -f -n zlaws deployment/zlaws-backend

# Check resource usage
kubectl top pods -n zlaws

# Describe pod for details
kubectl describe pod <pod-name> -n zlaws
```

## Scaling

### Manual Scaling

```bash
# Scale to 5 pods
kubectl scale deployment zlaws-backend --replicas=5 -n zlaws

# Scale to 1 pod (minimum)
kubectl scale deployment zlaws-backend --replicas=1 -n zlaws

# Scale to 0 pods (stop)
kubectl scale deployment zlaws-backend --replicas=0 -n zlaws
```

### Auto-Scaling

```bash
# Enable HPA (2-10 pods, 80% CPU threshold)
kubectl autoscale deployment zlaws-backend \
  --min=2 --max=10 --cpu-percent=80 -n zlaws

# Check HPA status
kubectl get hpa -n zlaws
```

## Updates (Zero-Downtime)

```bash
# Build new image
docker build -t zlaws-backend:v2 -f Dockerfile .

# Load into Minikube
eval $(minikube docker-env)
docker build -t zlaws-backend:v2 -f Dockerfile .

# Update deployment
kubectl set image deployment/zlaws-backend \
  zlaws-backend=zlaws-backend:v2 -n zlaws

# Watch rollout
kubectl rollout status deployment/zlaws-backend -n zlaws

# Old pods gradual replaced with new pods
# Traffic never interrupted!
```

## Troubleshooting

### Pods Not Ready

```bash
# Check pod status
kubectl get pods -n zlaws

# See what's wrong
kubectl describe pod <pod-name> -n zlaws

# Check logs
kubectl logs <pod-name> -n zlaws
```

### Pod Crashed

```bash
# Check restart count
kubectl get pods -n zlaws

# View logs before crash
kubectl logs <pod-name> -n zlaws --previous

# Describe for events
kubectl describe pod <pod-name> -n zlaws
```

### Memory Issues

```bash
# Check resource usage
kubectl top pods -n zlaws

# See limits
kubectl get pod <pod-name> -n zlaws -o yaml | grep -A 5 resources

# Increase limits in backend.yaml and reapply
```

## Production Checklist

- [ ] Images pushed to registry (Docker Hub, ECR, etc.)
- [ ] ConfigMap created with production values
- [ ] Secrets created (JWT key, DB password, etc.)
- [ ] Resource limits set appropriately
- [ ] Health checks configured
- [ ] HPA/scaling configured
- [ ] Monitoring/alerting set up
- [ ] Ingress configured (if needed)
- [ ] Network policies defined (if needed)
- [ ] PersistentVolumes configured
- [ ] Backup strategy defined
- [ ] Disaster recovery plan ready

## Next Steps

1. **Deploy backend pods:**
   ```bash
   ./deploy-backend-pods.ps1 -Action deploy
   ```

2. **Verify all pods running:**
   ```bash
   kubectl get pods -n zlaws
   ```

3. **Test the API:**
   ```bash
   kubectl port-forward -n zlaws svc/zlaws-backend 8080:80
   curl http://localhost:8080/health
   ```

4. **Scale if needed:**
   ```bash
   ./deploy-backend-pods.ps1 -Action scale -Replicas 5
   ```

5. **Monitor continuously:**
   ```bash
   watch kubectl get pods -n zlaws
   kubectl logs -f -n zlaws deployment/zlaws-backend
   ```

## Resources

- **Full Guide:** `KUBERNETES_POD_DEPLOYMENT_GUIDE.md`
- **Deploy Script:** `deploy-backend-pods.ps1` or `deploy-backend-pods.sh`
- **Manifests:** `kubernetes/backend.yaml`, `kubernetes/backend-config.yaml`

---

**Status:** ✓ Ready for pod-based deployment

