# ZLAWS Minikube Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the ZLAWS application to a local Minikube Kubernetes cluster.

## Prerequisites

- Docker Desktop or Docker Engine (with Minikube)
- Minikube installed (`brew install minikube` on macOS, `choco install minikube` on Windows)
- kubectl installed (`brew install kubectl` on macOS, `choco install kubernetes-cli` on Windows)
- 4GB+ RAM available for Minikube
- 20GB+ disk space for container images and persistent storage

## Quick Start

### 1. Start Minikube

```bash
# Start Minikube with sufficient resources
minikube start --cpus=4 --memory=4096 --disk-size=20G

# Verify Minikube is running
minikube status

# Get Minikube IP (useful for debugging)
minikube ip
```

### 2. Deploy ZLAWS

```bash
# Navigate to the project directory
cd /path/to/ZLAWS

# Run the deployment script
bash deploy-to-minikube.sh

# Or manually apply manifests:
# 1. Set Docker environment
eval $(minikube docker-env)

# 2. Build the image
docker build -t zlaws:latest .

# 3. Apply Kubernetes manifests (in order)
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/postgres.yaml
kubectl apply -f kubernetes/backend-config.yaml
kubectl apply -f kubernetes/backend.yaml
```

### 3. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n zlaws

# Check services
kubectl get svc -n zlaws

# View detailed pod information
kubectl describe pod -n zlaws

# Watch pod startup in real-time
kubectl get pods -n zlaws -w
```

## Accessing the Application

### Method 1: Port Forwarding (Recommended for development)

```bash
# Forward backend service to local port 8080
kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws

# Access in browser or curl
curl http://localhost:8080/health
```

### Method 2: Minikube IP (If service LoadBalancer is assigned)

```bash
# Get Minikube IP
MINIKUBE_IP=$(minikube ip)

# Get service port
kubectl get svc zlaws-backend -n zlaws -o jsonpath='{.spec.ports[0].nodePort}'

# Access with IP:NodePort
curl http://$MINIKUBE_IP:NodePort/health
```

## Testing Endpoints

After port forwarding, test the API endpoints:

```bash
# Health check
curl http://localhost:8080/health

# List users (requires authentication for protected routes)
curl -X GET http://localhost:8080/api/users

# Create a user
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"TestPass123!","email":"test@example.com"}'

# Get deployment analytics
curl -X GET http://localhost:8080/api/analytics/deployments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get cost analysis
curl -X GET http://localhost:8080/api/cost/analysis \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test team endpoints
curl -X POST http://localhost:8080/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"Team-A","description":"Development Team"}'
```

## Monitoring and Debugging

### View Logs

```bash
# View backend logs
kubectl logs -f deployment/zlaws-backend -n zlaws

# View PostgreSQL logs
kubectl logs -f statefulset/postgres -n zlaws

# View logs for specific pod
kubectl logs -f pod/zlaws-backend-XXXXX -n zlaws
```

### Interact with Pods

```bash
# Execute commands in backend pod
kubectl exec -it deployment/zlaws-backend -n zlaws -- /bin/sh

# Connect to PostgreSQL
kubectl exec -it statefulset/postgres -n zlaws -- psql -U zlaws_user -d zlaws_db

# View environment variables
kubectl exec deployment/zlaws-backend -n zlaws -- env | grep ZLAWS
```

### Pod Status

```bash
# Get detailed pod information
kubectl describe pod POD_NAME -n zlaws

# Check pod events
kubectl get events -n zlaws --sort-by='.lastTimestamp'

# Get resource usage
kubectl top pods -n zlaws
```

## Database Management

### Connecting to PostgreSQL

```bash
# Connect directly via kubectl
kubectl exec -it statefulset/postgres -n zlaws -- psql -U zlaws_user -d zlaws_db

# Common PostgreSQL commands
\dt                    # List tables
\d table_name         # Describe table
SELECT * FROM users;  # Query data
```

### Database Backup

```bash
# Backup the database
kubectl exec statefulset/postgres -n zlaws -- \
  pg_dump -U zlaws_user zlaws_db > backup.sql

# Restore from backup
kubectl exec -i statefulset/postgres -n zlaws -- \
  psql -U zlaws_user zlaws_db < backup.sql
```

## Scaling and Updates

### Scale Backend

```bash
# Scale to 3 replicas
kubectl scale deployment zlaws-backend --replicas=3 -n zlaws

# Verify scaling
kubectl get pods -n zlaws
```

### Rolling Update

```bash
# Update image
kubectl set image deployment/zlaws-backend backend=zlaws:v2.0 -n zlaws

# Monitor rollout
kubectl rollout status deployment/zlaws-backend -n zlaws

# Rollback if needed
kubectl rollout undo deployment/zlaws-backend -n zlaws
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod POD_NAME -n zlaws

# Common issues:
# - CrashLoopBackOff: Check logs with kubectl logs
# - ImagePullBackOff: Image not built or wrong name
# - Pending: Insufficient resources or persistent volume issues
```

### Database Connection Issues

```bash
# Test PostgreSQL connectivity from backend pod
kubectl exec -it deployment/zlaws-backend -n zlaws -- \
  nc -zv postgres 5432

# Check environment variables
kubectl exec deployment/zlaws-backend -n zlaws -- env | grep DB
```

### Service Not Accessible

```bash
# Check service configuration
kubectl get svc zlaws-backend -n zlaws -o yaml

# Check endpoints
kubectl get endpoints zlaws-backend -n zlaws

# Test service DNS from within cluster
kubectl exec -it deployment/zlaws-backend -n zlaws -- \
  nslookup zlaws-backend
```

### Persistent Volume Issues

```bash
# Check persistent volumes
kubectl get pv
kubectl get pvc -n zlaws

# Describe PVC for issues
kubectl describe pvc postgres-pvc -n zlaws

# Check actual storage location on Minikube
minikube ssh
ls -la /data/postgres
```

## Cleanup

### Stop Deployment

```bash
# Delete all resources in zlaws namespace
kubectl delete namespace zlaws

# This will remove:
# - All deployments
# - All services
# - All persistent volume claims
# - All secrets and config maps
```

### Stop Minikube

```bash
minikube stop

# To also delete Minikube cluster (warning: removes all data)
minikube delete
```

## Performance Tuning

### Resource Limits

Edit `kubernetes/backend.yaml` and `kubernetes/postgres.yaml` to adjust:

```yaml
resources:
  requests:
    memory: "256Mi"    # Minimum guaranteed
    cpu: "250m"        # 1/4 CPU
  limits:
    memory: "512Mi"    # Maximum allowed
    cpu: "500m"        # 1/2 CPU
```

### Minikube Resources

```bash
# Allocate more resources to Minikube
minikube start --cpus=8 --memory=8192 --disk-size=50G

# Check current allocation
minikube config view
```

## Production Considerations

**Note**: This Minikube setup is for development/testing only. For production:

1. Use AWS EKS, Google GKE, or Azure AKS
2. Implement proper RBAC policies
3. Use managed PostgreSQL services (RDS, Cloud SQL, Azure Database)
4. Set up proper networking and security groups
5. Implement automated backups
6. Use secret management services (AWS Secrets Manager, Azure Key Vault)
7. Configure monitoring and alerting (Prometheus, Grafana, CloudWatch)
8. Implement log aggregation (ELK, Splunk, CloudWatch Logs)
9. Set up auto-scaling and load balancing
10. Use container registry (Docker Hub, ECR, GCR, ACR)

## Additional Resources

- Kubernetes Documentation: https://kubernetes.io/docs/
- Minikube Documentation: https://minikube.sigs.k8s.io/
- kubectl Cheat Sheet: https://kubernetes.io/docs/reference/kubectl/cheatsheet/
- PostgreSQL on Kubernetes: https://kubernetes.io/docs/tasks/run-application/run-stateful-application/

## Support

For issues or questions:
1. Check the logs: `kubectl logs`
2. Describe resources: `kubectl describe`
3. Check events: `kubectl get events`
4. Review this guide's troubleshooting section
