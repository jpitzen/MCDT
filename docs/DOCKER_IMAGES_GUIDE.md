# ZLAWS Docker Images - Build & Deployment Guide

## Overview

This guide explains how to build, manage, and deploy ZLAWS Docker images with version control.

---

## Quick Start: Build All Images

### Windows PowerShell
```powershell
# 1. Navigate to project root
cd C:\Projects\ZLAWS\automated-eks-deployer

# 2. Build all images
./build-images.ps1

# 3. Expected output:
# ✓ Built successfully: zlaws-backend:v1
# ✓ Built successfully: zlaws-postgres:v1
# ✓ Built successfully: zlaws-nginx:v1
```

### Mac/Linux Bash
```bash
# 1. Navigate to project root
cd ~/projects/ZLAWS/automated-eks-deployer

# 2. Build all images
bash build-images.sh

# 3. Expected output:
# ✓ Built successfully: zlaws-backend:v1
# ✓ Built successfully: zlaws-postgres:v1
# ✓ Built successfully: zlaws-nginx:v1
```

---

## Docker Images Explained

### 1. zlaws-backend:v1
**Purpose**: Node.js/Express API server

**What's Inside**:
- Node.js 18 Alpine runtime
- Express.js framework
- 70+ REST API endpoints
- JWT authentication
- RBAC authorization
- AES-256-GCM encryption
- Socket.io WebSocket support
- Complete error handling

**Dockerfile**: `Dockerfile`

**Build Command**:
```bash
docker build -t zlaws-backend:v1 -f Dockerfile .
```

**Size**: ~300MB

**Health Check**: `GET /health` → 200 OK

---

### 2. zlaws-postgres:v1
**Purpose**: PostgreSQL database with ZLAWS schema

**What's Inside**:
- PostgreSQL 14 Alpine runtime
- PostgreSQL contrib extensions
- 9 pre-created tables:
  - users (user accounts)
  - teams (team groups)
  - team_members (team memberships)
  - shared_resources (shared deployments)
  - credentials (cloud credentials)
  - deployments (deployment configurations)
  - deployment_logs (deployment logs)
  - audit_logs (audit trail)
  - alert_channel_configs (alert configurations)
- Performance indexes on all key columns
- Default database: `zlaws_db`
- Default user: `zlaws_user`

**Dockerfile**: `postgres.Dockerfile`

**Build Command**:
```bash
docker build -t zlaws-postgres:v1 -f postgres.Dockerfile .
```

**Size**: ~80MB

**Database**: `zlaws_db`

**Username**: `zlaws_user`

**Password**: `ZLAWSSecurePass123!` (change in production)

---

### 3. zlaws-nginx:v1
**Purpose**: Reverse proxy with SSL/TLS termination

**What's Inside**:
- Nginx Alpine runtime
- SSL/TLS configuration
- HTTP → HTTPS redirect
- Self-signed certificate generation
- Rate limiting (10 req/s)
- WebSocket support
- Security headers (HSTS, X-Frame-Options, etc.)
- Gzip compression
- Reverse proxy to backend
- Health check endpoint

**Dockerfile**: `nginx.Dockerfile`

**Build Command**:
```bash
docker build -t zlaws-nginx:v1 -f nginx.Dockerfile .
```

**Size**: ~20MB

**Ports**:
- 80/tcp: HTTP (redirects to HTTPS)
- 443/tcp: HTTPS

**Endpoints**:
- `/health` - Health check
- `/nginx_status` - Nginx metrics (internal only)
- `/api/*` - Proxied to backend with rate limiting
- `/socket.io` - WebSocket proxy

---

## Building Individual Images

### Build Backend Only
```bash
docker build -t zlaws-backend:v1 -f Dockerfile .
```

### Build PostgreSQL Only
```bash
docker build -t zlaws-postgres:v1 -f postgres.Dockerfile .
```

### Build Nginx Only
```bash
docker build -t zlaws-nginx:v1 -f nginx.Dockerfile .
```

---

## Version Management

### Understanding Version Numbers

**Format**: `<image>:<major>.<minor>-<suffix>`

Examples:
- `zlaws-backend:v1` - Initial release
- `zlaws-backend:v1.1` - Patch/bug fix
- `zlaws-backend:v2` - Major version update
- `zlaws-backend:v1-rc1` - Release candidate

### When to Increment Versions

**Backend (zlaws-backend)**:
- `v1` → `v2`: New endpoints, breaking API changes, framework upgrade
- `v1` → `v1.1`: Bug fixes, performance improvements, security patches
- `v1-rc1`: Release candidate for testing

**Database (zlaws-postgres)**:
- `v1` → `v2`: Schema changes, new tables, migration scripts needed
- `v1` → `v1.1`: Index additions, performance tuning
- Include migration procedure for major versions

**Reverse Proxy (zlaws-nginx)**:
- `v1` → `v2`: Configuration changes, SSL cert rotation, new features
- `v1` → `v1.1`: Buffer adjustments, security patches
- Test rate limiting rules after update

### Update Procedure

**Step 1: Make Changes**
```bash
# Edit the component
vi backend/src/server.js          # or other component file
vi postgres.Dockerfile            # or other Dockerfile
vi nginx.Dockerfile               # or other config
```

**Step 2: Rebuild Image with New Version**
```bash
# Increment version appropriately
docker build -t zlaws-backend:v2 -f Dockerfile .
# or
docker build -t zlaws-postgres:v1.1 -f postgres.Dockerfile .
# or
docker build -t zlaws-nginx:v2 -f nginx.Dockerfile .
```

**Step 3: Tag with 'latest'** (optional, for development)
```bash
docker tag zlaws-backend:v2 zlaws-backend:latest
```

**Step 4: Update Kubernetes Manifest**
```yaml
# kubernetes/backend.yaml
image: zlaws-backend:v2  # Updated from v1
```

**Step 5: Deploy New Version**
```bash
kubectl set image deployment/zlaws-backend backend=zlaws-backend:v2 -n zlaws
```

**Step 6: Verify Deployment**
```bash
kubectl rollout status deployment/zlaws-backend -n zlaws
```

**Step 7: Update IMAGE_VERSION_TRACKER.md**
```markdown
#### zlaws-backend:v2
- **Status**: Updated
- **Date**: 2024-01-20
- **Changes**:
  - Added new endpoint: POST /api/users/bulk
  - Fixed authentication bug in JWT validation
  - Improved database query performance
```

---

## Listing Images

### View All ZLAWS Images
```bash
docker images | grep zlaws-
```

**Expected Output**:
```
REPOSITORY        TAG       IMAGE ID      CREATED        SIZE
zlaws-backend     v1        abc123def456  5 minutes ago   300MB
zlaws-backend     latest    abc123def456  5 minutes ago   300MB
zlaws-postgres    v1        ghi789jkl012  3 minutes ago   80MB
zlaws-postgres    latest    ghi789jkl012  3 minutes ago   80MB
zlaws-nginx       v1        mno345pqr678  2 minutes ago   20MB
zlaws-nginx       latest    mno345pqr678  2 minutes ago   20MB
```

### View Image Details
```bash
# Inspect image
docker inspect zlaws-backend:v1

# View image layers and history
docker history zlaws-backend:v1

# Get image size and creation date
docker images zlaws-backend:v1
```

---

## Using Images in Kubernetes

### Deployment Manifest Example
```yaml
# kubernetes/backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zlaws-backend
  namespace: zlaws
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: backend
        image: zlaws-backend:v1        # ← Specific version
        imagePullPolicy: Never          # ← Use local Minikube images
```

### Update Image in Running Deployment
```bash
# Update to new version
kubectl set image deployment/zlaws-backend \
  backend=zlaws-backend:v2 -n zlaws

# Watch rollout
kubectl rollout status deployment/zlaws-backend -n zlaws

# Rollback if needed
kubectl rollout undo deployment/zlaws-backend -n zlaws
```

---

## Saving and Loading Images

### Save Image to File
```bash
# Save single image
docker save zlaws-backend:v1 > zlaws-backend-v1.tar

# Save multiple images
docker save zlaws-backend:v1 zlaws-postgres:v1 zlaws-nginx:v1 > zlaws-all-v1.tar

# Compress to save space
docker save zlaws-backend:v1 | gzip > zlaws-backend-v1.tar.gz
```

### Load Image from File
```bash
# Load single image
docker load < zlaws-backend-v1.tar

# Load compressed image
gunzip -c zlaws-backend-v1.tar.gz | docker load

# Verify loaded image
docker images | grep zlaws-
```

---

## Pushing to Registry (Production)

### Prepare for Registry Push

**Step 1: Authenticate to Registry**
```bash
# Docker Hub
docker login
# Username: your_username
# Password: your_password

# Private registry
docker login registry.example.com
```

**Step 2: Tag for Registry**
```bash
# Format: registry/namespace/image:tag
docker tag zlaws-backend:v1 myregistry.azurecr.io/zlaws/backend:v1
docker tag zlaws-postgres:v1 myregistry.azurecr.io/zlaws/postgres:v1
docker tag zlaws-nginx:v1 myregistry.azurecr.io/zlaws/nginx:v1
```

**Step 3: Push Images**
```bash
docker push myregistry.azurecr.io/zlaws/backend:v1
docker push myregistry.azurecr.io/zlaws/postgres:v1
docker push myregistry.azurecr.io/zlaws/nginx:v1
```

**Step 4: Update Kubernetes Manifests**
```yaml
# kubernetes/backend.yaml
image: myregistry.azurecr.io/zlaws/backend:v1
imagePullPolicy: IfNotPresent
imagePullSecrets:
- name: registry-credentials
```

**Step 5: Create Pull Secrets** (if needed)
```bash
kubectl create secret docker-registry registry-credentials \
  --docker-server=myregistry.azurecr.io \
  --docker-username=username \
  --docker-password=password \
  -n zlaws
```

---

## Image Optimization

### Reduce Image Size

**For Backend**:
```dockerfile
# Use multi-stage build
FROM node:18-alpine AS builder
# Build app
FROM node:18-alpine
# Copy only production files
```

**For PostgreSQL**:
```dockerfile
# Use alpine base (already minimal)
# Remove unnecessary utilities
```

**For Nginx**:
```dockerfile
# Use nginx:alpine (minimal)
# Remove debug modules
```

### Build with BuildKit (Faster Builds)
```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1

# Build with caching
docker build --cache-from zlaws-backend:v1 -t zlaws-backend:v2 .
```

---

## Troubleshooting

### Image Build Failed

**Problem**: Build fails with "Command not found"
```bash
# Solution: Run build from project root
cd /path/to/ZLAWS/automated-eks-deployer
docker build -t zlaws-backend:v1 -f Dockerfile .
```

**Problem**: "No such file or directory" error
```bash
# Solution: Check Dockerfile path
ls -la Dockerfile            # Verify file exists
docker build -t zlaws-backend:v1 .
```

### Image Not Found in Minikube

**Problem**: `ImagePullBackOff` in Minikube
```bash
# Solution: Build in Minikube's Docker context
eval $(minikube docker-env)
docker build -t zlaws-backend:v1 .
```

**Verify**: Images built in Minikube context
```bash
minikube ssh docker images | grep zlaws-
```

### Image Push Failed

**Problem**: "unauthorized" error
```bash
# Solution: Login to registry first
docker login registry.example.com
docker push registry.example.com/zlaws/backend:v1
```

---

## Complete Workflow Example

### Scenario: Update backend with new feature (v1 → v2)

**Step 1: Make Code Changes**
```bash
# Edit backend code
vi backend/src/routes/teams.js
# ... add new endpoint ...
```

**Step 2: Build New Image**
```bash
# Increment version
docker build -t zlaws-backend:v2 -f Dockerfile .
```

**Step 3: Tag for convenience**
```bash
docker tag zlaws-backend:v2 zlaws-backend:latest
```

**Step 4: Verify Image**
```bash
docker images | grep zlaws-backend
docker history zlaws-backend:v2
```

**Step 5: Update Manifest**
```yaml
# kubernetes/backend.yaml
- image: zlaws-backend:v2  # changed from v1
```

**Step 6: Deploy to Kubernetes**
```bash
kubectl apply -f kubernetes/backend.yaml
# or
kubectl set image deployment/zlaws-backend backend=zlaws-backend:v2 -n zlaws
```

**Step 7: Monitor Rollout**
```bash
kubectl rollout status deployment/zlaws-backend -n zlaws
kubectl get pods -n zlaws
```

**Step 8: Test New Version**
```bash
kubectl port-forward svc/zlaws-backend 8080:80 -n zlaws
curl http://localhost:8080/api/new-endpoint
```

**Step 9: Document Changes**
```markdown
# IMAGE_VERSION_TRACKER.md

#### zlaws-backend:v2
- **Status**: Deployed
- **Date**: 2024-01-20
- **Changes**:
  - Added POST /api/teams/:id/batch-invite endpoint
  - Fixed race condition in team member deletion
  - Improved JWT token refresh performance
```

---

## Image Management Best Practices

1. **Always Use Explicit Versions**: Use `v1`, `v2` instead of `latest`
2. **Document Changes**: Update `IMAGE_VERSION_TRACKER.md` after each build
3. **Test Before Deploy**: Verify images locally before pushing to registry
4. **Keep Minimal Layers**: Minimize Docker build steps for smaller images
5. **Use Alpine Base**: Reduces image size significantly
6. **Single Responsibility**: One component per image
7. **Version Everything**: Track all image changes and deployments
8. **Automate Versioning**: Use CI/CD for automatic image building and tagging

---

## Summary

- **3 images**: Backend (v1), Database (v1), Nginx (v1)
- **Build script**: `./build-images.ps1` (Windows) or `bash build-images.sh` (Mac/Linux)
- **Total size**: ~400MB (all images)
- **Version tracking**: See `IMAGE_VERSION_TRACKER.md`
- **Deployment**: Updated manifests use specific image versions
- **Status**: ✅ All v1 images ready for Minikube deployment

---

**Last Updated**: 2024-01-15
**Status**: ✅ Complete
