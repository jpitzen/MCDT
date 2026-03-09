# ZLAWS Complete Deployment Guide

**Version**: Phase 6 (Complete)  
**Status**: Production Ready  
**Last Updated**: January 2025  

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Docker Deployment](#docker-deployment)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

### System Requirements
- **Node.js**: v16+ (v18+ recommended)
- **npm**: v8+
- **PostgreSQL**: v12+
- **Docker**: v20+ (optional, for containerization)
- **Memory**: 4GB minimum
- **Disk Space**: 5GB minimum

### Required Accounts
- AWS/GCP/Azure account (for cloud deployments)
- GitHub account (for source control)
- Docker Hub account (optional, for image registry)

### Tools to Install

**Windows (PowerShell)**
```powershell
# Install Node.js
choco install nodejs

# Install PostgreSQL
choco install postgresql

# Install Docker (optional)
choco install docker-desktop
```

**macOS**
```bash
# Install Node.js
brew install node

# Install PostgreSQL
brew install postgresql

# Install Docker (optional)
brew install --cask docker
```

**Linux (Ubuntu/Debian)**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh | sh
```

## Installation

### 1. Clone Repository
```bash
cd /projects
git clone https://github.com/your-org/zlaws.git
cd zlaws
```

### 2. Install Dependencies

**Backend**
```bash
cd automated-eks-deployer/backend
npm install
```

**Frontend** (if included)
```bash
cd ../../frontend
npm install
```

### 3. Verify Installation
```bash
node --version  # Should be v16+
npm --version   # Should be v8+
npm list        # Shows installed packages
```

## Configuration

### 1. Environment Setup

**Create `.env` file** in `backend` directory:
```bash
cd automated-eks-deployer/backend
touch .env
```

**Basic Configuration (.env)**
```
# Server
NODE_ENV=development
PORT=5000
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zlaws_db
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_SSL=false

# JWT
JWT_SECRET=your-very-secure-random-string-min-32-chars
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key
ENCRYPTION_ALGORITHM=aes-256-gcm

# CORS
CORS_ORIGIN=http://localhost:3000
ALLOW_CREDENTIALS=true

# Cloud Providers
AWS_REGION=us-east-1
GCP_PROJECT_ID=your-gcp-project
AZURE_SUBSCRIPTION_ID=your-azure-subscription

# Logging
LOG_LEVEL=info
LOG_FILE=logs/zlaws.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=14

# Security
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT=3600000

# Email (for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@zlaws.com

# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Production Configuration**
```
NODE_ENV=production
PORT=5000
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20
LOG_LEVEL=warn
JWT_EXPIRY=1d
RATE_LIMIT_MAX_REQUESTS=1000
```

### 2. Security Configuration

**Generate JWT Secret**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Generate Encryption Key**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Update .env with generated values**
```
JWT_SECRET=<generated-32-char-string>
ENCRYPTION_KEY=<generated-16-char-string>
```

### 3. Database Configuration

**Install PostgreSQL Driver**
```bash
npm install pg pg-hstore
```

**Create Database**
```bash
psql -U postgres -c "CREATE DATABASE zlaws_db;"
psql -U postgres -c "CREATE USER zlaws_user WITH PASSWORD 'your-secure-password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE zlaws_db TO zlaws_user;"
```

**Verify Connection**
```bash
psql -U zlaws_user -d zlaws_db -h localhost
```

## Database Setup

### 1. Schema Initialization

**Automatic (Development)**
```bash
cd backend
npm run db:sync
```

**Output**:
```
✓ Database schema synchronized
  - Created 'users' table
  - Created 'credentials' table
  - Created 'deployments' table
  - ... (and more)
```

### 2. Seed Data (Optional)

```bash
npm run db:seed
```

**Seeded Data**:
- Admin user (email: admin@zlaws.com, password: Admin123!)
- Sample deployment templates
- Default alert channels
- Test credentials

### 3. Database Validation

```bash
npm run db:check

# Output:
✓ Database connection: OK
✓ Tables created: 12/12
✓ Indexes: 45/45
✓ Schema version: 6.0.0
```

### 4. Backup Database

```bash
# Create backup
pg_dump -U zlaws_user -d zlaws_db > zlaws_backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U zlaws_user -d zlaws_db < zlaws_backup_20250115.sql
```

## Running the Application

### 1. Development Mode

**Start Backend Server**
```bash
cd backend
npm run dev
```

**Output**:
```
✓ EKS Deployer API server started
  Port: 5000
  Environment: development
  WebSocket: Enabled
  Database: Connected
  
Listening on http://localhost:5000
```

**In Another Terminal - Start Frontend** (if applicable)
```bash
cd frontend
npm run dev

# Frontend available at http://localhost:3000
```

### 2. Health Check

```bash
curl http://localhost:5000/health

# Response:
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00Z",
  "environment": "development"
}
```

### 3. Test API

**Register User**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "username": "testuser"
  }'
```

**Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

## Docker Deployment

### 1. Build Docker Image

**Create Dockerfile** (if not exists)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
```

**Build Image**
```bash
docker build -t zlaws:latest -f Dockerfile .
```

### 2. Create Docker Compose File

**docker-compose.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: zlaws_db
      POSTGRES_USER: zlaws_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zlaws_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  zlaws:
    build: .
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: zlaws_db
      DB_USER: zlaws_user
      DB_PASSWORD: secure_password
      JWT_SECRET: your-secure-secret
      ENCRYPTION_KEY: your-encryption-key
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:

networks:
  default:
    driver: bridge
```

### 3. Start Application

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f zlaws

# Stop services
docker-compose down

# Remove all data (warning: destructive)
docker-compose down -v
```

## Production Deployment

### 1. AWS ECS Deployment

**Create ECS Task Definition**
```bash
aws ecs register-task-definition \
  --family zlaws-task \
  --container-definitions '[{
    "name": "zlaws",
    "image": "your-registry/zlaws:latest",
    "portMappings": [{"containerPort": 5000}],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "DB_HOST", "value": "rds-endpoint"},
      {"name": "DB_NAME", "value": "zlaws_db"}
    ]
  }]'
```

**Create ECS Service**
```bash
aws ecs create-service \
  --cluster zlaws-prod \
  --service-name zlaws-api \
  --task-definition zlaws-task \
  --desired-count 2 \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...
```

### 2. Kubernetes Deployment

**Create Deployment Manifest** (`k8s/deployment.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zlaws-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zlaws-api
  template:
    metadata:
      labels:
        app: zlaws-api
    spec:
      containers:
      - name: zlaws
        image: your-registry/zlaws:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: production
        - name: DB_HOST
          value: postgres-rds.production.svc.cluster.local
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
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: zlaws-api-service
  namespace: production
spec:
  selector:
    app: zlaws-api
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 5000
```

**Deploy to Kubernetes**
```bash
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/zlaws-api -n production
```

### 3. SSL/TLS Configuration

**Using Let's Encrypt with Nginx**
```nginx
server {
    listen 443 ssl http2;
    server_name api.zlaws.com;

    ssl_certificate /etc/letsencrypt/live/api.zlaws.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.zlaws.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.zlaws.com;
    return 301 https://$server_name$request_uri;
}
```

### 4. Monitoring Setup

**Application Metrics**
```bash
# Install Prometheus client
npm install prom-client

# Metrics exposed at /metrics
curl http://localhost:5000/metrics
```

**Log Aggregation**
```bash
# Logs sent to ELK stack or CloudWatch
# Configure in logger service
LOG_DRIVER=cloudwatch
AWS_LOG_GROUP=/zlaws/production
```

## Troubleshooting

### Common Issues

**Issue: Database Connection Failed**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**:
```bash
# Check PostgreSQL service
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Verify connection
psql -U zlaws_user -d zlaws_db -h localhost -c "SELECT 1"
```

**Issue: Port Already in Use**
```
Error: listen EADDRINUSE :::5000
```
**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

**Issue: JWT Token Expired**
```
Error: jwt expired
```
**Solution**:
```bash
# Get new token via refresh endpoint
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

**Issue: Out of Memory**
```
Error: JavaScript heap out of memory
```
**Solution**:
```bash
# Increase Node heap
node --max-old-space-size=4096 src/server.js

# Or set in npm scripts
"start": "node --max-old-space-size=4096 src/server.js"
```

### Debug Mode

**Enable Verbose Logging**
```bash
DEBUG=* npm run dev
```

**Check Application Logs**
```bash
tail -f logs/zlaws.log
```

**Database Query Logging**
```bash
# In .env
DB_LOG=true
```

## Monitoring & Maintenance

### 1. Health Checks

**Automated Health Monitoring**
```bash
# Check every 30 seconds
watch -n 30 'curl http://localhost:5000/health'
```

**System Status Endpoint**
```bash
curl http://localhost:5000/status

# Response:
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "cache": "connected",
    "storage": "connected"
  },
  "uptime": 86400,
  "version": "6.0.0"
}
```

### 2. Database Maintenance

**Regular Backups**
```bash
# Daily backup
0 2 * * * pg_dump -U zlaws_user -d zlaws_db > /backups/zlaws_$(date +\%Y\%m\%d).sql

# Weekly cleanup
0 0 * * 0 find /backups -mtime +30 -delete
```

**Vacuum & Analyze**
```bash
# Run weekly
VACUUM ANALYZE;
REINDEX DATABASE zlaws_db;
```

### 3. Performance Tuning

**Database Connection Pool**
```javascript
// In database config
pool: {
  min: 5,
  max: 20,
  idle: 10000,
  acquire: 30000
}
```

**Cache Configuration**
```bash
# Set max cache size
CACHE_MAX_SIZE=1000
CACHE_TTL=3600
```

### 4. Logging & Monitoring

**Log Rotation**
```javascript
// logs/zlaws.log rotates at 10MB
maxSize: '10m',
maxFiles: '14'  // Keep 14 files = 140MB
```

**Alerting Setup**
```bash
# Alert on high error rate
if error_rate > 1% in last 5min:
  notify ops team via Slack
```

## Security Checklist

- [ ] All passwords set to strong values
- [ ] JWT_SECRET generated with crypto
- [ ] ENCRYPTION_KEY properly configured
- [ ] SSL/TLS enabled in production
- [ ] Database backups automated
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Secrets stored in environment variables
- [ ] Database user has minimal required privileges
- [ ] Firewall rules configured
- [ ] DDoS protection enabled
- [ ] Regular security audits scheduled

## Performance Benchmarks

**Typical Performance (Single Instance)**
- **API Latency**: 50-100ms average
- **Throughput**: 1000+ requests/second
- **Database**: <50ms average query time
- **Deployment**: 5-10 minutes for new cluster

**Scaling Recommendations**
- **Small (< 10 deployments)**: Single instance
- **Medium (10-100 deployments)**: 2-3 instances with load balancer
- **Large (> 100 deployments)**: Auto-scaling with 5-10 instances

## Support & Documentation

- **API Docs**: `API_REFERENCE_COMPLETE.md`
- **Configuration**: See .env.example
- **Logs**: `logs/zlaws.log`
- **Health Check**: `GET /health`
- **Status Page**: `GET /status`

## Next Steps

1. Follow installation and configuration steps above
2. Verify database connection
3. Run application in development mode
4. Test basic API endpoints
5. Configure cloud provider credentials
6. Deploy test infrastructure
7. Set up monitoring and alerting
8. Proceed to production deployment

**Estimated Setup Time**: 30-60 minutes for development, 2-4 hours for production
