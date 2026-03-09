# Database Script Deployment Feature - Implementation Roadmap

**Status**: 📋 Planned  
**Priority**: High  
**Estimated Effort**: 10-14 hours  
**Last Updated**: November 24, 2025

---

## 🎯 Overview

Add automated database SQL script execution as part of the deployment process. After infrastructure is provisioned (RDS created), automatically execute user-provided SQL scripts to initialize database schema, seed data, and apply migrations.

**Key Assumption**: Docker images already contain the application code. This feature focuses solely on database initialization/migration.

---

## 📊 Current State Analysis

### ✅ What Already Exists

1. **RDS Database Creation**
   - Location: `terraform/modules/aws_rds/`
   - Status: ✅ Fully functional
   - Outputs: `db_endpoint`, `db_port`, `db_name`, `db_password_secret_arn`

2. **Secrets Manager Integration**
   - RDS password stored in AWS Secrets Manager
   - Secret ARN available in Terraform outputs
   - Backend can retrieve secrets via AWS SDK

3. **Deployment Phases System**
   - Existing phases: `terraform-init`, `terraform-plan`, `terraform-apply`, `completed`
   - Can add new phase: `database-init`

4. **WebSocket Progress Tracking**
   - Real-time log streaming
   - Phase updates
   - Error notifications

### ❌ What's Missing

1. **SQL Script Storage**
   - No database table for scripts
   - No file upload endpoint
   - No script versioning

2. **SQL Execution Engine**
   - No PostgreSQL/MySQL client integration
   - No connection pooling
   - No transaction management

3. **Script Ordering & Dependencies**
   - No way to define execution order
   - No dependency resolution
   - No rollback support

4. **Frontend UI**
   - No script upload interface
   - No script editor
   - No execution logs viewer

---

## 🏗️ Architecture Design

### Database Script Execution Flow

```
Infrastructure Deployment Completes
    ↓
Status: completed
Terraform Outputs Available:
    - RDS Endpoint
    - Database Name
    - Secrets Manager ARN (password)
    ↓
NEW Phase: database-init (Auto-triggered)
    ↓
Step 1: Retrieve Database Credentials
    ├→ Get RDS endpoint from Terraform outputs
    ├→ Fetch password from Secrets Manager
    └→ Parse connection string
    ↓
Step 2: Validate Database Connection
    ├→ Attempt connection to RDS
    ├→ Verify credentials
    └→ Check database exists
    ↓
Step 3: Fetch SQL Scripts for Deployment
    ├→ Query deployment_sql_scripts table
    ├→ Order by execution_order ASC
    └→ Filter by status = 'pending'
    ↓
Step 4: Execute Scripts in Sequence
    ├→ FOR EACH script:
    │   ├→ Log: "Executing script: 001_create_schema.sql"
    │   ├→ Update status: 'running'
    │   ├→ Execute SQL via pg client
    │   ├→ Capture result (rowCount, duration)
    │   ├→ Update status: 'completed'
    │   └→ Log success
    │
    └→ ON ERROR:
        ├→ Update status: 'failed'
        ├→ Log error details
        ├→ DECIDE: halt_on_error?
        │   ├→ YES: Stop execution, mark deployment as 'database-init-failed'
        │   └→ NO: Continue to next script
        └→ WebSocket emit error event
    ↓
Step 5: Verify Database State
    ├→ Run validation queries (optional)
    ├→ Check table existence
    └→ Verify data integrity
    ↓
Step 6: Complete Phase
    ├→ Mark all scripts as 'completed'
    ├→ Update deployment phase to 'database-ready'
    ├→ Log: "Database initialized successfully"
    └→ Emit WebSocket completion event
    ↓
Continue to Next Phase (if any)
OR
Mark Deployment as 'completed'
```

---

## 📋 Implementation Plan

### Phase 1: Database Schema & Models (2 hours)

#### 1.1 Create SQL Scripts Table

**Migration**: `backend/migrations/YYYYMMDDHHMMSS-create-deployment-sql-scripts.js`

```sql
CREATE TABLE deployment_sql_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  script_name VARCHAR(255) NOT NULL,
  script_content TEXT NOT NULL,
  execution_order INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- pending, running, completed, failed, skipped
  
  -- Execution metadata
  executed_at TIMESTAMP WITH TIME ZONE,
  execution_duration_ms INT,
  rows_affected INT,
  error_message TEXT,
  error_stack TEXT,
  
  -- Configuration
  halt_on_error BOOLEAN DEFAULT TRUE,
  run_in_transaction BOOLEAN DEFAULT TRUE,
  timeout_seconds INT DEFAULT 300,
  
  -- Audit
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(deployment_id, script_name)
);

CREATE INDEX idx_deployment_sql_scripts_deployment ON deployment_sql_scripts(deployment_id);
CREATE INDEX idx_deployment_sql_scripts_status ON deployment_sql_scripts(status);
CREATE INDEX idx_deployment_sql_scripts_order ON deployment_sql_scripts(deployment_id, execution_order);
```

#### 1.2 Create Sequelize Model

**File**: `backend/src/models/DeploymentSqlScript.js`

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeploymentSqlScript = sequelize.define(
    'DeploymentSqlScript',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      deploymentId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'deployment_id',
      },
      scriptName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'script_name',
      },
      scriptContent: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'script_content',
      },
      executionOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'execution_order',
      },
      status: {
        type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'skipped'),
        defaultValue: 'pending',
      },
      executedAt: {
        type: DataTypes.DATE,
        field: 'executed_at',
      },
      executionDurationMs: {
        type: DataTypes.INTEGER,
        field: 'execution_duration_ms',
      },
      rowsAffected: {
        type: DataTypes.INTEGER,
        field: 'rows_affected',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        field: 'error_message',
      },
      errorStack: {
        type: DataTypes.TEXT,
        field: 'error_stack',
      },
      haltOnError: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'halt_on_error',
      },
      runInTransaction: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'run_in_transaction',
      },
      timeoutSeconds: {
        type: DataTypes.INTEGER,
        defaultValue: 300,
        field: 'timeout_seconds',
      },
      uploadedBy: {
        type: DataTypes.UUID,
        field: 'uploaded_by',
      },
    },
    {
      tableName: 'deployment_sql_scripts',
      underscored: true,
      timestamps: true,
    }
  );

  DeploymentSqlScript.associate = (models) => {
    DeploymentSqlScript.belongsTo(models.Deployment, {
      foreignKey: 'deploymentId',
      as: 'deployment',
    });
    DeploymentSqlScript.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader',
    });
  };

  return DeploymentSqlScript;
};
```

#### 1.3 Add Deployment Phase

**File**: `backend/src/models/Deployment.js`

Update `deploymentPhase` enum to include:
```javascript
deploymentPhase: {
  type: DataTypes.ENUM(
    'created',
    'terraform-init',
    'terraform-plan',
    'terraform-apply',
    'cluster-ready',
    'database-init',        // NEW
    'database-ready',       // NEW
    'monitoring-setup',
    'completed',
    'rollback-started',
    'rollback-complete',
    'failed'
  ),
  defaultValue: 'created',
}
```

---

### Phase 2: SQL Execution Service (4-5 hours)

#### 2.1 Create Database Script Executor Service

**File**: `backend/src/services/databaseScriptExecutor.js` (NEW - ~300 lines)

```javascript
const { Client } = require('pg');
const logger = require('./logger');
const { DeploymentSqlScript, Deployment } = require('../models');
const { getSecretFromSecretsManager } = require('./awsSecrets');
const websocketServer = require('./websocketServer');

class DatabaseScriptExecutor {
  /**
   * Execute all SQL scripts for a deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {object} Execution results
   */
  async executeScripts(deploymentId) {
    try {
      const deployment = await Deployment.findByPk(deploymentId);
      
      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      logger.info(`[DBScriptExecutor] Starting script execution for deployment ${deploymentId}`);
      
      // Emit phase update
      websocketServer.emitPhaseUpdate(deploymentId, 'database-init', { status: 'starting' });

      // Get database connection info
      const dbConfig = await this.getDatabaseConfig(deployment);
      
      // Fetch scripts
      const scripts = await DeploymentSqlScript.findAll({
        where: { deploymentId },
        order: [['executionOrder', 'ASC']],
      });

      if (scripts.length === 0) {
        logger.info(`[DBScriptExecutor] No scripts found for deployment ${deploymentId}`);
        return { success: true, message: 'No scripts to execute' };
      }

      logger.info(`[DBScriptExecutor] Found ${scripts.length} scripts to execute`);

      // Execute scripts in order
      const results = [];
      for (const script of scripts) {
        const result = await this.executeScript(script, dbConfig, deploymentId);
        results.push(result);

        // Stop on error if configured
        if (!result.success && script.haltOnError) {
          logger.error(`[DBScriptExecutor] Halting execution due to error in script: ${script.scriptName}`);
          throw new Error(`Script execution failed: ${script.scriptName}`);
        }
      }

      // Emit completion
      websocketServer.emitPhaseUpdate(deploymentId, 'database-init', { status: 'completed' });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `Database initialization completed. ${results.filter(r => r.success).length}/${results.length} scripts successful`,
        timestamp: new Date(),
      });

      return {
        success: true,
        totalScripts: scripts.length,
        successfulScripts: results.filter(r => r.success).length,
        failedScripts: results.filter(r => !r.success).length,
        results,
      };

    } catch (error) {
      logger.error(`[DBScriptExecutor] Script execution failed`, {
        deploymentId,
        error: error.message,
      });

      websocketServer.emitFailure(deploymentId, error.message, { phase: 'database-init' });
      throw error;
    }
  }

  /**
   * Execute a single SQL script
   * @param {object} script - DeploymentSqlScript instance
   * @param {object} dbConfig - Database connection config
   * @param {string} deploymentId - Deployment ID
   * @returns {object} Execution result
   */
  async executeScript(script, dbConfig, deploymentId) {
    const startTime = Date.now();
    let client;

    try {
      logger.info(`[DBScriptExecutor] Executing script: ${script.scriptName}`);

      // Update status
      await script.update({ status: 'running' });

      // Emit log
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `Executing SQL script: ${script.scriptName}`,
        timestamp: new Date(),
      });

      // Create database connection
      client = new Client(dbConfig);
      await client.connect();

      // Set statement timeout
      if (script.timeoutSeconds) {
        await client.query(`SET statement_timeout = ${script.timeoutSeconds * 1000}`);
      }

      // Execute script
      let result;
      if (script.runInTransaction) {
        await client.query('BEGIN');
        try {
          result = await client.query(script.scriptContent);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } else {
        result = await client.query(script.scriptContent);
      }

      const duration = Date.now() - startTime;

      // Update script with success
      await script.update({
        status: 'completed',
        executedAt: new Date(),
        executionDurationMs: duration,
        rowsAffected: result.rowCount,
        errorMessage: null,
        errorStack: null,
      });

      logger.info(`[DBScriptExecutor] Script completed: ${script.scriptName}`, {
        duration: `${duration}ms`,
        rowsAffected: result.rowCount,
      });

      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `✓ Script completed: ${script.scriptName} (${duration}ms, ${result.rowCount} rows affected)`,
        timestamp: new Date(),
      });

      return {
        success: true,
        scriptName: script.scriptName,
        duration,
        rowsAffected: result.rowCount,
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`[DBScriptExecutor] Script failed: ${script.scriptName}`, {
        error: error.message,
        duration: `${duration}ms`,
      });

      // Update script with failure
      await script.update({
        status: 'failed',
        executedAt: new Date(),
        executionDurationMs: duration,
        errorMessage: error.message,
        errorStack: error.stack,
      });

      websocketServer.emitLog(deploymentId, {
        level: 'error',
        message: `✗ Script failed: ${script.scriptName} - ${error.message}`,
        timestamp: new Date(),
      });

      return {
        success: false,
        scriptName: script.scriptName,
        duration,
        error: error.message,
      };

    } finally {
      if (client) {
        await client.end();
      }
    }
  }

  /**
   * Get database configuration from deployment
   * @param {object} deployment - Deployment instance
   * @returns {object} Database connection config
   */
  async getDatabaseConfig(deployment) {
    const outputs = deployment.terraformOutputs || {};

    // Get RDS endpoint
    const dbEndpoint = outputs.db_endpoint || outputs.rds_endpoint;
    if (!dbEndpoint) {
      throw new Error('RDS endpoint not found in Terraform outputs');
    }

    // Parse endpoint (format: hostname:port)
    const [host, port] = dbEndpoint.split(':');

    // Get password from Secrets Manager
    const secretArn = outputs.db_password_secret_arn || outputs.rds_password_secret_arn;
    if (!secretArn) {
      throw new Error('Database password secret ARN not found in Terraform outputs');
    }

    const password = await getSecretFromSecretsManager(secretArn);

    // Get database name from configuration
    const config = deployment.configuration || {};
    const database = config.dbName || outputs.db_name || 'main';
    const username = config.dbUsername || outputs.db_username || 'admin';

    return {
      host: host,
      port: parseInt(port) || 5432,
      database: database,
      user: username,
      password: password,
      ssl: {
        rejectUnauthorized: false, // RDS uses SSL by default
      },
      connectionTimeoutMillis: 10000,
    };
  }

  /**
   * Validate database connection
   * @param {object} dbConfig - Database connection config
   * @returns {boolean} Connection valid
   */
  async validateConnection(dbConfig) {
    let client;
    try {
      client = new Client(dbConfig);
      await client.connect();
      const result = await client.query('SELECT NOW()');
      logger.info('[DBScriptExecutor] Database connection validated', {
        serverTime: result.rows[0].now,
      });
      return true;
    } catch (error) {
      logger.error('[DBScriptExecutor] Database connection failed', {
        error: error.message,
      });
      throw error;
    } finally {
      if (client) {
        await client.end();
      }
    }
  }
}

module.exports = new DatabaseScriptExecutor();
```

#### 2.2 Add AWS Secrets Helper

**File**: `backend/src/services/awsSecrets.js` (Update or create)

```javascript
const AWS = require('aws-sdk');
const logger = require('./logger');

/**
 * Get secret value from AWS Secrets Manager
 * @param {string} secretArn - Secret ARN
 * @returns {string} Secret value
 */
async function getSecretFromSecretsManager(secretArn) {
  try {
    const secretsManager = new AWS.SecretsManager({
      region: secretArn.split(':')[3], // Extract region from ARN
    });

    const data = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();

    if ('SecretString' in data) {
      return data.SecretString;
    } else {
      const buff = Buffer.from(data.SecretBinary, 'base64');
      return buff.toString('ascii');
    }
  } catch (error) {
    logger.error('Failed to retrieve secret from Secrets Manager', {
      secretArn,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  getSecretFromSecretsManager,
};
```

#### 2.3 Install Dependencies

```bash
npm install pg
```

---

### Phase 3: Backend API Endpoints (2-3 hours)

#### 3.1 Create SQL Scripts Routes

**File**: `backend/src/routes/sqlScripts.js` (NEW - ~200 lines)

```javascript
const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { DeploymentSqlScript, Deployment } = require('../models');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const logger = require('../services/logger');

/**
 * POST /api/deployments/:deploymentId/sql-scripts
 * Upload SQL scripts for a deployment
 */
router.post(
  '/:deploymentId/sql-scripts',
  authenticate,
  async (req, res) => {
    try {
      const { deploymentId } = req.params;
      const { scripts } = req.body; // Array of { name, content, order, haltOnError }

      // Verify deployment exists and user owns it
      const deployment = await Deployment.findOne({
        where: {
          id: deploymentId,
          userId: req.user.id,
        },
      });

      if (!deployment) {
        return sendError(res, 'Deployment not found', 404);
      }

      // Validate scripts
      if (!Array.isArray(scripts) || scripts.length === 0) {
        return sendError(res, 'Scripts array is required', 400);
      }

      // Create script records
      const createdScripts = [];
      for (const [index, script] of scripts.entries()) {
        const sqlScript = await DeploymentSqlScript.create({
          deploymentId,
          scriptName: script.name,
          scriptContent: script.content,
          executionOrder: script.order !== undefined ? script.order : index,
          haltOnError: script.haltOnError !== undefined ? script.haltOnError : true,
          runInTransaction: script.runInTransaction !== undefined ? script.runInTransaction : true,
          timeoutSeconds: script.timeoutSeconds || 300,
          uploadedBy: req.user.id,
        });

        createdScripts.push(sqlScript);
      }

      logger.info(`SQL scripts uploaded`, {
        deploymentId,
        userId: req.user.id,
        count: createdScripts.length,
      });

      return sendSuccess(res, {
        message: `${createdScripts.length} SQL scripts uploaded successfully`,
        scripts: createdScripts,
      });

    } catch (error) {
      logger.error('Failed to upload SQL scripts', { error: error.message });
      return sendError(res, 'Failed to upload SQL scripts', 500);
    }
  }
);

/**
 * GET /api/deployments/:deploymentId/sql-scripts
 * Get all SQL scripts for a deployment
 */
router.get(
  '/:deploymentId/sql-scripts',
  authenticate,
  async (req, res) => {
    try {
      const { deploymentId } = req.params;

      const scripts = await DeploymentSqlScript.findAll({
        where: { deploymentId },
        order: [['executionOrder', 'ASC']],
        attributes: {
          exclude: ['scriptContent'], // Don't send full content in list
        },
      });

      return sendSuccess(res, { scripts });

    } catch (error) {
      logger.error('Failed to fetch SQL scripts', { error: error.message });
      return sendError(res, 'Failed to fetch SQL scripts', 500);
    }
  }
);

/**
 * GET /api/deployments/:deploymentId/sql-scripts/:scriptId
 * Get single SQL script with full content
 */
router.get(
  '/:deploymentId/sql-scripts/:scriptId',
  authenticate,
  async (req, res) => {
    try {
      const { scriptId } = req.params;

      const script = await DeploymentSqlScript.findByPk(scriptId);

      if (!script) {
        return sendError(res, 'Script not found', 404);
      }

      return sendSuccess(res, { script });

    } catch (error) {
      logger.error('Failed to fetch SQL script', { error: error.message });
      return sendError(res, 'Failed to fetch SQL script', 500);
    }
  }
);

/**
 * PUT /api/deployments/:deploymentId/sql-scripts/:scriptId
 * Update SQL script
 */
router.put(
  '/:deploymentId/sql-scripts/:scriptId',
  authenticate,
  async (req, res) => {
    try {
      const { scriptId } = req.params;
      const { name, content, order, haltOnError, runInTransaction } = req.body;

      const script = await DeploymentSqlScript.findByPk(scriptId);

      if (!script) {
        return sendError(res, 'Script not found', 404);
      }

      // Only allow updates if not executed
      if (script.status !== 'pending') {
        return sendError(res, 'Cannot update script that has been executed', 400);
      }

      await script.update({
        ...(name && { scriptName: name }),
        ...(content && { scriptContent: content }),
        ...(order !== undefined && { executionOrder: order }),
        ...(haltOnError !== undefined && { haltOnError }),
        ...(runInTransaction !== undefined && { runInTransaction }),
      });

      return sendSuccess(res, { message: 'Script updated', script });

    } catch (error) {
      logger.error('Failed to update SQL script', { error: error.message });
      return sendError(res, 'Failed to update SQL script', 500);
    }
  }
);

/**
 * DELETE /api/deployments/:deploymentId/sql-scripts/:scriptId
 * Delete SQL script
 */
router.delete(
  '/:deploymentId/sql-scripts/:scriptId',
  authenticate,
  async (req, res) => {
    try {
      const { scriptId } = req.params;

      const script = await DeploymentSqlScript.findByPk(scriptId);

      if (!script) {
        return sendError(res, 'Script not found', 404);
      }

      // Only allow deletion if not executed
      if (script.status !== 'pending') {
        return sendError(res, 'Cannot delete script that has been executed', 400);
      }

      await script.destroy();

      return sendSuccess(res, { message: 'Script deleted' });

    } catch (error) {
      logger.error('Failed to delete SQL script', { error: error.message });
      return sendError(res, 'Failed to delete SQL script', 500);
    }
  }
);

/**
 * POST /api/deployments/:deploymentId/sql-scripts/execute
 * Trigger SQL script execution (manual trigger)
 */
router.post(
  '/:deploymentId/sql-scripts/execute',
  authenticate,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { deploymentId } = req.params;
      const databaseScriptExecutor = require('../services/databaseScriptExecutor');

      // Start async execution
      databaseScriptExecutor.executeScripts(deploymentId).catch(error => {
        logger.error('Script execution failed', { deploymentId, error: error.message });
      });

      return sendSuccess(res, {
        message: 'Script execution initiated',
        deploymentId,
      });

    } catch (error) {
      logger.error('Failed to trigger script execution', { error: error.message });
      return sendError(res, 'Failed to trigger script execution', 500);
    }
  }
);

module.exports = router;
```

#### 3.2 Register Routes

**File**: `backend/src/server.js`

```javascript
// Add after other route registrations
const sqlScriptsRoutes = require('./routes/sqlScripts');
app.use('/api/deployments', sqlScriptsRoutes);
```

---

### Phase 4: Integration with Deployment Flow (2 hours)

#### 4.1 Update Terraform Execution Flow

**File**: `backend/src/routes/deployments.js`

Add database initialization after Terraform apply completes:

```javascript
async function startTerraformExecution(deployment) {
  const { terraformExecutor, deploymentService } = require('../services');
  const databaseScriptExecutor = require('../services/databaseScriptExecutor');

  try {
    // ... existing Terraform execution code ...

    // After terraform apply completes successfully
    if (result.success) {
      logger.info(`[Terraform] Apply completed successfully for deployment ${deployment.id}`);
      
      await deploymentService.completeDeployment(deployment.id, outputs);

      // NEW: Check if there are SQL scripts to execute
      const scriptsCount = await DeploymentSqlScript.count({
        where: { deploymentId: deployment.id, status: 'pending' }
      });

      if (scriptsCount > 0 && deployment.configuration.enableRDS) {
        logger.info(`[Deployment] Starting database initialization for ${deployment.id}`);
        
        // Update phase
        await deploymentService.updateDeploymentPhase(deployment.id, 'database-init');
        
        // Execute SQL scripts
        try {
          await databaseScriptExecutor.executeScripts(deployment.id);
          
          // Update phase to database-ready
          await deploymentService.updateDeploymentPhase(deployment.id, 'database-ready');
          
          logger.info(`[Deployment] Database initialization completed for ${deployment.id}`);
          
        } catch (dbError) {
          logger.error(`[Deployment] Database initialization failed`, {
            deploymentId: deployment.id,
            error: dbError.message,
          });
          
          await deploymentService.addDeploymentLog(
            deployment.id,
            'error',
            `Database initialization failed: ${dbError.message}`
          );
          
          // Don't fail the entire deployment, just log the error
          // User can retry script execution manually
        }
      } else {
        logger.info(`[Deployment] No SQL scripts to execute or RDS not enabled`);
      }
    }

  } catch (error) {
    // ... existing error handling ...
  }
}
```

---

### Phase 5: Frontend UI (3-4 hours)

#### 5.1 Add SQL Scripts Step to Deployment Wizard

**File**: `frontend/src/pages/DeploymentWizardMultiCloud.jsx`

Add new step (Step 8: "Database Scripts"):

```jsx
// Add to steps array
const steps = [
  'Cloud Provider',
  'Credentials', 
  'Cluster Configuration',
  'Networking',
  'Additional Resources',
  'Storage & Registry',
  'Database Configuration',
  'Database Scripts',  // NEW
  'Review & Deploy'
];

// Add to formData state
const [formData, setFormData] = useState({
  // ... existing fields ...
  sqlScripts: [],  // NEW: Array of { name, content, order, haltOnError }
});

// Add SQL Scripts step component
const renderDatabaseScriptsStep = () => {
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const newScripts = [];

    for (const [index, file] of files.entries()) {
      const content = await file.text();
      newScripts.push({
        name: file.name,
        content: content,
        order: formData.sqlScripts.length + index,
        haltOnError: true,
        runInTransaction: true,
      });
    }

    onChange('sqlScripts', [...formData.sqlScripts, ...newScripts]);
  };

  const handleScriptRemove = (index) => {
    const updated = formData.sqlScripts.filter((_, i) => i !== index);
    onChange('sqlScripts', updated);
  };

  const handleScriptReorder = (index, direction) => {
    const scripts = [...formData.sqlScripts];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < scripts.length) {
      [scripts[index], scripts[newIndex]] = [scripts[newIndex], scripts[index]];
      
      // Update order values
      scripts.forEach((script, i) => {
        script.order = i;
      });
      
      onChange('sqlScripts', scripts);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Database Initialization Scripts (Optional)
      </Typography>
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Upload SQL scripts to initialize your database schema and seed data after RDS is created.
        Scripts will be executed in the order shown.
      </Typography>

      {!formData.enableRDS && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Database configuration is not enabled. Enable RDS in the Database Configuration step to use SQL scripts.
        </Alert>
      )}

      {/* Upload button */}
      <Box sx={{ mb: 3 }}>
        <input
          type="file"
          accept=".sql"
          multiple
          style={{ display: 'none' }}
          id="sql-file-upload"
          onChange={handleFileUpload}
          disabled={!formData.enableRDS}
        />
        <label htmlFor="sql-file-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUploadIcon />}
            disabled={!formData.enableRDS}
          >
            Upload SQL Scripts
          </Button>
        </label>
        <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
          Accepts .sql files. You can upload multiple files at once.
        </Typography>
      </Box>

      {/* Scripts list */}
      {formData.sqlScripts.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            SQL Scripts ({formData.sqlScripts.length})
          </Typography>
          
          <List>
            {formData.sqlScripts.map((script, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      onClick={() => handleScriptReorder(index, 'up')}
                      disabled={index === 0}
                      size="small"
                    >
                      <ArrowUpwardIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleScriptReorder(index, 'down')}
                      disabled={index === formData.sqlScripts.length - 1}
                      size="small"
                    >
                      <ArrowDownwardIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleScriptRemove(index)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={`#${index + 1}`} size="small" />
                      <Typography variant="body2">{script.name}</Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {script.content.length} characters
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={script.haltOnError ? "Halt on error" : "Continue on error"} 
                          size="small" 
                          variant="outlined"
                        />
                        <Chip 
                          label={script.runInTransaction ? "Transactional" : "Non-transactional"} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {formData.sqlScripts.length === 0 && formData.enableRDS && (
        <Alert severity="info">
          No SQL scripts uploaded. You can skip this step and add scripts later, or deploy without database initialization.
        </Alert>
      )}
    </Box>
  );
};

// Add to step rendering
const renderStep = () => {
  switch (activeStep) {
    // ... existing cases ...
    case 7:
      return renderDatabaseScriptsStep();
    case 8:
      return renderReviewStep();
    default:
      return null;
  }
};
```

#### 5.2 Update Deployment Handler

Add SQL scripts to deployment payload:

```javascript
const handleDeploy = async () => {
  try {
    setDeploying(true);

    const deploymentPayload = {
      // ... existing fields ...
      sqlScripts: formData.sqlScripts,  // NEW
    };

    const response = await api.post('/deployments', deploymentPayload);
    const deploymentId = response.data.data.deployment.id;

    // Upload SQL scripts if any
    if (formData.sqlScripts.length > 0) {
      await api.post(`/deployments/${deploymentId}/sql-scripts`, {
        scripts: formData.sqlScripts,
      });
    }

    // Navigate to status page
    navigate(`/deployment-status/${deploymentId}`);

  } catch (error) {
    console.error('Deployment failed:', error);
    alert('Deployment failed: ' + (error.response?.data?.error?.message || error.message));
  } finally {
    setDeploying(false);
  }
};
```

#### 5.3 Display Scripts in Deployment Status

**File**: `frontend/src/pages/DeploymentStatus.jsx`

Add section to show SQL script execution status:

```jsx
// Fetch SQL scripts
useEffect(() => {
  if (deployment?.id) {
    api.get(`/deployments/${deployment.id}/sql-scripts`)
      .then(response => {
        setSqlScripts(response.data.data.scripts);
      })
      .catch(error => {
        console.error('Failed to fetch SQL scripts:', error);
      });
  }
}, [deployment?.id]);

// Render SQL scripts section
{deployment.deploymentPhase === 'database-init' || deployment.deploymentPhase === 'database-ready' && (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Database Initialization
      </Typography>
      
      <List>
        {sqlScripts.map((script, index) => (
          <ListItem key={script.id}>
            <ListItemIcon>
              {script.status === 'completed' && <CheckCircleIcon color="success" />}
              {script.status === 'running' && <CircularProgress size={24} />}
              {script.status === 'failed' && <ErrorIcon color="error" />}
              {script.status === 'pending' && <ScheduleIcon color="disabled" />}
            </ListItemIcon>
            <ListItemText
              primary={`${index + 1}. ${script.scriptName}`}
              secondary={
                <>
                  <Typography variant="caption" display="block">
                    Status: {script.status}
                  </Typography>
                  {script.executedAt && (
                    <Typography variant="caption" display="block">
                      Executed: {new Date(script.executedAt).toLocaleString()}
                      {script.executionDurationMs && ` (${script.executionDurationMs}ms)`}
                      {script.rowsAffected && ` - ${script.rowsAffected} rows affected`}
                    </Typography>
                  )}
                  {script.errorMessage && (
                    <Typography variant="caption" display="block" color="error">
                      Error: {script.errorMessage}
                    </Typography>
                  )}
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </CardContent>
  </Card>
)}
```

---

## 🧪 Testing Strategy

### Unit Tests

1. **DatabaseScriptExecutor Service**
   - Test script execution with mock pg client
   - Test error handling
   - Test transaction rollback
   - Test timeout handling

2. **API Endpoints**
   - Test script upload
   - Test script retrieval
   - Test script deletion
   - Test execution trigger

### Integration Tests

1. **End-to-End Flow**
   - Create deployment with SQL scripts
   - Wait for RDS creation
   - Verify scripts executed
   - Check database state

2. **Error Scenarios**
   - Invalid SQL syntax
   - Connection timeout
   - Transaction rollback
   - Halt on error vs continue

### Manual QA Checklist

- [ ] Upload single SQL script
- [ ] Upload multiple SQL scripts
- [ ] Reorder scripts
- [ ] Delete script before execution
- [ ] Deploy with RDS + scripts
- [ ] Verify scripts execute in order
- [ ] Test script with syntax error
- [ ] Test halt on error behavior
- [ ] Test continue on error behavior
- [ ] Verify database tables created
- [ ] Check execution logs in UI
- [ ] Retry failed script execution

---

## 🚨 Risk Assessment

### High-Risk Scenarios

1. **SQL Injection**
   - **Risk**: User-provided SQL executed directly
   - **Mitigation**: 
     - No parameterization needed (scripts are meant to be admin-controlled)
     - Require admin approval for deployments
     - Log all executed SQL
     - Consider SQL validation/sanitization library

2. **Long-Running Scripts**
   - **Risk**: Script takes hours, blocks deployment
   - **Mitigation**:
     - Configurable timeout (default 5 minutes)
     - Run asynchronously, don't block deployment completion
     - Allow retry of failed scripts

3. **Connection Pooling**
   - **Risk**: Too many concurrent connections to RDS
   - **Mitigation**:
     - Execute scripts sequentially, not in parallel
     - Close connection after each script
     - Consider connection pool for production

4. **Secrets Exposure**
   - **Risk**: Database password in logs
   - **Mitigation**:
     - Never log connection strings
     - Use Secrets Manager exclusively
     - Redact sensitive data in error messages

### Medium-Risk Scenarios

1. **Idempotency**
   - Scripts should be idempotent (can run multiple times)
   - User responsibility to use CREATE IF NOT EXISTS, etc.
   - Document best practices

2. **Rollback Support**
   - No automatic rollback of schema changes
   - User must provide down migrations
   - Future enhancement: migration versioning

---

## 📊 Success Metrics

- ✅ SQL scripts execute successfully 95%+ of the time
- ✅ Average script execution time < 30 seconds
- ✅ Zero database password leaks in logs
- ✅ Clear error messages for failed scripts
- ✅ Users can retry failed scripts without redeploying

---

## 🗓️ Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Phase 1** | Database schema & models | 2 hours | None |
| **Phase 2** | SQL execution service | 4-5 hours | Phase 1 complete |
| **Phase 3** | Backend API endpoints | 2-3 hours | Phase 1-2 complete |
| **Phase 4** | Integration with deployment flow | 2 hours | Phase 2-3 complete |
| **Phase 5** | Frontend UI | 3-4 hours | Phase 3 complete |
| **Testing** | Integration & QA | 2 hours | All phases |
| **Total** | | **15-18 hours** | |

---

## 🔗 Related Files

### Backend
- `backend/src/models/DeploymentSqlScript.js` - NEW model
- `backend/src/services/databaseScriptExecutor.js` - NEW service
- `backend/src/services/awsSecrets.js` - Helper functions
- `backend/src/routes/sqlScripts.js` - NEW routes
- `backend/src/routes/deployments.js` - Integration point

### Frontend
- `frontend/src/pages/DeploymentWizardMultiCloud.jsx` - Add SQL scripts step
- `frontend/src/pages/DeploymentStatus.jsx` - Display script execution
- `frontend/src/services/api.js` - API calls

### Database
- Migration file for `deployment_sql_scripts` table

---

## 💡 Future Enhancements (Post-MVP)

- [ ] Migration versioning (track which migrations ran)
- [ ] SQL script templates library
- [ ] Rollback/down migrations
- [ ] Script validation before deployment
- [ ] Multi-database support (MySQL, SQL Server)
- [ ] Scheduled script execution
- [ ] Script dependency graph
- [ ] Dry-run mode (validate without executing)
- [ ] Script editor with syntax highlighting
- [ ] Import from Git repository

---

**Document Owner**: Development Team  
**Review Frequency**: After each phase completion  
**Last Review**: November 24, 2025
