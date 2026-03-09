# Database Script Deployment Feature 🚀

## Quick Start

### Backend is 100% Complete ✅

The backend implementation is production-ready and includes:
- ✅ SQL script storage and management
- ✅ Automatic execution after RDS creation
- ✅ Manual execution for incremental updates
- ✅ PostgreSQL, MySQL, and SQL Server support
- ✅ Transaction support with rollback
- ✅ Real-time progress via WebSocket
- ✅ Comprehensive error handling

---

## How It Works

### 1️⃣ Initial Deployment

```
User creates deployment with RDS enabled
    ↓
User uploads SQL scripts via API
    ↓
Terraform creates RDS instance
    ↓
Backend automatically executes scripts
    ↓
Database initialized with schema/data
```

### 2️⃣ Incremental Updates

```
User uploads additional scripts
    ↓
Scripts stored with status='pending'
    ↓
Admin triggers execution
    ↓
Only pending scripts execute
    ↓
Database schema updated
```

---

## API Endpoints

### Upload Scripts
```http
POST /api/deployments/:deploymentId/sql-scripts
Authorization: Bearer <token>

{
  "scripts": [
    {
      "scriptName": "001_create_tables.sql",
      "scriptContent": "CREATE TABLE users (...);",
      "executionOrder": 0,
      "haltOnError": true,
      "runInTransaction": true,
      "timeoutSeconds": 300
    }
  ]
}
```

### List Scripts
```http
GET /api/deployments/:deploymentId/sql-scripts
Authorization: Bearer <token>
```

### Get Single Script
```http
GET /api/deployments/:deploymentId/sql-scripts/:scriptId
Authorization: Bearer <token>
```

### Update Script (pending only)
```http
PUT /api/deployments/:deploymentId/sql-scripts/:scriptId
Authorization: Bearer <token>

{
  "scriptName": "001_create_tables_v2.sql",
  "haltOnError": false
}
```

### Delete Script (pending only)
```http
DELETE /api/deployments/:deploymentId/sql-scripts/:scriptId
Authorization: Bearer <token>
```

### Execute Scripts (admin only)
```http
POST /api/deployments/:deploymentId/sql-scripts/execute
Authorization: Bearer <admin-token>
```

---

## Testing

### Run API Tests

1. Update credentials in `test-db-scripts-api.js`:
   ```javascript
   const AUTH_TOKEN = 'your_jwt_token';
   const DEPLOYMENT_ID = 'your_deployment_id';
   ```

2. Execute tests:
   ```bash
   cd backend
   node test-db-scripts-api.js
   ```

### Manual Testing with cURL

```bash
# Upload scripts
curl -X POST http://localhost:5000/api/deployments/{id}/sql-scripts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scripts": [
      {
        "scriptName": "001_init.sql",
        "scriptContent": "CREATE TABLE test (id SERIAL PRIMARY KEY);",
        "executionOrder": 0
      }
    ]
  }'

# List scripts
curl http://localhost:5000/api/deployments/{id}/sql-scripts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Execute scripts (admin)
curl -X POST http://localhost:5000/api/deployments/{id}/sql-scripts/execute \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## Database Schema

### Table: deployment_sql_scripts

| Column                 | Type        | Description                              |
|------------------------|-------------|------------------------------------------|
| id                     | UUID        | Primary key                              |
| deployment_id          | UUID        | Foreign key to deployments               |
| script_name            | VARCHAR     | SQL script filename                      |
| script_content         | TEXT        | Full SQL script content                  |
| execution_order        | INTEGER     | Order of execution (0-based)             |
| status                 | VARCHAR     | pending/running/completed/failed/skipped |
| executed_at            | TIMESTAMP   | When script was executed                 |
| execution_duration_ms  | INTEGER     | How long execution took                  |
| rows_affected          | INTEGER     | Number of rows modified                  |
| error_message          | TEXT        | Error summary (if failed)                |
| error_stack            | TEXT        | Full error stack trace                   |
| halt_on_error          | BOOLEAN     | Stop execution on error?                 |
| run_in_transaction     | BOOLEAN     | Run in transaction?                      |
| timeout_seconds        | INTEGER     | Script timeout (default 300)             |
| uploaded_by            | UUID        | Foreign key to users                     |
| created_at             | TIMESTAMP   | Creation timestamp                       |
| updated_at             | TIMESTAMP   | Last update timestamp                    |

---

## Configuration

### Per-Script Settings

```javascript
{
  "scriptName": "001_create_users.sql",
  "scriptContent": "CREATE TABLE users (...);",
  "executionOrder": 0,          // Order (0, 1, 2, ...)
  "haltOnError": true,           // Stop if this script fails?
  "runInTransaction": true,      // Run in transaction (auto-rollback on error)?
  "timeoutSeconds": 300          // Max execution time (5 minutes default)
}
```

### Best Practices

**✅ DO:**
- Number your scripts: `001_`, `002_`, `003_`
- Use idempotent SQL: `CREATE TABLE IF NOT EXISTS`
- Set `haltOnError=false` for non-critical scripts
- Use transactions for data modifications
- Test scripts locally before uploading
- Keep scripts focused (one task per script)

**❌ DON'T:**
- Upload scripts with syntax errors
- Use extremely long timeouts (use pagination instead)
- Execute DDL outside transactions (PostgreSQL only)
- Hardcode sensitive data in scripts
- Mix DDL and DML in same script (unless transactional)

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (TODO)                         │
│  - DeploymentWizardMultiCloud.jsx (Add Step 8)             │
│  - DeploymentStatus.jsx (Display script status)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (COMPLETE)                      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │ Routes: sqlScripts.js                            │     │
│  │ - POST /sql-scripts (upload)                     │     │
│  │ - GET /sql-scripts (list)                        │     │
│  │ - PUT /sql-scripts/:id (update)                  │     │
│  │ - DELETE /sql-scripts/:id (delete)               │     │
│  │ - POST /sql-scripts/execute (trigger)            │     │
│  └──────────────────────────────────────────────────┘     │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────┐     │
│  │ Services                                         │     │
│  - databaseScriptExecutor.js (execution engine)   │     │
│  - awsSecrets.js (credentials)                    │     │
│  - Supports: PostgreSQL, MySQL, SQL Server        │     │
│  └──────────────────────────────────────────────────┘     │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────┐     │
│  │ Models                                           │     │
│  │ - DeploymentSqlScript.js (Sequelize model)      │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL                             │
│  - deployment_sql_scripts table                             │
│  - deployments table (with new phases)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AWS RDS                                │
│  - PostgreSQL, MySQL, or SQL Server instance                │
│  - Created by Terraform                                     │
│  - Credentials in Secrets Manager                           │
└─────────────────────────────────────────────────────────────┘
```

### Execution Flow

```
1. Terraform completes (Phase 6: cluster-ready)
         ↓
2. Backend checks: enableRDS? && pendingScripts > 0?
         ↓
3. Update phase: database-init
         ↓
4. Retrieve RDS endpoint from Terraform outputs
         ↓
5. Retrieve password from AWS Secrets Manager
         ↓
6. Connect to RDS (PostgreSQL/MySQL)
         ↓
7. Execute scripts sequentially (ordered by execution_order)
         ↓
8. For each script:
   - Update status: running
   - Execute SQL (with/without transaction)
   - Log duration, rows affected
   - Update status: completed/failed
         ↓
9. Update phase: database-ready
         ↓
10. Emit WebSocket events for real-time progress
```

---

## Deployment Phases

New phases added to `enum_deployments_deployment_phase`:

| Phase          | Description                           |
|----------------|---------------------------------------|
| database-init  | Executing SQL scripts against RDS     |
| database-ready | SQL scripts completed successfully    |

Existing phases remain unchanged:
- created
- terraform-init
- terraform-plan
- terraform-apply
- cluster-ready
- monitoring-setup
- database-setup
- completed
- rollback-started
- rollback-complete
- failed

---

## WebSocket Events

### Phase Updates
```javascript
{
  type: 'phase-update',
  deploymentId: 'abc-123',
  phase: 'database-init',
  data: { status: 'starting' }
}
```

### Log Messages
```javascript
{
  type: 'log',
  deploymentId: 'abc-123',
  level: 'info',
  message: '✓ [1] 001_create_tables.sql completed (1250ms, 0 rows affected)',
  timestamp: '2025-01-15T10:30:00Z'
}
```

### Failure Notification
```javascript
{
  type: 'failure',
  deploymentId: 'abc-123',
  message: 'Script execution failed: syntax error',
  data: { phase: 'database-init' }
}
```

---

## Error Handling

### Non-Blocking Failures

Database script failures **do not fail** the entire deployment:

```javascript
try {
  await databaseScriptExecutor.executeScripts(deploymentId);
} catch (dbError) {
  // Log warning, but don't throw
  logger.error('Database initialization failed', { error: dbError.message });
  
  // User can manually re-execute
  await deploymentService.addDeploymentLog(
    deploymentId,
    'warning',
    'Database script execution failed. Scripts can be re-executed manually.'
  );
}
```

### Script-Level Error Handling

Per-script `haltOnError` flag:
- `true` (default) - Stop execution if this script fails
- `false` - Continue to next script even if this fails

Example use case:
```javascript
{
  "scriptName": "003_create_indexes.sql",
  "haltOnError": false,  // Continue even if indexes already exist
  "scriptContent": "CREATE INDEX idx_users_email ON users(email);"
}
```

### Transaction Rollback

Per-script `runInTransaction` flag:
- `true` (default) - Run in transaction, auto-rollback on error
- `false` - Execute without transaction (for DDL in some databases)

Example:
```javascript
// PostgreSQL - Run DDL in transaction
{
  "runInTransaction": true,
  "scriptContent": "CREATE TABLE users (...);"
}

// MySQL - DDL auto-commits, transaction not needed
{
  "runInTransaction": false,
  "scriptContent": "CREATE TABLE users (...);"
}

// SQL Server - Supports transactional DDL
{
  "runInTransaction": true,
  "scriptContent": "CREATE TABLE users (...);"
}
```

---

## Troubleshooting

### Issue: Scripts not executing automatically

**Check:**
1. Deployment has `enableRDS=true` in configuration
2. Scripts exist with `status='pending'`
3. Terraform completed successfully (Phase 6: cluster-ready)
4. Backend logs show Phase 7 execution

**Solution:**
```bash
# Manual trigger
curl -X POST http://localhost:5000/api/deployments/{id}/sql-scripts/execute \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Issue: Connection to RDS fails

**Check:**
1. RDS endpoint in Terraform outputs: `terraform output db_endpoint`
2. Secrets Manager secret exists: `terraform output db_password_secret_arn`
3. RDS security group allows backend inbound traffic
4. RDS is publicly accessible (or backend in same VPC)

**Debug:**
```javascript
// Check connection manually
const { Client } = require('pg');
const client = new Client({
  host: 'mydb.abc123.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'main',
  user: 'admin',
  password: 'YOUR_PASSWORD',
  ssl: { rejectUnauthorized: false }
});

await client.connect();
const result = await client.query('SELECT NOW()');
console.log('Connected:', result.rows[0]);
await client.end();
```

### Issue: Script syntax errors

**Check:**
1. Test script locally before upload
2. Use correct database engine syntax (PostgreSQL vs MySQL)
3. Check error_message in database

**Solution:**
```sql
-- Get error details
SELECT script_name, error_message, error_stack
FROM deployment_sql_scripts
WHERE deployment_id = 'abc-123' AND status = 'failed';

-- Fix script, upload new version, re-execute
-- (Delete old script first)
DELETE FROM deployment_sql_scripts WHERE id = 'xyz-789';
```

### Issue: Scripts timeout

**Check:**
1. Script complexity (large data operations?)
2. Current timeout setting (default 300s)
3. Database performance

**Solution:**
```javascript
// Increase timeout for specific script
{
  "scriptName": "999_large_data_import.sql",
  "timeoutSeconds": 1800,  // 30 minutes
  "scriptContent": "INSERT INTO users SELECT * FROM temp_users;"
}
```

---

## Security

### Credentials
- ✅ RDS passwords from AWS Secrets Manager (not hardcoded)
- ✅ JWT authentication required for all endpoints
- ✅ Admin-only manual execution

### SQL Injection
- ⚠️  Scripts executed as-is (not parameterized)
- ✅ Only admins/deployment owners can upload
- ✅ Mitigated by access control

### Network Security
- ✅ SSL/TLS for RDS connections
- ✅ RDS security groups restrict access
- ✅ Backend-to-RDS private networking (if in VPC)

---

## Performance

### Optimization Tips

1. **Batch Operations**: Group related statements
   ```sql
   -- Good: Single transaction
   BEGIN;
   CREATE TABLE users (...);
   CREATE TABLE posts (...);
   COMMIT;
   ```

2. **Indexes After Data**: Create indexes after bulk inserts
   ```javascript
   // Script 1: Insert data
   { "scriptName": "001_insert_data.sql", "executionOrder": 0 }
   
   // Script 2: Create indexes
   { "scriptName": "002_create_indexes.sql", "executionOrder": 1 }
   ```

3. **Idempotent Scripts**: Use IF NOT EXISTS
   ```sql
   CREATE TABLE IF NOT EXISTS users (...);
   CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
   ```

4. **Timeouts**: Set appropriate limits
   ```javascript
   { "timeoutSeconds": 60 }    // Fast scripts
   { "timeoutSeconds": 1800 }  // Data migrations
   ```

---

## Next Steps

### Frontend Implementation (4-5 hours)

1. **Wizard Step** (3-4 hours)
   - File: `frontend/src/pages/DeploymentWizardMultiCloud.jsx`
   - Add Step 8: "Database Scripts"
   - File upload, reordering, configuration

2. **Status Display** (1 hour)
   - File: `frontend/src/pages/DeploymentStatus.jsx`
   - Display script status, metadata, errors
   - Real-time updates via WebSocket

See: `DATABASE_SCRIPTS_IMPLEMENTATION_SUMMARY.md` → Section "Phase 4-5"

---

## Support

For questions or issues:
1. Check logs: `backend/logs/application.log`
2. Review WebSocket events in browser console
3. Query database: `deployment_sql_scripts` table
4. Check deployment logs: `deployment_logs` table

---

## License

Part of the Automated EKS Deployer project.
