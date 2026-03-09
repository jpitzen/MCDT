# Deployment Guide

Complete guide to deploying the AWS EKS Deployment Platform.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Production Deployment](#production-deployment)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- PostgreSQL 14+
- Docker & Docker Compose (optional)
- AWS CLI configured with credentials
- Git

### Installation Steps

1. **Clone the repository**

```bash
cd c:\Projects\ZLAWS
git clone https://github.com/your-repo/automated-eks-deployer.git
cd automated-eks-deployer
```

2. **Create environment files**

**backend/.env**
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/eks_deployer
JWT_SECRET=your-development-secret-key
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=myroot
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
```

**frontend/.env**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_LOG_LEVEL=info
```

3. **Setup PostgreSQL**

```bash
# Create database
createdb eks_deployer

# Run migrations
npm run migrate --prefix backend
```

4. **Install dependencies**

```bash
# Backend
npm install --prefix backend

# Frontend
npm install --prefix frontend
```

5. **Start development servers**

**Terminal 1 - Backend:**
```bash
npm run dev --prefix backend
```

**Terminal 2 - Frontend:**
```bash
npm start --prefix frontend
```

6. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

---

## Docker Deployment

### Using Docker Compose

1. **Create `.env` file**

```bash
cp .env.example .env
# Edit .env with your configuration
```

2. **Build and start services**

```bash
docker-compose up -d
```

3. **Run migrations**

```bash
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

4. **Access services**

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Vault: http://localhost:8200
- pgAdmin: http://localhost:5050
  - Email: admin@example.com
  - Password: admin

### Docker Compose Commands

```bash
# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build

# Remove all data
docker-compose down -v
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- Helm 3.x
- Docker images pushed to registry

### Deployment Steps

1. **Create namespace**

```bash
kubectl create namespace eks-deployer
```

2. **Create secrets**

```bash
kubectl create secret generic eks-deployer-secrets \
  --from-literal=db-password=your-postgres-password \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=aws-access-key-id=your-aws-key \
  --from-literal=aws-secret-access-key=your-aws-secret \
  -n eks-deployer
```

3. **Deploy PostgreSQL (optional - use managed database in production)**

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm install postgres bitnami/postgresql \
  --namespace eks-deployer \
  -f kubernetes/helm-values-postgres.yaml
```

4. **Deploy application**

```bash
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
```

5. **Verify deployment**

```bash
kubectl get pods -n eks-deployer
kubectl logs -f deployment/eks-deployer-backend -n eks-deployer
```

6. **Access the application**

```bash
# Port forward for development
kubectl port-forward svc/eks-deployer-frontend 3000:3000 -n eks-deployer
kubectl port-forward svc/eks-deployer-backend 5000:5000 -n eks-deployer

# Or use Ingress for production
kubectl get ingress -n eks-deployer
```

---

## Production Deployment

### Architecture

```
Load Balancer
    ↓
[Frontend]  [Backend API]
    ↓           ↓
   S3      RDS PostgreSQL
               ↓
         HashiCorp Vault
```

### Pre-deployment Checklist

- [ ] AWS account with appropriate IAM permissions
- [ ] Production domain name
- [ ] SSL/TLS certificates
- [ ] AWS RDS PostgreSQL instance
- [ ] AWS Secrets Manager configured
- [ ] CloudWatch and monitoring setup
- [ ] Backup strategy defined
- [ ] Disaster recovery plan

### Deployment on AWS EKS

1. **Create EKS cluster** (using the platform itself!)

```bash
# Use the deployment wizard through the UI
# Or manually create: aws eks create-cluster ...
```

2. **Configure Secrets Manager**

```bash
aws secretsmanager create-secret \
  --name eks-deployer/prod \
  --secret-string file://secrets.json \
  --region us-east-1
```

3. **Setup IAM roles**

```bash
# Create service account with appropriate permissions
kubectl create serviceaccount eks-deployer -n eks-deployer
# Bind role with necessary permissions
```

4. **Deploy via Helm**

```bash
helm install eks-deployer ./helm-chart \
  --namespace eks-deployer \
  --values helm-values-prod.yaml \
  --set image.tag=production
```

5. **Configure ALB Ingress**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: eks-deployer-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
  - host: deployer.example.com
    http:
      paths:
      - path: /api
        backend:
          service:
            name: eks-deployer-backend
            port:
              number: 5000
      - path: /
        backend:
          service:
            name: eks-deployer-frontend
            port:
              number: 3000
```

### Performance Tuning

```yaml
# backend deployment replicas
replicas: 3

# Resource requests
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Backup & Recovery

```bash
# Backup database
pg_dump -h rds-endpoint -U postgres eks_deployer | \
  gzip > backup-$(date +%Y%m%d).sql.gz

# Restore database
gunzip -c backup-20240115.sql.gz | \
  psql -h rds-endpoint -U postgres eks_deployer

# Backup to S3
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://eks-deployer-backups/
```

---

## Configuration

### Environment Variables

#### Backend

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development, production |
| `PORT` | API port | 5000 |
| `DATABASE_URL` | PostgreSQL connection | postgresql://... |
| `JWT_SECRET` | JWT signing key | secret-key |
| `AWS_REGION` | AWS region | us-east-1 |
| `AWS_ACCESS_KEY_ID` | AWS access key | AKIA... |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | secret... |
| `VAULT_ADDR` | Vault server address | http://localhost:8200 |
| `LOG_LEVEL` | Log level | debug, info, warn, error |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

#### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | http://localhost:5000/api |
| `REACT_APP_LOG_LEVEL` | Log level | debug, info, warn, error |

### Database Configuration

```javascript
// knexfile.js
module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' }
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: { min: 5, max: 20 },
    ssl: { rejectUnauthorized: false }
  }
};
```

---

## Troubleshooting

### Frontend not connecting to backend

```bash
# Check CORS configuration
# Check API URL in frontend .env
# Verify backend is running and accessible

curl http://localhost:5000/health
```

### Database connection errors

```bash
# Check PostgreSQL is running
psql -h localhost -U eks_user -d eks_deployer

# Verify DATABASE_URL
echo $DATABASE_URL

# Check database exists
psql -l
```

### Docker compose errors

```bash
# Check service logs
docker-compose logs postgres

# Rebuild services
docker-compose down -v
docker-compose up -d --build

# Check network
docker network ls
docker network inspect eks-deployer-network
```

### Kubernetes deployment issues

```bash
# Check pod status
kubectl describe pod <pod-name> -n eks-deployer

# View pod logs
kubectl logs <pod-name> -n eks-deployer

# Check events
kubectl get events -n eks-deployer

# Restart pod
kubectl delete pod <pod-name> -n eks-deployer
```

### AWS credential issues

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check IAM permissions
aws iam list-attached-user-policies --user-name <username>

# Regenerate access keys if needed
aws iam create-access-key --user-name <username>
```

---

## Monitoring and Logging

### Application Logs

```bash
# Backend
docker-compose logs -f backend

# Frontend (browser console)
localStorage.debug = 'app:*'

# Kubernetes
kubectl logs -f deployment/eks-deployer-backend -n eks-deployer
kubectl logs -f deployment/eks-deployer-frontend -n eks-deployer
```

### Metrics

- CPU and memory usage
- Request latency and throughput
- Database query performance
- Error rates and types

### Alerts

Setup CloudWatch alerts for:
- Pod crashes (CrashLoopBackOff)
- High CPU/memory usage
- Database connection pool exhaustion
- Deployment failures

---

## Security Best Practices

1. **Secrets Management**
   - Use AWS Secrets Manager or HashiCorp Vault
   - Rotate credentials regularly
   - Never commit secrets to git

2. **Network Security**
   - Use VPCs and security groups
   - Enable encryption in transit (TLS)
   - Restrict API access with API keys/tokens

3. **Authentication & Authorization**
   - Enforce strong passwords
   - Use MFA where possible
   - Implement RBAC

4. **Data Protection**
   - Enable encryption at rest
   - Regular backups
   - Audit logging

5. **API Security**
   - Rate limiting
   - Input validation
   - CSRF protection
   - CORS configuration

---

## Rollback Procedures

If deployment fails:

```bash
# Kubernetes
kubectl rollout undo deployment/eks-deployer-backend -n eks-deployer

# Docker Compose
docker-compose down
docker-compose up -d  # with previous image tag

# Manual rollback script
./scripts/rollback.sh <deployment-id>
```

---

## Getting Help

- Documentation: See `docs/` directory
- API Docs: http://localhost:5000/api-docs
- Issues: GitHub Issues
- Logs: Check `./logs/` directory
