# Automated Multi-Cloud Kubernetes Deployment Platform

A comprehensive web-based platform for automated deployment and management of fully functional Kubernetes clusters across **5 cloud providers** (AWS EKS, Azure AKS, Google GKE, DigitalOcean LKE, Linode LKE) with integrated storage, databases, monitoring, and logging.

**Status**: 🚀 **Phase 3 Complete** - Terraform Execution Service Fully Implemented  
**Progress**: 68% Complete (18/21 tasks)  
**Last Update**: November 19, 2025

## Overview

This platform automates the entire multi-cloud Kubernetes deployment workflow, providing:

- **Multi-Cloud Support**: AWS, Azure, GCP, DigitalOcean, Linode with zero code changes
- **Web Interface**: Cloud provider selection, credential management, deployment wizard
- **Native Vaults**: AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault
- **Automated Deployment**: Terraform-based infrastructure as code across all providers ✅ Phase 3
- **Real-time Monitoring**: Status tracking, logs, and deployment progress (Phase 4)
- **Security-First**: Credentials stored in cloud vaults, reference IDs only in database

## What's New in Phase 3

✅ **TerraformExecutor Service** - Complete Terraform lifecycle management  
✅ **Deployment Execution** - Init → Plan → Apply workflow  
✅ **Phase Tracking** - 11-phase deployment lifecycle  
✅ **Error Handling** - Automatic rollback on failure  
✅ **Deployment Logging** - Up to 1,000 events per deployment  

[See Phase 3 Details →](./PHASE_3_COMPLETION_SUMMARY.md)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  - Credential Management UI                                │
│  - Deployment Configuration                                │
│  - Real-time Status Dashboard                              │
│  - Logs & Monitoring                                       │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST API
┌────────────────────▼────────────────────────────────────────┐
│              Backend (Node.js/Express)                      │
│  - Credential Encryption/Decryption                        │
│  - Deployment Orchestration                                │
│  - AWS API Integration                                     │
│  - Database Management                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼──────┐  ┌─────▼──────┐  ┌──────▼────┐
│PostgreSQL│  │Deployment  │  │ Vault/    │
│Database  │  │ Scripts    │  │ SecMgr    │
└──────────┘  └────────────┘  └───────────┘
                     │
                     │ Terraform + Bash
                     │
┌────────────────────▼────────────────────────────────────────┐
│                AWS Infrastructure                           │
│  - EKS Clusters       - ECR Repositories                   │
│  - RDS Databases      - EBS/EFS/S3 Storage                │
│  - IAM Roles          - Load Balancers                     │
│  - VPC & Networking   - Monitoring & Logging              │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
automated-eks-deployer/
├── frontend/                      # React web application
│   ├── src/
│   │   ├── components/           # UI components
│   │   ├── pages/                # Pages (Dashboard, Deploy, Credentials)
│   │   ├── services/             # API client
│   │   └── utils/                # Utilities & helpers
│   └── package.json
│
├── backend/                       # Node.js/Express API
│   ├── src/
│   │   ├── routes/               # API endpoints
│   │   ├── controllers/          # Business logic
│   │   ├── services/             # AWS SDK, DB operations
│   │   ├── middleware/           # Auth, encryption
│   │   ├── models/               # Database models
│   │   └── utils/                # Helpers
│   └── package.json
│
├── infrastructure/               # Terraform & IaC
│   ├── eks/                      # EKS cluster configuration
│   ├── rds/                      # RDS instance configuration
│   ├── storage/                  # EBS, EFS, S3 setup
│   ├── networking/               # VPC, security groups
│   ├── iam/                      # IAM roles and policies
│   └── main.tf                   # Main infrastructure
│
├── scripts/                      # Deployment automation
│   ├── 01-install-tools.sh       # CLI tools installation
│   ├── 02-create-eks-cluster.sh  # EKS cluster creation
│   ├── 03-create-rds.sh          # RDS setup
│   ├── 04-setup-ecr.sh           # ECR repository
│   ├── 05-setup-ebs-csi.sh       # EBS CSI driver
│   ├── 06-setup-efs-csi.sh       # EFS CSI driver
│   ├── 07-setup-s3-csi.sh        # S3 integration
│   ├── 08-setup-autoscaling.sh   # Node autoscaling
│   ├── 09-deploy-zookeeper.sh    # ZooKeeper StatefulSet
│   ├── 10-deploy-main-app.sh     # Main application
│   ├── 11-setup-monitoring.sh    # Monitoring setup
│   ├── deploy-orchestrator.sh    # Master orchestration script
│   └── rollback.sh               # Rollback procedures
│
└── docs/
    ├── ARCHITECTURE.md           # Detailed architecture
    ├── API_SPEC.md               # API documentation
    ├── DEPLOYMENT_GUIDE.md       # How to deploy
    ├── TROUBLESHOOTING.md        # Common issues
    └── SECURITY.md               # Security practices
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- AWS Account with appropriate permissions
- AWS CLI configured locally

### Setup

1. **Clone and setup environment**
```bash
cd c:\Projects\ZLAWS\automated-eks-deployer
cp .env.example .env
# Edit .env with your AWS credentials
```

2. **Start database and backend**
```bash
docker-compose up -d postgres vault
npm install --prefix backend
npm start --prefix backend
```

3. **Start frontend**
```bash
npm install --prefix frontend
npm start --prefix frontend
```

4. **Access the application**
- Frontend: http://localhost:3000
- API: http://localhost:5000

## Major Features

### 1. Credential Management
- Secure AWS credential storage with encryption
- Multi-profile support for different environments
- Audit logging of credential access
- Automatic credential rotation

### 2. Deployment Configuration
- Step-by-step wizard for cluster configuration
- Pre-configured templates for common scenarios
- Custom parameter support
- Configuration validation

### 3. Automated Deployment
- One-click deployment of entire infrastructure
- 11 phases of automated setup
- Progress tracking with logs
- Error handling and reporting

### 4. Monitoring & Status
- Real-time deployment progress
- Resource utilization dashboard
- Application logs streaming
- Alert notifications

### 5. Recovery & Rollback
- Deployment checkpoints
- Selective component rollback
- Disaster recovery procedures
- State snapshots

## Deployment Phases

1. **Install Tools** - AWS CLI, kubectl, eksctl, Helm
2. **Create EKS Cluster** - Managed Kubernetes cluster
3. **Setup RDS** - SQL Server database
4. **Configure ECR** - Container image registry
5. **Setup EBS CSI** - Persistent block storage
6. **Setup EFS CSI** - Shared file storage
7. **Setup S3 Integration** - Object storage mounting
8. **Configure Autoscaling** - Node auto-scaling
9. **Deploy ZooKeeper** - Distributed coordination
10. **Deploy Main App** - Primary application
11. **Setup Monitoring** - Logging and observability

## Security Features

- **Encryption at Rest**: AWS KMS for secrets
- **Encryption in Transit**: TLS/HTTPS everywhere
- **Access Control**: RBAC with IAM roles
- **Audit Logging**: All actions logged
- **Credential Rotation**: Automatic key rotation
- **VPC Security**: Private endpoints and security groups
- **Secrets Management**: HashiCorp Vault integration

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Current user profile

### Credentials
- `POST /api/credentials` - Add AWS credentials
- `GET /api/credentials` - List credentials
- `DELETE /api/credentials/:id` - Remove credentials
- `PUT /api/credentials/:id/rotate` - Rotate keys

### Deployments
- `POST /api/deployments` - Start new deployment
- `GET /api/deployments` - List deployments
- `GET /api/deployments/:id` - Deployment details
- `GET /api/deployments/:id/logs` - Deployment logs
- `POST /api/deployments/:id/rollback` - Rollback deployment

### Infrastructure
- `GET /api/clusters` - List clusters
- `GET /api/clusters/:id/status` - Cluster status
- `GET /api/resources/:clusterId` - Cluster resources

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend | React | 18.x |
| UI Framework | Material-UI | 5.x |
| Backend | Node.js/Express | 18.x |
| Database | PostgreSQL | 14+ |
| Secrets | HashiCorp Vault | 1.15+ |
| Infrastructure | Terraform | 1.5+ |
| Automation | Bash | 4.0+ |
| Containerization | Docker | 24.x |

## Configuration

### Environment Variables

**Backend (.env)**
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/eks_deployer
JWT_SECRET=your-secret-key
AWS_REGION=us-east-1
VAULT_ADDR=http://localhost:8200
LOG_LEVEL=info
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_LOG_LEVEL=info
```

## Development

### Running Tests
```bash
# Backend tests
npm test --prefix backend

# Frontend tests
npm test --prefix frontend

# Infrastructure validation
terraform validate -chdir=infrastructure
```

### Linting & Formatting
```bash
npm run lint --prefix backend
npm run lint --prefix frontend
```

## Deployment to Production

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for production deployment instructions.

## Troubleshooting

Common issues and solutions are documented in [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Contributing

1. Create feature branch
2. Make changes
3. Add tests
4. Submit pull request

## Support

For issues, questions, or feature requests, please refer to [docs/](docs/) directory.

## License

© 2025 Automated EKS Deployment Platform

## Roadmap

- [ ] Kubernetes Dashboard integration
- [ ] Multi-cluster management
- [ ] GitOps integration (ArgoCD)
- [ ] Advanced RBAC management
- [ ] Cost optimization recommendations
- [ ] Disaster recovery automation
- [ ] Multi-region deployment support
- [ ] Helm chart management UI
