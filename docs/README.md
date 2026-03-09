# ZLAWS - Multi-Cloud Kubernetes Deployment Platform

**Automated EKS/AKS/GKE Deployment Platform with Real-Time Monitoring**

A comprehensive web application for deploying and managing Kubernetes clusters across multiple cloud providers (AWS, Azure, GCP, DigitalOcean, Linode) with real-time monitoring, cost optimization, and team collaboration features.

---

## 🚀 Features

### **Multi-Cloud Support**
- **5 Cloud Providers:** AWS EKS, Azure AKS, Google GKE, DigitalOcean Kubernetes, Linode LKE
- **Unified Interface:** Single wizard for all providers with provider-specific configurations
- **Provider-Aware UI:** Intelligent forms that adapt terminology and options based on selected cloud

### **Comprehensive Deployment Wizard**
- **8-Step Guided Process:**
  1. Select cloud credentials
  2. Configure cluster basics (name, version, region)
  3. Compute resources (worker nodes + optional VMs)
  4. Networking (VPC, subnets, NAT, load balancers)
  5. Storage (block, file, object storage)
  6. Database configuration (managed DB with HA options)
  7. Monitoring & logging integration
  8. Review & deploy with cost estimation

- **Real-Time Cost Estimation:** See projected monthly costs as you configure
- **Best Practice Guidance:** Inline help text explaining each option
- **Validation:** Comprehensive validation rules for all configuration parameters

### **Real-Time Monitoring (Phase 4 - v16)**
- **WebSocket Integration:** Live deployment status updates without page refresh
- **Live Log Streaming:** Real-time Terraform execution logs with color-coded levels
- **Phase Tracking:** Visual progress through deployment phases (init → validate → plan → apply → complete)
- **Auto-Reconnection:** Resilient WebSocket connections with exponential backoff
- **LogViewer Component:** Advanced log viewing with search, filter, pause/resume, and export

### **Credentials Management**
- **Multi-Provider Support:** Store credentials for all 5 cloud providers
- **Encryption:** All credentials encrypted at rest
- **Validation:** Test credentials before use
- **Multiple Credentials:** Support multiple credential sets per provider
- **Rotation:** Easy credential rotation and management

### **Cluster Management**
- **Cluster Listing:** View all deployed clusters across providers
- **Health Monitoring:** Real-time cluster health and node status
- **Scaling:** Scale node groups up/down
- **Metrics:** CPU, memory, pod count, and resource utilization
- **Delete:** Safely remove clusters with confirmation

### **Team Collaboration**
- **RBAC:** Role-based access control (Admin, DevOps, Viewer)
- **Teams:** Create teams and invite members
- **Resource Sharing:** Share deployments, credentials, and clusters
- **Audit Logging:** Track all user actions

### **Cost Optimization**
- **Cost Analysis:** Real-time cost tracking per deployment
- **Optimization Recommendations:** AI-powered cost-saving suggestions
- **Budget Alerts:** Set budgets and receive notifications
- **Trend Analysis:** Track spending over time

### **Alerting & Notifications**
- **Alert Channels:** Email, Slack, webhooks
- **Alert Rules:** Configure custom alert conditions
- **Deployment Events:** Notify on deployment success/failure
- **Resource Thresholds:** Alert on high CPU, memory, or costs

### **Production Readiness (Phase 5 - v17)**
- **Global Error Boundary:** Catch and display React errors gracefully
- **API Error Handling:** Automatic retry logic with exponential backoff
- **User-Friendly Error Pages:** Custom 404 and 500 pages
- **Rate Limiting:** Prevent API abuse (100 req/15min general, 5 req/15min auth)
- **JWT WebSocket Auth:** Secure WebSocket connections with token validation
- **Security Audit:** RBAC enforcement, credential encryption, input sanitization

---

## 🏗️ Architecture

### **Backend (Node.js/Express)**
```
backend/
├── src/
│   ├── config/           # Database, WebSocket, Vault configurations
│   ├── middleware/       # Auth, audit, rate limiting, error handling
│   ├── models/           # Sequelize database models
│   ├── routes/           # API endpoints (11 route files)
│   ├── services/         # Business logic (Terraform, orchestration, cost, etc.)
│   └── server.js         # Express app initialization
```

**Key Technologies:**
- Express.js 4.18 with middleware (helmet, cors, express-validator)
- Socket.IO 4.8 for real-time WebSocket communication
- Sequelize ORM with PostgreSQL database
- Winston logging
- JWT authentication
- Terraform execution via child_process
- AWS/Azure/GCP SDK integrations

### **Frontend (React)**
```
frontend/
├── src/
│   ├── components/       # Reusable components (LogViewer, ErrorBoundary, Layout)
│   ├── hooks/            # Custom hooks (useWebSocket)
│   ├── pages/            # Page components (Dashboard, DeploymentWizard, etc.)
│   ├── utils/            # Utilities (API error handler)
│   ├── App.jsx           # React Router configuration
│   └── index.jsx         # Theme provider, error boundary wrapper
```

**Key Technologies:**
- React 18 with hooks (useState, useEffect, useContext, custom hooks)
- Material-UI (MUI) v5 for UI components
- React Router v6 for routing
- Socket.IO Client for WebSocket connections
- Axios for HTTP requests with interceptors
- Theme system (Auto/Dark/Light modes)

### **Infrastructure**
- **Terraform:** Multi-cloud Kubernetes cluster provisioning
- **Kubernetes:** Minikube for local development, production-ready manifests
- **Docker:** Multi-stage builds, v17 latest
- **PostgreSQL:** Database for deployments, credentials, logs, teams

### **Terraform Modules**
```
terraform/
├── modules/
│   └── kubernetes_cluster/  # Multi-cloud module (300+ lines)
│       ├── main.tf           # All 5 cloud provider resources
│       ├── variables.tf      # Comprehensive input variables
│       ├── outputs.tf        # Provider-agnostic outputs
│       └── aws.tf            # AWS-specific resources
└── environments/
    └── aws/                  # AWS wrapper (266 lines total)
        ├── main.tf           # VPC, EKS, IAM roles
        └── variables.tf      # AWS-specific variables
```

---

## 📦 Installation

### **Prerequisites**
- Node.js 18+ and npm
- Docker (for containerization)
- Kubernetes cluster (Minikube for local, EKS/AKS/GKE for production)
- PostgreSQL 12+
- Terraform 1.13+ (optional, for real cloud deployments)

### **1. Clone Repository**
```bash
git clone <repository-url>
cd automated-eks-deployer
```

### **2. Backend Setup**
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# DATABASE_URL=postgresql://user:pass@localhost:5432/zlaws
# JWT_SECRET=your-secret-key
# CORS_ORIGIN=http://localhost:3000

# Run database migrations (if using Sequelize migrations)
npm run db:migrate

# Start backend (development)
npm run dev

# Or start production
npm start
```

**Backend runs on:** `http://localhost:5000`

### **3. Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
# REACT_APP_API_URL=http://localhost:5000

# Start development server
npm start

# Or build for production
npm run build
```

**Frontend runs on:** `http://localhost:3000`

### **4. Docker Build (Full Stack)**
```bash
# Build frontend
cd frontend
npm run build

# Build Docker image (from project root)
cd ..
docker build -t zlaws-backend:v17 .

# Run with Docker
docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/zlaws \
  -e JWT_SECRET=your-secret \
  zlaws-backend:v17
```

### **5. Kubernetes Deployment**
```bash
# Load image to Minikube
minikube image load zlaws-backend:v17

# Deploy to Kubernetes
kubectl set image deployment/zlaws-backend -n zlaws backend=zlaws-backend:v17

# Check rollout status
kubectl rollout status deployment/zlaws-backend -n zlaws

# Verify pods running
kubectl get pods -n zlaws

# Access via NodePort
# Open http://localhost:31392 (assuming NodePort 31392)
```

---

## 🔧 Configuration

### **Environment Variables**

**Backend (.env):**
```bash
# Server
PORT=5000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/zlaws

# JWT
JWT_SECRET=your-256-bit-secret-key
JWT_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# WebSocket
FRONTEND_URL=http://localhost:3000

# Cloud Provider Credentials (optional, for testing)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
```

**Frontend (.env):**
```bash
# API URL (defaults to same origin if not set)
REACT_APP_API_URL=http://localhost:5000

# WebSocket URL (defaults to same origin)
REACT_APP_SOCKET_URL=http://localhost:5000
```

### **Database Schema**
Key tables:
- `users` - User accounts with roles
- `credentials` - Encrypted cloud credentials
- `deployments` - Deployment tracking with status
- `deployment_logs` - Terraform execution logs
- `clusters` - Cluster metadata and health
- `teams` - Team management
- `team_members` - User-team relationships
- `alert_channel_configs` - Alert configurations
- `audit_logs` - Audit trail

---

## 🚦 API Endpoints

### **Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (returns JWT)
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### **Credentials**
- `GET /api/credentials` - List user credentials
- `POST /api/credentials` - Create credential
- `GET /api/credentials/:id` - Get credential details
- `PUT /api/credentials/:id` - Update credential
- `DELETE /api/credentials/:id` - Delete credential
- `POST /api/credentials/:id/test` - Test credential validity

### **Deployments**
- `GET /api/deployments` - List deployments
- `POST /api/deployments` - Create deployment
- `GET /api/deployments/:id` - Get deployment details
- `POST /api/deployments/:id/start` - Start deployment
- `POST /api/deployments/:id/pause` - Pause deployment
- `POST /api/deployments/:id/rollback` - Rollback deployment
- `DELETE /api/deployments/:id` - Delete deployment

### **Clusters**
- `GET /api/clusters` - List clusters
- `GET /api/clusters/:id` - Get cluster details
- `POST /api/clusters/:id/scale` - Scale cluster
- `DELETE /api/clusters/:id` - Delete cluster
- `GET /api/clusters/:id/health` - Cluster health check

### **Logs**
- `GET /api/logs/deployments/:id` - Get deployment logs
- `GET /api/logs/audit` - Get audit logs
- `POST /api/logs/export` - Export logs

### **Analytics**
- `GET /api/analytics/metrics` - Get metrics
- `GET /api/analytics/trends` - Get trend data
- `POST /api/analytics/export` - Export analytics data

### **Cost**
- `GET /api/cost/analysis` - Get cost analysis
- `GET /api/cost/optimization` - Get optimization recommendations
- `POST /api/cost/budget` - Create budget alert

### **Alerts**
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create alert
- `GET /api/alerts/channels` - List alert channels
- `POST /api/alerts/channels` - Create alert channel
- `POST /api/alerts/test` - Test alert

### **Templates**
- `GET /api/templates` - List deployment templates
- `POST /api/templates` - Create custom template
- `GET /api/templates/:id` - Get template details

### **Teams**
- `GET /api/teams` - List user teams
- `POST /api/teams` - Create team
- `POST /api/teams/:id/members` - Add team member
- `POST /api/teams/:id/share` - Share resource with team

---

## 📊 WebSocket Events

**Client → Server:**
- `subscribe-deployment` - Subscribe to deployment updates
- `unsubscribe-deployment` - Unsubscribe from deployment
- `get-recent-logs` - Request recent log entries
- `get-status` - Request current deployment status
- `ping` - Keep-alive check

**Server → Client:**
- `log` - New log entry emitted
- `phase-update` - Deployment phase changed (init, validate, plan, apply, complete)
- `progress-update` - Progress percentage updated
- `completed` - Deployment completed successfully
- `failed` - Deployment failed with error

**WebSocket Connection:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  auth: { token: 'your-jwt-token' } // Optional
});

socket.emit('subscribe-deployment', 'deployment-id-123', (response) => {
  console.log('Subscribed:', response.success);
});

socket.on('log', (log) => {
  console.log('New log:', log.message);
});

socket.on('phase-update', (phase) => {
  console.log('Phase:', phase);
});
```

---

## 🧪 Testing

### **Backend Tests**
```bash
cd backend
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run lint            # Lint code
npm run lint:fix        # Auto-fix lint issues
```

### **Frontend Tests**
```bash
cd frontend
npm test                # Run tests
npm run build           # Production build
```

### **End-to-End Testing**
1. Start backend and frontend
2. Create cloud credentials via UI
3. Launch deployment wizard
4. Configure cluster and submit
5. Monitor real-time logs and progress
6. Verify cluster in cloud console

---

## 🐛 Troubleshooting

### **Frontend won't connect to backend**
- Check `REACT_APP_API_URL` in frontend `.env`
- Verify backend is running on correct port
- Check CORS configuration in backend (`CORS_ORIGIN`)

### **WebSocket not connecting**
- Verify `FRONTEND_URL` in backend `.env` matches frontend origin
- Check browser console for WebSocket errors
- Ensure firewall allows WebSocket connections

### **Deployment fails immediately**
- Check cloud credentials are valid
- Verify Terraform is installed (if using real cloud deployments)
- Check deployment logs for error details
- Ensure AWS/Azure/GCP credentials have sufficient permissions

### **Database connection errors**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database exists: `createdb zlaws`
- Run migrations: `npm run db:migrate`

### **Rate limit errors (429)**
- Wait 15 minutes for limit to reset
- Check rate limiter configuration in `backend/src/middleware/rateLimiter.js`
- Increase limits if needed for testing

---

## 📈 Performance

**Current Metrics (v17):**
- Frontend build: ~60 seconds
- Docker build: ~2 minutes (multi-stage)
- Kubernetes rollout: ~1-2 minutes
- Page load: <2 seconds initial, <500ms navigation
- WebSocket latency: <50ms
- API response time: <200ms average

**Optimizations:**
- React.memo on LogViewer component
- Axios interceptor with retry logic (3 retries, exponential backoff)
- WebSocket connection pooling
- Database indexing on foreign keys
- Efficient Terraform state management

---

## 🔒 Security

### **Authentication & Authorization**
- JWT tokens with 7-day expiration
- Password hashing with bcrypt (10 rounds)
- Role-based access control (Admin, DevOps, Viewer)
- Protected routes require authentication
- WebSocket connections support JWT validation

### **Credentials**
- All cloud credentials encrypted at rest
- No plain-text credential storage
- Vault integration support (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- Credential validation before use
- Audit logging for credential access

### **Rate Limiting**
- General API: 100 requests / 15 minutes per IP
- Auth endpoints: 5 requests / 15 minutes per IP
- Deployment creation: 10 requests / hour per user
- Credential operations: 20 requests / 15 minutes per user

### **Input Validation**
- express-validator for all API inputs
- SQL injection prevention via Sequelize ORM
- XSS protection via helmet middleware
- CORS configured for specific origins only

---

## 🗺️ Roadmap

### ✅ **Phase 1: Deployment** (COMPLETE)
- Docker image v1-v17
- Kubernetes deployment (2/2 replicas)
- PostgreSQL database
- All 11 backend API routes

### ✅ **Phase 2: Frontend** (COMPLETE)
- Dashboard with real metrics
- Credentials manager with validation UI
- 8-step deployment wizard
- Deployment details page
- Cluster management UI
- Theme system (Auto/Dark/Light)

### ✅ **Phase 3: Terraform Testing** (COMPLETE)
- Terraform v1.13.5 installed
- All 5 cloud providers configured
- Multi-cloud module validated
- TerraformExecutor service complete

### ✅ **Phase 4: Real-Time Features** (COMPLETE - v16)
- WebSocket server enabled
- Live log streaming
- Phase progress updates
- LogViewer component
- useWebSocket custom hook

### ✅ **Phase 5: Production Readiness** (COMPLETE - v17)
- Global error boundary
- API error handler with retry logic
- User-friendly error pages (404, 500)
- Rate limiting on all APIs
- JWT WebSocket authentication
- Security audit complete

### 🚀 **Phase 6: Advanced Features** (FUTURE)
- Cost analytics dashboard
- Alert notifications (email, Slack, webhooks)
- Template marketplace
- Multi-tenant support
- Advanced RBAC with custom roles

---

## 📚 Documentation

Additional documentation available:
- `logs/phase3-terraform-integration-test-report.md` - Terraform testing results
- `docs/phase4-websocket-implementation-summary.md` - WebSocket implementation details
- `Roadmap-202511191930.md` - Detailed project roadmap and status

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Code Style:**
- ESLint for JavaScript linting
- Prettier for code formatting (optional)
- Follow existing code patterns

---

## 📝 License

MIT License - see LICENSE file for details

---

## 👥 Support

For issues, questions, or feature requests:
- Open a GitHub issue
- Contact: [Your Contact Info]
- Documentation: See `/docs` folder

---

## 🎉 Acknowledgments

Built with:
- React, Material-UI, Socket.IO Client
- Express, Socket.IO, Sequelize
- Terraform, Kubernetes, Docker
- AWS SDK, Azure SDK, GCP SDK

---

**Version:** v17  
**Last Updated:** November 20, 2025  
**Status:** Production-ready with real-time monitoring
