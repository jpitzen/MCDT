# ZLAWS Docker Image Version Tracker

## Image Versions (v1 - Initial Release)

### Backend Images

#### zlaws-backend:v1
- **Status**: Initial release
- **Base**: Node.js 18 Alpine
- **Contents**:
  - Express.js API server
  - 70+ REST endpoints
  - JWT authentication
  - RBAC authorization
  - AES-256-GCM encryption
  - Socket.io WebSocket support
- **Size**: ~300MB
- **Date**: 2024-01-15
- **Build Command**: `docker build -t zlaws-backend:v1 -f Dockerfile .`
- **Changes**:
  - Initial implementation of core API

#### zlaws-backend:latest
- **Alias**: Points to zlaws-backend:v1
- **Use**: For convenient development access

---

### Database Images

#### zlaws-postgres:v1
- **Status**: Initial release
- **Base**: PostgreSQL 14 Alpine
- **Contents**:
  - ZLAWS database schema (9 tables)
  - Initialization scripts
  - Performance indexes
  - Default user setup
  - contrib extensions
- **Size**: ~80MB
- **Date**: 2024-01-15
- **Build Command**: `docker build -t zlaws-postgres:v1 -f postgres.Dockerfile .`
- **Schema Tables**:
  - users (200k capacity)
  - teams (50k capacity)
  - team_members (200k capacity)
  - shared_resources (100k capacity)
  - credentials (10k capacity)
  - deployments (50k capacity)
  - deployment_logs (1M capacity)
  - audit_logs (500k capacity)
  - alert_channel_configs (1k capacity)
- **Changes**:
  - Initial schema creation
  - Index creation for performance
  - Permissions setup

#### zlaws-postgres:latest
- **Alias**: Points to zlaws-postgres:v1
- **Use**: For convenient development access

---

### Reverse Proxy Images

#### zlaws-nginx:v1
- **Status**: Initial release
- **Base**: Nginx Alpine
- **Contents**:
  - SSL/TLS termination
  - Reverse proxy to backend
  - Rate limiting (10 req/s)
  - WebSocket support
  - Security headers
  - Gzip compression
  - Health check endpoints
- **Size**: ~20MB
- **Date**: 2024-01-15
- **Build Command**: `docker build -t zlaws-nginx:v1 -f nginx.Dockerfile .`
- **Features**:
  - HTTP redirect to HTTPS
  - Self-signed certificate generation
  - HSTS header for security
  - X-Frame-Options, X-Content-Type-Options
  - Rate limiting per IP
  - Logging and monitoring
  - WebSocket upgrade support
- **Ports**:
  - 80/tcp (HTTP, redirects to HTTPS)
  - 443/tcp (HTTPS)
- **Changes**:
  - Initial reverse proxy configuration

#### zlaws-nginx:latest
- **Alias**: Points to zlaws-nginx:v1
- **Use**: For convenient development access

---

## Version Control Strategy

### Version Incrementing Rules

**Backend (zlaws-backend)**:
- `v1` → `v2`: Major API changes, new endpoints, framework updates
- `v1.0` → `v1.1`: Bug fixes, security patches
- `v1.0-rc1`: Release candidate

**Database (zlaws-postgres)**:
- `v1` → `v2`: Schema changes, new tables, migration scripts
- `v1.0` → `v1.1`: Index additions, performance optimization
- Include migration scripts for version updates

**Reverse Proxy (zlaws-nginx)**:
- `v1` → `v2`: Config changes, new features, SSL cert rotation
- `v1.0` → `v1.1`: Security patches, buffer adjustments

### Update Procedure

1. **Identify changed component**:
   ```bash
   # Edit component (backend, postgres, nginx)
   vi backend/src/server.js  # or other file
   ```

2. **Determine version change**:
   - Major changes: v1 → v2
   - Minor changes: v1.0 → v1.1

3. **Rebuild image**:
   ```bash
   docker build -t zlaws-component:v2 -f component.Dockerfile .
   ```

4. **Tag with latest**:
   ```bash
   docker tag zlaws-component:v2 zlaws-component:latest
   ```

5. **Update Kubernetes manifests**:
   - Edit `kubernetes/backend.yaml` (or other manifest)
   - Change `image: zlaws-component:v1` → `image: zlaws-component:v2`

6. **Document change** (in this file):
   ```markdown
   #### zlaws-component:v2
   - **Status**: Updated
   - **Changes**:
     - Specific change 1
     - Specific change 2
   ```

7. **Deploy**:
   ```bash
   kubectl set image deployment/zlaws-backend backend=zlaws-backend:v2 -n zlaws
   ```

---

## Image Building

### Build All Images
```bash
# Windows
./build-images.ps1

# Mac/Linux
bash build-images.sh
```

### Build Individual Image
```bash
docker build -t zlaws-backend:v1 -f Dockerfile .
docker build -t zlaws-postgres:v1 -f postgres.Dockerfile .
docker build -t zlaws-nginx:v1 -f nginx.Dockerfile .
```

### List All Images
```bash
docker images | grep zlaws-
```

### Inspect Image
```bash
docker inspect zlaws-backend:v1
docker history zlaws-backend:v1
```

---

## Image Deployment

### Using Latest Tag (Development)
```yaml
# kubernetes/backend.yaml
containers:
- name: backend
  image: zlaws-backend:latest  # Auto-uses v1
```

### Using Specific Version (Recommended)
```yaml
# kubernetes/backend.yaml
containers:
- name: backend
  image: zlaws-backend:v1  # Explicit version
```

### Pull Policy
```yaml
# kubernetes/backend.yaml
imagePullPolicy: Never  # Use local Minikube images
```

---

## Image Persistence

### Save Images for Sharing
```bash
# Save to tar file
docker save zlaws-backend:v1 > zlaws-backend-v1.tar

# Load from tar file
docker load < zlaws-backend-v1.tar
```

### Push to Registry (Production)
```bash
# Tag for registry
docker tag zlaws-backend:v1 registry.example.com/zlaws/backend:v1

# Push
docker push registry.example.com/zlaws/backend:v1
```

---

## Total Package Information

| Image | Version | Size | Base | Status |
|-------|---------|------|------|--------|
| zlaws-backend | v1 | ~300MB | Node.js 18 Alpine | ✅ Ready |
| zlaws-postgres | v1 | ~80MB | PostgreSQL 14 Alpine | ✅ Ready |
| zlaws-nginx | v1 | ~20MB | Nginx Alpine | ✅ Ready |
| **Total** | **v1** | **~400MB** | **Alpine base** | **✅ Ready** |

---

## Changelog

### 2024-01-15 (v1 - Initial Release)
- **zlaws-backend:v1** - Initial API implementation with 70+ endpoints
- **zlaws-postgres:v1** - Initial database schema with 9 tables
- **zlaws-nginx:v1** - Initial reverse proxy with SSL/TLS termination
- **Status**: All images built and ready for Minikube deployment

---

## Next Steps

1. Build images: `./build-images.ps1` (Windows) or `bash build-images.sh` (Mac/Linux)
2. Verify images: `docker images | grep zlaws-`
3. Deploy: `./deploy-to-minikube.ps1` (Windows) or `bash deploy-to-minikube.sh` (Mac/Linux)
4. Track changes and increment versions as components evolve

---

**Image Package Status**: ✅ Complete v1 Release Ready
**Last Updated**: 2024-01-15
**Total Images**: 3 (Backend, Database, Reverse Proxy)
