# Database Architecture & Code Cohesion Analysis

**Last Updated**: November 26, 2025  
**Database**: PostgreSQL 15-alpine  
**ORM**: Sequelize 6.37.7  
**Node.js**: 22.14.0

---

## Table of Contents
1. [Database Connection Architecture](#database-connection-architecture)
2. [Model Layer](#model-layer)
3. [Database Access Patterns](#database-access-patterns)
4. [Query Performance & Best Practices](#query-performance--best-practices)
5. [Migration Strategy](#migration-strategy)
6. [Connection Pool Configuration](#connection-pool-configuration)
7. [Code Cohesion Analysis](#code-cohesion-analysis)
8. [Recommendations](#recommendations)

---

## Database Connection Architecture

### Connection Configuration
**File**: `backend/src/config/database.js`

The application uses a single Sequelize instance configured per environment:

```javascript
Environment Configurations:
├── Development
│   ├── Pool: max=5, min=0, acquire=30s, idle=10s
│   ├── Logging: Enabled (console.log)
│   └── Database: eks_deployer_dev (default)
│
├── Test
│   ├── Pool: max=5, min=0, acquire=30s, idle=10s
│   ├── Logging: Disabled
│   └── Database: eks_deployer_test (default)
│
└── Production
    ├── Pool: max=20, min=5, acquire=30s, idle=10s
    ├── Logging: Disabled
    ├── SSL: Optional (DB_SSL=true)
    └── Database: eks_deployer (from env)
```

### Environment Variables
```
DB_HOST=localhost          # Default: localhost
DB_PORT=5432              # Default: 5432
DB_NAME=eks_deployer      # Required in production
DB_USER=eks_user          # Required in production
DB_PASSWORD=***           # Required in production
DB_SSL=false              # Optional: Enable SSL
NODE_ENV=development      # development|test|production
```

### Current Development Configuration
```yaml
Host: localhost
Port: 5432
Database: eks_deployer
User: eks_user
Password: eks_password_123
Container: eks-deployer-postgres
Volume: automated-eks-deployer_postgres_data
Restart Policy: unless-stopped
```

---

## Model Layer

### Central Model Registry
**File**: `backend/src/models/index.js`

All models are initialized and relationships defined in a single location:

### Models (10 Total)
1. **User** - User accounts and authentication
2. **Credential** - Cloud provider credentials (AWS/Azure/GCP)
3. **Deployment** - Kubernetes cluster deployments
4. **DeploymentDraft** - Pre-approval deployment configurations
5. **DeploymentLog** - Deployment execution logs
6. **DeploymentSqlScript** - Database initialization scripts
7. **AuditLog** - System audit trail
8. **AlertChannelConfig** - Alert notification settings
9. **Team** - Team/organization management
10. **TeamMember** - Team membership relations
11. **SharedResource** - Resource sharing across teams

### Database Tables (10 in PostgreSQL)
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```
Results:
- SequelizeMeta (migration tracking)
- audit_logs
- credentials
- deployment_logs
- deployment_sql_scripts
- deployments
- shared_resources
- team_members
- teams
- users

### Model Relationships

#### User Relationships
```
User (1) ──────> (N) Credential
User (1) ──────> (N) Deployment
User (1) ──────> (N) DeploymentDraft (as creator)
User (1) ──────> (N) DeploymentDraft (as approver)
User (1) ──────> (N) AuditLog
User (1) ──────> (N) AlertChannelConfig
User (1) ──────> (N) Team (as owner)
User (1) ──────> (N) TeamMember
User (1) ──────> (N) DeploymentSqlScript (as uploader)
```

#### Deployment Relationships
```
Deployment (1) ──────> (N) DeploymentLog
Deployment (1) ──────> (N) DeploymentSqlScript
Deployment (1) ──────> (1) DeploymentDraft (optional)
Deployment (N) ──────> (1) Credential
Deployment (N) ──────> (1) User
```

#### Team Relationships
```
Team (1) ──────> (N) TeamMember
Team (1) ──────> (N) SharedResource
Team (N) ──────> (1) User (owner)
```

### Cascade Deletion Rules
- User deletion → Cascades to Credentials, Deployments, Teams
- Deployment deletion → Cascades to DeploymentLogs, DeploymentSqlScripts
- Credential deletion → Cascades to Deployments
- Team deletion → Cascades to TeamMembers, SharedResources
- DeploymentDraft approval SET NULL on user deletion

---

## Database Access Patterns

### Query Distribution by Route

#### 1. Authentication Routes (`auth.js`)
**Models**: User  
**Operations**: 
- `User.findOne()` - Login validation
- `User.create()` - Registration
- `User.update()` - Password reset

**Frequency**: High (every request)  
**Optimization**: Indexed on email (unique)

#### 2. Credentials Routes (`credentials.js`)
**Models**: Credential  
**Operations**:
- `Credential.create()` - Store encrypted credentials
- `Credential.findAndCountAll()` - List with pagination
- `Credential.findOne()` - Get single credential
- `Credential.findByPk()` - Get by ID
- `Credential.update()` - Update credentials
- `Credential.destroy()` - Delete credentials

**Critical Columns**:
- `cloud_provider` VARCHAR(255) NOT NULL DEFAULT 'aws'
- `vault_type` VARCHAR(255) NOT NULL DEFAULT 'aws-secrets'
- `secret_ref_id` VARCHAR(255) - AWS Secrets Manager ARN
- `cloud_account_id` VARCHAR(255)
- `cloud_region` VARCHAR(255)
- `auth_tag` VARCHAR(255) - Encryption auth tag

**Indexes**: user_id, is_active, aws_account_id

#### 3. Deployment Routes (`deployments.js`)
**Models**: Deployment, Credential, DeploymentSqlScript  
**Operations**:
- `Deployment.findOne()` - Get deployment with includes
- `Deployment.create()` - Create new deployment
- `Deployment.update()` - Update status/progress
- `Deployment.destroy()` - Delete deployment
- `DeploymentSqlScript.count()` - Check pending scripts

**Critical Columns**:
- `cloud_provider` VARCHAR(255) NOT NULL DEFAULT 'aws' ⚠️ **NEWLY ADDED**
- `status` ENUM - pending|running|completed|failed|paused
- `current_phase` INTEGER - Deployment progress
- `configuration` JSONB - Terraform config

**Indexes**: user_id, credential_id, status, created_at

#### 4. Deployment Draft Routes (`deployment-drafts.js`)
**Models**: DeploymentDraft, Credential, User, Deployment  
**Operations**:
- `DeploymentDraft.findAndCountAll()` - List drafts with pagination
- `DeploymentDraft.create()` - Create draft
- `DeploymentDraft.update()` - Update draft/approval status
- `DeploymentDraft.destroy()` - Delete draft
- `DeploymentDraft.findByPk()` - Get draft by ID

**Status Flow**: draft → pending_approval → approved/rejected → deployed

#### 5. Logs Routes (`logs.js`)
**Models**: DeploymentLog, Deployment  
**Operations**:
- `DeploymentLog.findAndCountAll()` - Paginated log retrieval
- `DeploymentLog.findAll()` - Export logs
- `DeploymentLog.destroy()` - Clear logs
- `Deployment.findAll()` - User deployment filtering

**Query Patterns**:
- Pagination: LIMIT/OFFSET with count
- Date filtering: WHERE created_at BETWEEN
- Level filtering: WHERE level IN (...)
- Sorting: ORDER BY created_at DESC

**Indexes**: deployment_id, created_at, level

#### 6. SQL Scripts Routes (`sqlScripts.js`)
**Models**: DeploymentSqlScript, Deployment  
**Operations**:
- `DeploymentSqlScript.create()` - Upload script
- `DeploymentSqlScript.findAll()` - List scripts for deployment
- `DeploymentSqlScript.findOne()` - Get script details
- `DeploymentSqlScript.update()` - Update script status/results
- `DeploymentSqlScript.destroy()` - Delete script

**Script Execution Flow**:
```
pending → running → completed/failed
```

#### 7. Status Routes (`status.js`)
**Models**: User, Credential, Deployment  
**Operations**:
- Multiple `count()` queries in parallel
- `Deployment.findAll()` - Recent deployments
- `sequelize.authenticate()` - Health check

**Dashboard Query (Parallel Execution)**:
```javascript
Promise.all([
  User.count(),
  Credential.count({ where: { userId } }),
  Deployment.count({ where: { userId } }),
  Deployment.count({ where: { userId, status: 'running' } }),
  Deployment.count({ where: { userId, status: 'failed' } }),
  Deployment.findAll({ where: { userId }, limit: 5, order: [['createdAt', 'DESC']] })
])
```

#### 8. Analytics Routes (`analytics.js`)
**Models**: Deployment, DeploymentLog  
**Complex Queries**: Aggregations, time-series data, grouping

#### 9. Cost Routes (`cost.js`)
**Models**: Deployment  
**AWS Integration**: Cost calculation from deployment configuration

#### 10. Admin Routes (`admin.js`)
**Models**: Deployment, DeploymentSqlScript, DeploymentDraft  
**Bulk Operations**: 
- Delete all deployments
- Delete failed deployments
- Delete old deployments (>30 days)
- Delete orphaned drafts

**Uses**: `Op.lt`, `Op.in` for complex WHERE clauses

---

## Query Performance & Best Practices

### Observed Patterns

#### ✅ **Good Practices**
1. **Parallel Queries**: Dashboard uses `Promise.all()` for independent queries
2. **Pagination**: Consistent use of `LIMIT` and `OFFSET` with `findAndCountAll()`
3. **Selective Attributes**: Many queries use `attributes: [...]` to limit columns
4. **Indexed Queries**: WHERE clauses use indexed columns (userId, credentialId, status)
5. **Cascade Deletes**: Proper foreign key constraints prevent orphaned records

#### ⚠️ **Areas for Improvement**
1. **No Transaction Usage**: No explicit `sequelize.transaction()` calls found
   - Bulk operations in admin.js should use transactions
   - Draft approval → deployment creation should be atomic
   
2. **N+1 Query Risk**: Some routes don't use `include` for related data
   - Example: Fetching deployment then credential separately
   
3. **Missing Eager Loading**: Could optimize with `include` for associations
   ```javascript
   // Current (2 queries)
   const deployment = await Deployment.findOne({ where: { id } });
   const credential = await Credential.findByPk(deployment.credentialId);
   
   // Better (1 query)
   const deployment = await Deployment.findOne({
     where: { id },
     include: [{ model: Credential, as: 'credential' }]
   });
   ```

4. **Large Result Sets**: `findAll()` without limits could return thousands of rows
   - Analytics queries should have row limits
   - Export functions need streaming for large datasets

5. **Count Queries**: Multiple separate count queries instead of single aggregate
   ```javascript
   // Current (5 queries)
   const running = await Deployment.count({ where: { status: 'running' } });
   const pending = await Deployment.count({ where: { status: 'pending' } });
   // ...
   
   // Better (1 query)
   const stats = await Deployment.findAll({
     attributes: [
       'status',
       [sequelize.fn('COUNT', '*'), 'count']
     ],
     group: ['status']
   });
   ```

### Index Coverage Analysis

**Current Indexes** (from table definitions):
```sql
credentials:
  - PRIMARY KEY (id)
  - INDEX (user_id)
  - INDEX (is_active)
  - INDEX (aws_account_id)

deployments:
  - PRIMARY KEY (id)
  - INDEX (user_id)
  - INDEX (credential_id)
  - INDEX (status)
  - INDEX (created_at)

deployment_logs:
  - PRIMARY KEY (id)
  - INDEX (deployment_id)
  - INDEX (created_at)
  - INDEX (level)

deployment_sql_scripts:
  - PRIMARY KEY (id)
  - INDEX (deployment_id)
  - INDEX (uploaded_by)
```

**Recommended Additional Indexes**:
```sql
-- For dashboard recent deployments query
CREATE INDEX idx_deployments_user_created ON deployments(user_id, created_at DESC);

-- For status filtering
CREATE INDEX idx_deployments_user_status ON deployments(user_id, status);

-- For credential lookups by cloud provider
CREATE INDEX idx_credentials_provider ON credentials(cloud_provider, user_id);

-- For log queries by level and deployment
CREATE INDEX idx_logs_deployment_level ON deployment_logs(deployment_id, level, created_at);
```

---

## Migration Strategy

### Migration Files (5 total)
```
backend/src/db/migrations/
├── 20250101000000-init.js                              [✓ Applied]
├── 20250101000001-add-missing-tables.js                [✓ Applied]
├── 20251124212328-create-deployment-sql-scripts.js     [✓ Applied]
├── 20251124212329-add-database-phases-to-deployment.js [✓ Applied - Fixed]
├── 20251126000000-add-approver-role.js                 [✓ Applied]
└── 20251126063400-add-cloud-provider-columns.js        [✓ Applied]
```

### Recent Migration Issues & Resolutions

#### Issue 1: Missing `cloud_provider` Column (Nov 26, 2025)
**Problem**: Sequelize models expected columns that didn't exist in database
- `credentials.cloud_provider`
- `credentials.vault_type`
- `credentials.secret_ref_id`
- `credentials.cloud_account_id`
- `credentials.cloud_region`
- `credentials.auth_tag`
- `deployments.cloud_provider`

**Root Cause**: Database schema out of sync with model definitions

**Resolution**: 
1. Applied SQL directly: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
2. Created migration with existence checks
3. Updated migration to be idempotent

**Lesson**: Migrations should always check for existing columns/tables

#### Issue 2: Blocking Migration (Nov 26, 2025)
**Problem**: `20251124212329-add-database-phases-to-deployment.js` failed
- Attempted to access non-existent `deployment_phase` column
- Blocked all subsequent migrations

**Resolution**: Added column existence check
```javascript
const table = await queryInterface.describeTable('deployments');
if (!table.deployment_phase) {
  console.log('deployment_phase column does not exist, skipping enum modification');
  return;
}
```

### Migration Best Practices (Implemented)
1. ✅ Use `IF NOT EXISTS` in raw SQL
2. ✅ Check column existence before modifications
3. ✅ Provide rollback (down) functions
4. ✅ Use transactions for multi-step migrations
5. ✅ Test migrations on copy of production data
6. ✅ Version migrations with timestamps

---

## Connection Pool Configuration

### Current Settings

#### Development
```javascript
pool: {
  max: 5,        // Maximum connections
  min: 0,        // Minimum connections (0 = create on demand)
  acquire: 30000, // Max time to get connection (30s)
  idle: 10000     // Max idle time before release (10s)
}
```

#### Production
```javascript
pool: {
  max: 20,       // Higher for concurrent requests
  min: 5,        // Keep 5 warm connections
  acquire: 30000,
  idle: 10000
}
```

### Connection Lifecycle
1. Request arrives → Check pool for available connection
2. If available → Reuse existing connection
3. If none available and < max → Create new connection
4. If at max → Wait up to 30s (acquire timeout)
5. After query → Connection returns to pool
6. If idle > 10s → Connection closes (unless < min)

### Pool Monitoring (Not Currently Implemented)
**Recommendation**: Add pool monitoring
```javascript
// Monitor pool health
setInterval(() => {
  const pool = sequelize.connectionManager.pool;
  logger.info('Connection Pool Stats', {
    size: pool.size,
    available: pool.available,
    using: pool.using,
    waiting: pool.waiting
  });
}, 60000); // Every minute
```

---

## Code Cohesion Analysis

### Module Organization: ✅ **Excellent**

#### Separation of Concerns
```
backend/src/
├── models/           # Data models & relationships (Single responsibility)
├── routes/           # API endpoints (One concern per file)
├── services/         # Business logic (Reusable functions)
├── middleware/       # Request processing (auth, errors, validation)
├── config/           # Configuration (database, env)
└── db/
    ├── migrations/   # Schema changes
    └── seeders/      # Test data
```

### Model Access Patterns: ✅ **Consistent**

All routes follow the same pattern:
```javascript
const { ModelName } = require('../models');
```

No direct database queries outside models (except migrations).

### Error Handling: ✅ **Standardized**

All routes use `asyncHandler` wrapper:
```javascript
router.get('/', authenticate, asyncHandler(async (req, res) => {
  // Query logic
  sendSuccess(res, data);
}));
```

### Authentication: ✅ **Centralized**

Single `authenticate` middleware used consistently:
```javascript
router.get('/protected', authenticate, asyncHandler(...));
```

### Logging: ✅ **Uniform**

Consistent logger usage:
```javascript
const { logger } = require('../services');
logger.info('Message', { context });
logger.error('Error', error);
```

### Transaction Support: ⚠️ **Missing**

**No transactions found in codebase** - Critical for:
1. Admin bulk deletes
2. Draft → Deployment conversion
3. Credential rotation
4. Multi-step script execution

**Recommendation**: Add transaction wrapper
```javascript
const executeInTransaction = async (operation) => {
  const t = await sequelize.transaction();
  try {
    const result = await operation(t);
    await t.commit();
    return result;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
```

### Query Optimization: ⚠️ **Needs Improvement**

**Issues Found**:
1. Multiple sequential queries that could be parallel
2. Missing eager loading for associations
3. No query result caching
4. Large result sets without pagination limits

---

## Recommendations

### High Priority (Implement Soon)

#### 1. Add Transaction Support
**Impact**: Data integrity  
**Effort**: Medium  
**Files to Update**:
- `routes/admin.js` - Bulk operations
- `routes/deployment-drafts.js` - Approval flow
- `routes/credentials.js` - Rotation
- `services/databaseScriptExecutor.js` - Multi-script execution

```javascript
// Example: Admin bulk delete with transaction
router.delete('/deployments', authenticate, authorize(['admin']), asyncHandler(async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const deploymentIds = await Deployment.findAll({ attributes: ['id'], transaction: t });
    await DeploymentSqlScript.destroy({ where: { deploymentId: { [Op.in]: deploymentIds } }, transaction: t });
    const count = await Deployment.destroy({ where: {}, transaction: t });
    await t.commit();
    sendSuccess(res, { deletedCount: count });
  } catch (error) {
    await t.rollback();
    throw error;
  }
}));
```

#### 2. Implement Connection Pool Monitoring
**Impact**: Performance visibility  
**Effort**: Low  
**File**: `backend/src/config/database.js`

```javascript
// Add after sequelize initialization
if (env === 'production') {
  setInterval(() => {
    const pool = sequelize.connectionManager.pool;
    logger.info('DB Pool Health', {
      size: pool.size,
      available: pool.available,
      using: pool.using,
      waiting: pool.waiting
    });
  }, 60000);
}
```

#### 3. Add Composite Indexes
**Impact**: Query performance (20-50% faster)  
**Effort**: Low  
**Create Migration**: `20251127000000-add-composite-indexes.js`

```sql
CREATE INDEX idx_deployments_user_created ON deployments(user_id, created_at DESC);
CREATE INDEX idx_deployments_user_status ON deployments(user_id, status);
CREATE INDEX idx_credentials_provider ON credentials(cloud_provider, user_id);
CREATE INDEX idx_logs_deployment_level ON deployment_logs(deployment_id, level, created_at);
```

#### 4. Optimize Dashboard Queries
**Impact**: Faster page loads  
**Effort**: Low  
**File**: `backend/src/routes/status.js`

Replace multiple count queries with single aggregate query.

### Medium Priority (Plan for Next Sprint)

#### 5. Implement Query Result Caching
**Impact**: Reduced database load  
**Effort**: Medium  
**Tools**: Redis or in-memory cache

Cache frequently accessed, infrequently changing data:
- User profile data (5 min TTL)
- Credential metadata (1 min TTL)
- Dashboard stats (30 sec TTL)

#### 6. Add Database Health Endpoint
**Impact**: Monitoring & alerting  
**Effort**: Low  
**File**: `backend/src/routes/status.js`

```javascript
router.get('/health/database', asyncHandler(async (req, res) => {
  const checks = await Promise.all([
    sequelize.authenticate().then(() => ({ connection: 'ok' })),
    Deployment.count().then(count => ({ rowCount: count })),
    sequelize.query('SELECT pg_database_size(current_database())').then(([result]) => ({ 
      size: result[0].pg_database_size 
    }))
  ]);
  sendSuccess(res, Object.assign({}, ...checks));
}));
```

#### 7. Implement Soft Deletes
**Impact**: Data recovery & audit trail  
**Effort**: Medium  
**Models**: Deployment, Credential, DeploymentDraft

Add `deletedAt` column and use Sequelize's `paranoid: true` option.

### Low Priority (Nice to Have)

#### 8. Add Query Performance Logging
**Impact**: Identify slow queries  
**Effort**: Low  
**File**: `backend/src/config/database.js`

```javascript
logging: (sql, timing) => {
  if (timing > 1000) {
    logger.warn('Slow Query', { sql, timing });
  }
}
```

#### 9. Implement Read Replicas
**Impact**: Scalability  
**Effort**: High  
**When**: Database CPU > 70% sustained

Use Sequelize's read/write replica configuration.

#### 10. Add Database Backup Verification
**Impact**: Disaster recovery confidence  
**Effort**: Medium  
**Automation**: Daily restore test to staging

---

## Summary

### Current State: ✅ **GOOD**
- Clean model architecture
- Consistent patterns across codebase
- Proper error handling
- Good separation of concerns
- Adequate indexing

### Critical Issues: ⚠️ **1 Found**
- **No transaction support** for multi-step operations

### Performance: ⚠️ **NEEDS OPTIMIZATION**
- Missing composite indexes
- Suboptimal query patterns in dashboard
- No connection pool monitoring

### Next Steps:
1. ✅ Fix schema mismatches (COMPLETED Nov 26, 2025)
2. 🔄 Add transaction support (HIGH PRIORITY)
3. 🔄 Create composite indexes (HIGH PRIORITY)
4. 🔄 Implement pool monitoring (HIGH PRIORITY)

---

**Document Version**: 1.0  
**Last Review**: November 26, 2025  
**Next Review**: December 15, 2025  
**Maintainer**: Development Team
