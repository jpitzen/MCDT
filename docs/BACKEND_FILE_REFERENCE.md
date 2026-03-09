# Backend Files Reference

## Directory Structure

```
backend/
├── .sequelizerc                          # Sequelize CLI configuration
├── package.json                          # Dependencies & scripts
├── src/
│   ├── server.js                         # Express app entry point
│   ├── config/
│   │   ├── database.js                  # Sequelize connection config
│   │   └── sequelize-config.js          # CLI config for migrations
│   ├── models/
│   │   ├── User.js                      # User model with auth
│   │   ├── Credential.js                # Encrypted credentials model
│   │   ├── Deployment.js                # Deployment tracking model
│   │   ├── AuditLog.js                  # Audit trail model
│   │   └── index.js                     # Model associations
│   ├── services/
│   │   ├── credentialService.js         # AES-256 encryption service
│   │   ├── authService.js               # JWT & bcrypt service
│   │   ├── deploymentService.js         # Deployment orchestration
│   │   ├── awsService.js                # AWS SDK integration
│   │   ├── logger.js                    # Winston logging
│   │   └── index.js                     # Service exports
│   ├── middleware/
│   │   ├── auth.js                      # JWT & RBAC middleware
│   │   ├── errorHandler.js              # Global error handling
│   │   ├── audit.js                     # Audit logging middleware
│   │   └── index.js                     # Middleware exports
│   ├── routes/
│   │   ├── auth.js                      # Authentication endpoints
│   │   ├── credentials.js               # Credential management endpoints
│   │   ├── deployments.js               # Deployment endpoints
│   │   ├── clusters.js                  # Cluster management (scaffolded)
│   │   └── status.js                    # System status (scaffolded)
│   └── db/
│       ├── migrations/
│       │   └── 20250101000000-init.js   # Database schema migration
│       └── seeders/
│           └── 20250101000000-seed-users.js  # Test data seeder
└── logs/                                # Log files directory

```

## File Purposes

### Configuration Files

#### `.sequelizerc` (20 lines)
- Sequelize CLI configuration
- Points to migrations, seeders, models, config paths

#### `src/config/database.js` (70 lines)
- Sequelize connection setup
- Environment-specific configs (dev/test/prod)
- Connection pooling configuration
- SSL support for production

#### `src/config/sequelize-config.js` (40 lines)
- Alternative config for sequelize-cli
- Used by migrations and seeders

#### `package.json` (Updated)
- Added sequelize-cli dependency
- Added database migration scripts
- Migration commands: `db:migrate`, `db:migrate:undo`, `db:seed`

### Models (Database Layer)

#### `src/models/User.js` (85 lines)
**Purpose**: User authentication and profile management
**Key Features**:
- UUID primary key
- Email unique constraint with validation
- First/last name fields
- Password hash with bcrypt hooks
- Role-based access: admin, operator, viewer
- Active status flag
- MFA support (enabled, secret)
- Last login tracking
- Methods: `verifyPassword()`, `toSafeJSON()`

#### `src/models/Credential.js` (110 lines)
**Purpose**: Store encrypted AWS credentials
**Key Features**:
- UUID primary key with user foreign key
- Credential name and description
- AWS account ID (12 digits) and region
- AES-256 encrypted access key ID and secret
- Encryption IV for decryption
- Validation tracking (isValid, lastValidatedAt, validationError)
- Rotation tracking (lastRotatedAt, rotationScheduledAt)
- JSONB tags and metadata
- Active status for soft delete
- Indexes on user_id, aws_account_id, is_active

#### `src/models/Deployment.js` (135 lines)
**Purpose**: Track deployment lifecycle and progress
**Key Features**:
- UUID primary key with credential and user foreign keys
- Cluster name and ARN
- Status enum: pending, running, paused, completed, failed, rolled_back
- Progress percentage (0-100)
- Current phase tracking (0-11)
- JSONB configuration, parameters, results
- Error tracking (message, stack)
- Comprehensive timestamps (started, paused, completed)
- Estimated duration
- Rollback tracking (when, reason)
- JSONB tags
- Indexes on credential_id, user_id, status, created_at

#### `src/models/AuditLog.js` (110 lines)
**Purpose**: Comprehensive audit trail of all actions
**Key Features**:
- UUID primary key with optional user foreign key
- Action name and resource type
- Resource ID, name, and action status (success/failure/pending)
- Changes tracking in JSONB
- Error message storage
- Request metadata (IP, user agent, path, method)
- Context in JSONB (query, params)
- Immutable (no soft deletes for audit)
- Indexes on user_id, action, resource_type, action_status, created_at

#### `src/models/index.js` (40 lines)
**Purpose**: Manage model associations and relationships
**Relationships**:
- User has many Credentials (cascade delete)
- User has many Deployments (cascade delete)
- User has many AuditLogs (set null on delete)
- Credential has many Deployments (cascade delete)

### Services (Business Logic)

#### `src/services/credentialService.js` (100 lines)
**Purpose**: Encryption/decryption of AWS credentials
**Key Methods**:
- `encrypt(plaintext)`: AES-256-GCM encryption
- `decrypt(encryptedData, iv, authTag)`: Decryption with authentication
- `encryptCredentials(credentials)`: Encrypt AWS access keys
- `decryptCredentials(encryptedData)`: Decrypt for use
- `hashAccessKey(accessKeyId)`: SHA256 hashing
- `validateEncryptionKey()`: Validate key format
- `rotateEncryptionKey(newKey)`: Update encryption key

#### `src/services/authService.js` (150 lines)
**Purpose**: JWT token and password management
**Key Methods**:
- `generateToken(payload)`: Create access token (24h)
- `generateRefreshToken(payload)`: Create refresh token (7d)
- `verifyToken(token)`: Validate and decode token
- `hashPassword(password)`: Bcrypt hashing
- `comparePassword(password, hash)`: Verify password
- `createAuthContext(user)`: Generate auth response
- `validateTokenClaims(decoded)`: Validate token structure
- `extractToken(authHeader)`: Parse Bearer token

#### `src/services/deploymentService.js` (250 lines)
**Purpose**: Deployment lifecycle management and orchestration
**Key Methods**:
- `createDeployment(params)`: Create new deployment record
- `startDeployment(deploymentId)`: Begin 11-phase execution
- `executeOrchestrator(deploymentId)`: Run master script
- `getDeploymentStatus(deploymentId)`: Get current status
- `pauseDeployment(deploymentId)`: Pause execution
- `resumeDeployment(deploymentId)`: Resume from pause
- `rollbackDeployment(deploymentId, reason)`: Revert changes
- `cancelDeployment(deploymentId)`: Cancel deployment
- `listDeployments(filters)`: Query with pagination & filters
- `updateProgress(deploymentId, progress, phase)`: Update progress

#### `src/services/awsService.js` (300 lines)
**Purpose**: AWS SDK integration for all services
**Methods by Service**:
- **EKS**: createEKSCluster, describeEKSCluster, listEKSClusters, deleteEKSCluster
- **RDS**: createRDSDatabase, describeRDSDatabase, deleteRDSDatabase
- **ECR**: createECRRepository, listECRRepositories
- **IAM**: createIAMRole, attachRolePolicy
- **S3**: getS3Bucket
- **CloudWatch**: putMetric
- **Credentials**: initializeClients, validateCredentials, isServiceAvailable

#### `src/services/logger.js` (80 lines)
**Purpose**: Structured logging with Winston
**Features**:
- Custom log levels (error, warn, info, debug, trace)
- File transport (error.log, combined.log) with rotation
- Console transport with colors
- Methods:
  - `logger.audit()`: Audit trail logging
  - `logger.deployment()`: Phase tracking
  - `logger.security()`: Security events
  - Standard: info, warn, error, debug

#### `src/services/index.js` (10 lines)
**Purpose**: Export all services for easy import

### Middleware (Request Processing)

#### `src/middleware/auth.js` (120 lines)
**Purpose**: Authentication and authorization
**Middleware Functions**:
- `authenticate`: Verify JWT and attach user to request
  - Extracts token from Authorization header
  - Validates claims
  - Returns 401 if invalid
  - Attaches user object to request
- `authorize(allowedRoles)`: Check user role
  - Enforces role-based access control
  - Returns 403 if insufficient permissions
  - Logs security events on denial
- `optionalAuth`: Try auth but don't fail
  - Attempts authentication
  - Continues even if no token

#### `src/middleware/errorHandler.js` (140 lines)
**Purpose**: Global error handling and response formatting
**Middleware Functions**:
- `errorHandler`: Global error handler
  - Catches all errors
  - Formats responses consistently
  - Hides sensitive info in production
  - Returns proper HTTP status codes
- `asyncHandler(fn)`: Wrap async route handlers
  - Catches promise rejections
  - Passes to error handler
- `notFoundHandler`: 404 not found
  - Returns 404 for unmatched routes
- `validationErrorHandler(errors)`: Format validation errors
  - Groups errors by field
  - Returns 400 with details
- `sendSuccess(res, data, status, message)`: Success response
- `sendError(res, message, status, code, details)`: Error response

#### `src/middleware/audit.js` (100 lines)
**Purpose**: Audit logging of all requests/responses
**Middleware Functions**:
- `auditLogger`: Log requests to database
  - Captures request/response
  - Stores in audit_logs table
  - Detects action and resource type
  - Runs after response sent (setImmediate)
- `requestLogger`: HTTP request/response logging
  - Logs method, path, status, duration
  - Tracks user ID
- `logAction(actionName, type, getResourceId)`: Decorator
  - Log specific actions
  - Flexible resource ID extraction

#### `src/middleware/index.js` (10 lines)
**Purpose**: Export all middleware for easy import

### Routes (API Endpoints)

#### `src/routes/auth.js` (200 lines)
**Endpoints (6 total)**:
1. `POST /api/auth/login` - User login
   - Validates email/password
   - Compares password hash
   - Updates last login
   - Returns access & refresh tokens
   - Returns 401 if invalid

2. `POST /api/auth/register` - New user registration (admin only)
   - Validates inputs
   - Hashes password
   - Creates user record
   - Returns 201 with user

3. `GET /api/auth/profile` - Get current user (auth required)
   - Requires authentication
   - Returns user without sensitive fields
   - Returns 404 if not found

4. `PUT /api/auth/profile` - Update user profile (auth required)
   - Validates update fields
   - Updates first/last name
   - Returns updated user

5. `POST /api/auth/change-password` - Change password (auth required)
   - Verifies current password
   - Hashes and updates password
   - Returns 200 on success

6. `POST /api/auth/logout` - Logout (auth required)
   - Stateless (token-based)
   - Logs action
   - Returns 200

#### `src/routes/credentials.js` (280 lines)
**Endpoints (7 total)**:
1. `POST /api/credentials` - Add new credentials (admin/operator only)
   - Validates AWS account ID & region
   - Encrypts credentials
   - Stores in database
   - Returns 201 with credential

2. `GET /api/credentials` - List credentials (paginated)
   - Filters by user
   - Excludes encrypted fields
   - Supports limit & offset
   - Returns array & total count

3. `GET /api/credentials/:id` - Get specific credential
   - Validates ownership
   - Excludes encrypted fields
   - Returns 404 if not found

4. `PUT /api/credentials/:id` - Update credential
   - Validates ownership
   - Updates name/description
   - Returns updated credential

5. `DELETE /api/credentials/:id` - Delete credential (soft delete)
   - Marks isActive = false
   - Logs deletion
   - Returns 200

6. `POST /api/credentials/:id/validate` - Validate AWS credentials
   - Decrypts credentials
   - Tests AWS STS connection
   - Updates validation status
   - Returns success/failure

7. `PUT /api/credentials/:id/rotate` - Schedule key rotation
   - Updates lastRotatedAt
   - In production: calls AWS IAM to rotate
   - Returns success

#### `src/routes/deployments.js` (300 lines)
**Endpoints (9 total)**:
1. `POST /api/deployments` - Create new deployment (operator+)
   - Validates credential ownership
   - Creates deployment record
   - Returns 201 with deployment

2. `GET /api/deployments` - List deployments
   - Filters by user, status, credential
   - Paginated with limit/offset
   - Returns array & total

3. `GET /api/deployments/:id` - Get deployment details
   - Returns full deployment object
   - Includes credential & user
   - Returns 404 if not found

4. `POST /api/deployments/:id/start` - Start deployment (operator+)
   - Validates deployment status
   - Changes status to "running"
   - Executes orchestrator asynchronously
   - Returns updated deployment

5. `POST /api/deployments/:id/pause` - Pause deployment (operator+)
   - Validates current status
   - Changes to "paused"
   - Saves state for resume
   - Returns updated deployment

6. `POST /api/deployments/:id/resume` - Resume deployment (operator+)
   - Validates paused status
   - Changes to "running"
   - Resumes from last checkpoint
   - Returns updated deployment

7. `POST /api/deployments/:id/rollback` - Rollback deployment (admin only)
   - Changes status to "rolled_back"
   - Stores rollback reason
   - Returns updated deployment

8. `DELETE /api/deployments/:id` - Cancel deployment (admin only)
   - Validates not already completed
   - Changes to "failed"
   - Returns updated deployment

9. `GET /api/deployments/:id/logs` - Get deployment logs
   - Returns simulated logs (ready for real logs)
   - Supports filtering by phase
   - Returns 404 if not found

#### `src/routes/clusters.js` (Scaffolded)
**Endpoints (4 planned)**:
1. `GET /api/clusters` - List all clusters
2. `GET /api/clusters/:id` - Get cluster details
3. `GET /api/clusters/:id/status` - Get cluster health status
4. `DELETE /api/clusters/:id` - Delete cluster

#### `src/routes/status.js` (Scaffolded)
**Endpoints (2 planned)**:
1. `GET /api/status` - Overall system status
2. `GET /api/status/services` - Individual service health

### Database

#### `src/db/migrations/20250101000000-init.js` (350 lines)
**Purpose**: Create initial database schema
**Creates**:
- users table (8 columns)
- credentials table (15 columns)
- deployments table (25 columns)
- audit_logs table (17 columns)
- All foreign keys with cascading
- All indexes for performance

#### `src/db/seeders/20250101000000-seed-users.js` (50 lines)
**Purpose**: Populate test data
**Creates**:
- admin@eks-deployer.local (admin role)
- operator@eks-deployer.local (operator role)
- viewer@eks-deployer.local (viewer role)
- All with secure passwords

### Server Entry Point

#### `src/server.js` (100 lines)
**Purpose**: Express application setup and initialization
**Key Features**:
- Environment configuration (dotenv)
- Security middleware (Helmet, CORS)
- Request parsing (JSON, URL-encoded)
- Logging middleware setup
- Route mounting with /api prefix
- Health check endpoint
- Database initialization
- Migration support
- 404 & error handling
- Graceful shutdown
- Process signal handlers (SIGTERM, SIGINT)

---

## Configuration Files

### Environment Variables (.env)
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eks_deployer_dev
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d
ENCRYPTION_KEY=your-encryption-key
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
AWS_REGION=us-east-1
```

### .sequelizerc
```javascript
Path configuration for migrations, seeders, models
```

---

## Total Metrics

| Category | Count |
|----------|-------|
| Models | 5 |
| Services | 5 |
| Middleware | 3 |
| Routes | 5 |
| Endpoints | 23+ |
| Lines of Code | 3500+ |
| Database Tables | 4 |
| Migration Files | 1 |
| Seeder Files | 1 |
| Configuration Files | 3 |

---

## Next Phase Files to Create

### Phase 3: Frontend & Phase Scripts
- `frontend/src/pages/CredentialsManager.jsx`
- `frontend/src/pages/DeploymentWizard.jsx`
- `frontend/src/pages/DeploymentStatus.jsx`
- `frontend/src/pages/ClusterManagement.jsx`
- `scripts/01-install-tools.sh` through `11-setup-monitoring.sh`
- `backend/test/` - Jest test files

### Phase 4: Testing & Deployment
- Docker configuration
- Kubernetes manifests
- Test suite
- CI/CD configuration
