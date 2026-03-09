# Quick Reference Guide

Fast lookup for common tasks and commands.

## Starting the Application

### Docker Compose (Recommended)
```bash
cd automated-eks-deployer
docker-compose up -d
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# Vault: http://localhost:8200
```

### Local Development
```bash
# Terminal 1 - Backend
cd backend && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm start
```

## API Endpoints

### Authentication
```bash
POST   /api/auth/login
GET    /api/auth/profile
POST   /api/auth/logout
```

### Credentials Management
```bash
POST   /api/credentials
GET    /api/credentials
GET    /api/credentials/:id
DELETE /api/credentials/:id
POST   /api/credentials/:id/validate
PUT    /api/credentials/:id/rotate
```

### Deployments
```bash
POST   /api/deployments
GET    /api/deployments
GET    /api/deployments/:id
GET    /api/deployments/:id/logs
POST   /api/deployments/:id/pause
POST   /api/deployments/:id/resume
POST   /api/deployments/:id/rollback
DELETE /api/deployments/:id
```

### Clusters
```bash
GET    /api/clusters
GET    /api/clusters/:id
GET    /api/clusters/:id/status
DELETE /api/clusters/:id
```

### System Status
```bash
GET    /api/status
GET    /api/status/services
```

## Environment Setup

### Create .env File
```bash
cp .env.example .env
# Edit .env with your values
```

### Database
```bash
# Create database
createdb eks_deployer

# Run migrations
npm run migrate --prefix backend

# Seed data
npm run seed --prefix backend
```

## Docker Compose Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Remove all data
docker-compose down -v

# Rebuild images
docker-compose up -d --build
```

## Kubernetes Commands

```bash
# Create namespace
kubectl create namespace eks-deployer

# Apply manifests
kubectl apply -f kubernetes/

# View pods
kubectl get pods -n eks-deployer

# View logs
kubectl logs -f deployment/eks-deployer-backend -n eks-deployer

# Port forward
kubectl port-forward svc/eks-deployer-backend 5000:5000 -n eks-deployer
```

## AWS CLI Commands

### Check Identity
```bash
aws sts get-caller-identity
```

### List EKS Clusters
```bash
aws eks list-clusters --region us-east-1
```

### Get Cluster Info
```bash
aws eks describe-cluster --name <cluster-name> --region us-east-1
```

### Update kubeconfig
```bash
aws eks update-kubeconfig --name <cluster-name> --region us-east-1
```

### Create IAM Role
```bash
aws iam create-role --role-name <role-name> \
  --assume-role-policy-document file://trust-policy.json
```

## Curl Examples

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### Add Credentials
```bash
curl -X POST http://localhost:5000/api/credentials \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "prod",
    "accessKeyId": "AKIA...",
    "secretAccessKey": "secret",
    "region": "us-east-1"
  }'
```

### Start Deployment
```bash
curl -X POST http://localhost:5000/api/deployments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "credentialId": "cred-1",
    "clusterName": "prod-cluster",
    "region": "us-east-1",
    "nodeType": "t3.medium",
    "minNodes": 2,
    "maxNodes": 10
  }'
```

### Get Deployment Status
```bash
curl http://localhost:5000/api/deployments/<id> \
  -H "Authorization: Bearer <token>"
```

## Debugging

### Check Backend Logs
```bash
docker-compose logs backend | tail -50
```

### Check Database Connection
```bash
docker-compose exec postgres psql -U eks_user -d eks_deployer
```

### Check Vault Status
```bash
curl http://localhost:8200/v1/sys/health
```

### View Frontend Console
Open http://localhost:3000 and press F12 (Developer Tools)

## Testing

### Backend Tests
```bash
npm test --prefix backend
npm test --prefix backend -- --watch
npm test --prefix backend -- --coverage
```

### Frontend Tests
```bash
npm test --prefix frontend
npm test --prefix frontend -- --watch
```

## Build & Deployment

### Build Frontend
```bash
npm run build --prefix frontend
```

### Build Backend
```bash
# Using Docker
docker build -t eks-deployer-backend ./backend

# Using npm
npm install --prefix backend --production
```

### Push to Docker Registry
```bash
docker tag eks-deployer-backend myregistry/eks-deployer-backend:1.0.0
docker push myregistry/eks-deployer-backend:1.0.0
```

## Useful Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `PROJECT_SUMMARY.md` | What's been delivered |
| `.env.example` | Environment configuration template |
| `docker-compose.yml` | Local development stack |
| `docs/API_SPEC.md` | REST API documentation |
| `docs/DEPLOYMENT_GUIDE.md` | How to deploy |
| `docs/SECURITY.md` | Security practices |
| `scripts/deploy-orchestrator.sh` | Main deployment script |

## Common Issues & Solutions

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database exists
docker-compose exec postgres psql -U eks_user -l
```

### Frontend can't reach Backend
```bash
# Check backend is running
curl http://localhost:5000/health

# Check CORS configuration
# Edit .env CORS_ORIGIN if needed
```

### Docker network issues
```bash
# List networks
docker network ls

# Remove unused networks
docker network prune

# Recreate services
docker-compose down -v
docker-compose up -d
```

## Development Workflow

### 1. Start Services
```bash
docker-compose up -d
```

### 2. Create Feature Branch
```bash
git checkout -b feature/my-feature
```

### 3. Make Changes
- Edit frontend components
- Edit backend routes
- Edit scripts

### 4. Test Locally
```bash
npm test
npm run lint
```

### 5. Commit & Push
```bash
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

### 6. Create Pull Request
- Submit PR on GitHub
- Request review
- Merge after approval

## Performance Tips

### Database
```bash
# Add indexes
CREATE INDEX idx_deployments_status ON deployments(status);

# Run VACUUM
VACUUM ANALYZE;
```

### Node.js
```bash
# Increase memory limit
NODE_OPTIONS=--max-old-space-size=4096 npm start

# Enable clustering
NODE_CLUSTER_WORKERS=4 npm start
```

### Frontend
```bash
# Build for production
npm run build --prefix frontend

# Analyze bundle size
npm install -g source-map-explorer
source-map-explorer 'build/static/js/*.js'
```

## Security Quick Check

- [ ] AWS credentials in vault
- [ ] HTTPS/TLS enabled
- [ ] JWT tokens enabled
- [ ] CORS configured properly
- [ ] Rate limiting active
- [ ] Audit logging enabled
- [ ] Database encrypted
- [ ] Backups automated
- [ ] Access keys rotated
- [ ] Security headers set

## Useful Links

- AWS EKS Documentation: https://docs.aws.amazon.com/eks/
- Kubernetes Docs: https://kubernetes.io/docs/
- Node.js Docs: https://nodejs.org/docs/
- React Docs: https://react.dev/
- Material-UI Docs: https://mui.com/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Vault Docs: https://www.vaultproject.io/docs

## Getting Help

1. Check documentation: `docs/`
2. Check troubleshooting: `docs/TROUBLESHOOTING.md`
3. Check logs: `docker-compose logs`
4. Check GitHub issues
5. Ask the team

## Quick Deployment Checklist

- [ ] Configure .env file
- [ ] Start Docker services
- [ ] Run database migrations
- [ ] Access http://localhost:3000
- [ ] Login with credentials
- [ ] Add AWS credentials
- [ ] Start test deployment
- [ ] Monitor in dashboard
- [ ] Check logs for errors
- [ ] Verify cluster created
