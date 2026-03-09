const { Client } = require('pg');
const mysql = require('mysql2/promise');
const mssql = require('mssql');
const logger = require('./logger');
const websocketServer = require('../config/websocketServer');
const { getSecretFromSecretsManager } = require('./awsSecrets');

class DatabaseScriptExecutor {
  /**
   * Execute all pending SQL scripts for a deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {object} Execution results
   */
  async executeScripts(deploymentId) {
    const { DeploymentSqlScript, Deployment } = require('../models');

    try {
      const deployment = await Deployment.findByPk(deploymentId);
      
      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      logger.info(`[DBScriptExecutor] Starting script execution for deployment ${deploymentId}`);
      
      // Emit phase update
      websocketServer.emitPhaseUpdate(deploymentId, 'database-init', { status: 'starting' });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Starting database initialization...',
        timestamp: new Date(),
      });

      // Get database connection info
      const dbConfig = await this.getDatabaseConfig(deployment);
      
      // Validate connection
      await this.validateConnection(dbConfig, deploymentId);

      // Fetch pending scripts
      const scripts = await DeploymentSqlScript.findAll({
        where: { 
          deploymentId,
          status: 'pending'
        },
        order: [['executionOrder', 'ASC']],
      });

      if (scripts.length === 0) {
        logger.info(`[DBScriptExecutor] No pending scripts found for deployment ${deploymentId}`);
        websocketServer.emitLog(deploymentId, {
          level: 'info',
          message: 'No pending SQL scripts to execute',
          timestamp: new Date(),
        });
        return { success: true, message: 'No scripts to execute', totalScripts: 0 };
      }

      logger.info(`[DBScriptExecutor] Found ${scripts.length} pending scripts to execute`);
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `Found ${scripts.length} SQL script(s) to execute`,
        timestamp: new Date(),
      });

      // Execute scripts in order
      const results = [];
      for (const script of scripts) {
        const result = await this.executeScript(script, dbConfig, deploymentId);
        results.push(result);

        // Stop on error if configured
        if (!result.success && script.haltOnError) {
          logger.error(`[DBScriptExecutor] Halting execution due to error in script: ${script.scriptName}`);
          websocketServer.emitLog(deploymentId, {
            level: 'error',
            message: `Halting execution due to error. Configure "halt_on_error: false" to continue on errors.`,
            timestamp: new Date(),
          });
          throw new Error(`Script execution failed: ${script.scriptName}`);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      // Emit completion
      websocketServer.emitPhaseUpdate(deploymentId, 'database-init', { status: 'completed' });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `Database initialization completed. ${successCount}/${results.length} scripts successful${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        timestamp: new Date(),
      });

      return {
        success: failedCount === 0,
        totalScripts: scripts.length,
        successfulScripts: successCount,
        failedScripts: failedCount,
        results,
      };

    } catch (error) {
      logger.error(`[DBScriptExecutor] Script execution failed`, {
        deploymentId,
        error: error.message,
        stack: error.stack,
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
      logger.info(`[DBScriptExecutor] Executing script: ${script.scriptName}`, {
        order: script.executionOrder,
        haltOnError: script.haltOnError,
        runInTransaction: script.runInTransaction,
      });

      // Update status
      await script.update({ status: 'running' });

      // Emit log
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `[${script.executionOrder + 1}] Executing: ${script.scriptName}`,
        timestamp: new Date(),
      });

      // Create database connection based on engine
      if (dbConfig.engine === 'mysql') {
        client = await this.executeMySQLScript(script, dbConfig);
      } else if (dbConfig.engine === 'sqlserver' || dbConfig.engine === 'mssql') {
        client = await this.executeMSSQLScript(script, dbConfig);
      } else {
        // PostgreSQL (default)
        client = await this.executePostgreSQLScript(script, dbConfig);
      }

      const duration = Date.now() - startTime;

      // Update script with success
      await script.update({
        status: 'completed',
        executedAt: new Date(),
        executionDurationMs: duration,
        rowsAffected: client.rowsAffected,
        errorMessage: null,
        errorStack: null,
      });

      logger.info(`[DBScriptExecutor] Script completed: ${script.scriptName}`, {
        duration: `${duration}ms`,
        rowsAffected: client.rowsAffected,
      });

      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `✓ [${script.executionOrder + 1}] ${script.scriptName} completed (${duration}ms, ${client.rowsAffected || 0} rows affected)`,
        timestamp: new Date(),
      });

      return {
        success: true,
        scriptName: script.scriptName,
        duration,
        rowsAffected: client.rowsAffected,
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
        message: `✗ [${script.executionOrder + 1}] ${script.scriptName} failed: ${error.message}`,
        timestamp: new Date(),
      });

      return {
        success: false,
        scriptName: script.scriptName,
        duration,
        error: error.message,
      };

    } finally {
      if (client && client.close) {
        await client.close();
      }
    }
  }

  /**
   * Execute PostgreSQL script
   * @param {object} script - Script instance
   * @param {object} dbConfig - Database config
   * @returns {object} Result with rowsAffected and close function
   */
  async executePostgreSQLScript(script, dbConfig) {
    const client = new Client({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: dbConfig.ssl,
      connectionTimeoutMillis: 10000,
    });

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

    return {
      rowsAffected: result.rowCount,
      close: async () => await client.end(),
    };
  }

  /**
   * Execute MySQL script
   * @param {object} script - Script instance
   * @param {object} dbConfig - Database config
   * @returns {object} Result with rowsAffected and close function
   */
  async executeMySQLScript(script, dbConfig) {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: dbConfig.ssl,
      connectTimeout: 10000,
    });

    let result;
    let rowsAffected = 0;

    if (script.runInTransaction) {
      await connection.beginTransaction();
      try {
        [result] = await connection.query(script.scriptContent);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } else {
      [result] = await connection.query(script.scriptContent);
    }

    // Calculate rows affected
    if (result.affectedRows !== undefined) {
      rowsAffected = result.affectedRows;
    } else if (Array.isArray(result)) {
      rowsAffected = result.length;
    }

    return {
      rowsAffected,
      close: async () => await connection.end(),
    };
  }

  /**
   * Execute MSSQL script
   * @param {object} script - Script instance
   * @param {object} dbConfig - Database config
   * @returns {object} Result with rowsAffected and close function
   */
  async executeMSSQLScript(script, dbConfig) {
    const pool = await mssql.connect({
      server: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      options: {
        encrypt: true, // Use encryption for Azure SQL
        trustServerCertificate: dbConfig.ssl?.rejectUnauthorized === false,
        requestTimeout: (script.timeoutSeconds || 300) * 1000,
      },
      connectionTimeout: 10000,
    });

    let result;
    let transaction;
    let rowsAffected = 0;

    try {
      if (script.runInTransaction) {
        transaction = new mssql.Transaction(pool);
        await transaction.begin();
        
        try {
          const request = new mssql.Request(transaction);
          result = await request.query(script.scriptContent);
          await transaction.commit();
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      } else {
        const request = new mssql.Request(pool);
        result = await request.query(script.scriptContent);
      }

      // Calculate rows affected
      if (result.rowsAffected) {
        // rowsAffected is an array in mssql package
        rowsAffected = Array.isArray(result.rowsAffected) 
          ? result.rowsAffected.reduce((sum, val) => sum + val, 0)
          : result.rowsAffected;
      } else if (result.recordset) {
        rowsAffected = result.recordset.length;
      }

      return {
        rowsAffected,
        close: async () => await pool.close(),
      };
    } catch (error) {
      if (pool) {
        await pool.close();
      }
      throw error;
    }
  }

  /**
   * Get database configuration from deployment
   * @param {object} deployment - Deployment instance
   * @returns {object} Database connection config
   */
  async getDatabaseConfig(deployment) {
    const outputs = deployment.terraformOutputs || {};
    const config = deployment.configuration || {};

    // Determine database engine
    const dbEngine = config.dbEngine || 'postgres';

    // Get RDS endpoint
    const dbEndpoint = outputs.db_endpoint || outputs.rds_endpoint;
    if (!dbEndpoint) {
      throw new Error('RDS endpoint not found in Terraform outputs');
    }

    // Parse endpoint (format: hostname:port or just hostname)
    const [host, portStr] = dbEndpoint.split(':');
    
    // Determine default port based on engine
    let defaultPort;
    if (dbEngine === 'mysql') {
      defaultPort = 3306;
    } else if (dbEngine === 'sqlserver' || dbEngine === 'mssql') {
      defaultPort = 1433;
    } else {
      defaultPort = 5432; // PostgreSQL
    }
    
    const port = portStr ? parseInt(portStr) : defaultPort;

    // Get password from Secrets Manager
    const secretArn = outputs.db_password_secret_arn || outputs.rds_password_secret_arn;
    if (!secretArn) {
      throw new Error('Database password secret ARN not found in Terraform outputs');
    }

    logger.info('[DBScriptExecutor] Retrieving database password from Secrets Manager', {
      secretArn,
    });

    const password = await getSecretFromSecretsManager(secretArn);

    // Get database name from configuration
    const database = config.dbName || outputs.db_name || 'main';
    const username = config.dbUsername || outputs.db_username || 'admin';

    return {
      engine: dbEngine,
      host: host,
      port: port,
      database: database,
      user: username,
      password: password,
      ssl: {
        rejectUnauthorized: false, // RDS uses SSL by default
      },
    };
  }

  /**
   * Validate database connection
   * @param {object} dbConfig - Database connection config
   * @param {string} deploymentId - Deployment ID for logging
   * @returns {boolean} Connection valid
   */
  async validateConnection(dbConfig, deploymentId) {
    let client;
    try {
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `Connecting to ${dbConfig.engine} database at ${dbConfig.host}:${dbConfig.port}...`,
        timestamp: new Date(),
      });

      if (dbConfig.engine === 'mysql') {
        client = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
          ssl: dbConfig.ssl,
          connectTimeout: 10000,
        });
        const [rows] = await client.query('SELECT NOW() as now');
        logger.info('[DBScriptExecutor] MySQL connection validated', {
          serverTime: rows[0].now,
        });
      } else if (dbConfig.engine === 'sqlserver' || dbConfig.engine === 'mssql') {
        const pool = await mssql.connect({
          server: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
          options: {
            encrypt: true,
            trustServerCertificate: dbConfig.ssl?.rejectUnauthorized === false,
          },
          connectionTimeout: 10000,
        });
        const result = await pool.request().query('SELECT GETDATE() as now');
        logger.info('[DBScriptExecutor] SQL Server connection validated', {
          serverTime: result.recordset[0].now,
        });
        client = pool;
      } else {
        client = new Client(dbConfig);
        await client.connect();
        const result = await client.query('SELECT NOW()');
        logger.info('[DBScriptExecutor] PostgreSQL connection validated', {
          serverTime: result.rows[0].now,
        });
      }

      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: '✓ Database connection validated successfully',
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      logger.error('[DBScriptExecutor] Database connection failed', {
        error: error.message,
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
      });

      websocketServer.emitLog(deploymentId, {
        level: 'error',
        message: `✗ Database connection failed: ${error.message}`,
        timestamp: new Date(),
      });

      throw error;
    } finally {
      if (client) {
        if (client.end) {
          await client.end();
        } else if (client.close) {
          await client.close();
        }
      }
    }
  }

  /**
   * Get database engine-specific syntax notes
   * @param {string} engine - Database engine
   * @returns {string} Syntax notes
   */
  getDatabaseSyntaxNotes(engine) {
    const notes = {
      postgres: 'PostgreSQL: Supports transactional DDL, use IF NOT EXISTS for idempotency',
      mysql: 'MySQL: DDL auto-commits (set runInTransaction=false), use IF NOT EXISTS',
      sqlserver: 'SQL Server: Use IF NOT EXISTS or IF OBJECT_ID checks, supports transactional DDL',
      mssql: 'SQL Server: Use IF NOT EXISTS or IF OBJECT_ID checks, supports transactional DDL',
    };
    return notes[engine] || notes.postgres;
  }

  /**
   * Execute an arbitrary SQL query against a deployment's database
   * @param {object} deployment - Deployment instance
   * @param {string} query - SQL query to execute
   * @returns {object} Query results
   */
  async executeQuery(deployment, query) {
    const startTime = Date.now();
    let client;

    try {
      // Get database configuration
      const dbConfig = await this.getDatabaseConfig(deployment);

      logger.info('[SQLQuery] Executing query', {
        deploymentId: deployment.id,
        engine: dbConfig.engine,
        host: dbConfig.host,
      });

      // Execute based on database engine
      if (dbConfig.engine === 'mysql') {
        client = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
          ssl: dbConfig.ssl,
          connectTimeout: 10000,
        });

        const [rows, fields] = await client.query(query);
        const executionTime = Date.now() - startTime;

        await client.end();

        return {
          rows: Array.isArray(rows) ? rows : [],
          rowCount: Array.isArray(rows) ? rows.length : (rows.affectedRows || 0),
          fields: fields ? fields.map(f => ({ name: f.name, type: f.type })) : [],
          executionTime,
        };

      } else if (dbConfig.engine === 'sqlserver' || dbConfig.engine === 'mssql') {
        const pool = await mssql.connect({
          server: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
          options: {
            encrypt: true,
            trustServerCertificate: dbConfig.ssl?.rejectUnauthorized === false,
            requestTimeout: 30000,
          },
          connectionTimeout: 10000,
        });

        const request = new mssql.Request(pool);
        const result = await request.query(query);
        const executionTime = Date.now() - startTime;

        await pool.close();

        // Handle both SELECT and DML queries
        const rows = result.recordset || [];
        const rowCount = result.rowsAffected 
          ? (Array.isArray(result.rowsAffected) ? result.rowsAffected.reduce((sum, val) => sum + val, 0) : result.rowsAffected)
          : rows.length;

        const fields = result.recordset && result.recordset.columns
          ? Object.keys(result.recordset.columns).map(name => ({
              name,
              type: result.recordset.columns[name].type.declaration,
            }))
          : [];

        return {
          rows,
          rowCount,
          fields,
          executionTime,
        };

      } else {
        // PostgreSQL (default)
        client = new Client({
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
          ssl: dbConfig.ssl,
          connectionTimeoutMillis: 10000,
          statement_timeout: 30000,
        });

        await client.connect();
        const result = await client.query(query);
        const executionTime = Date.now() - startTime;

        await client.end();

        return {
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          fields: result.fields ? result.fields.map(f => ({ name: f.name, type: f.dataTypeID })) : [],
          executionTime,
        };
      }

    } catch (error) {
      logger.error('[SQLQuery] Query execution failed', {
        error: error.message,
        deploymentId: deployment.id,
      });
      throw error;
    }
  }

  /**
   * Initialize the application database schema post-RDS provisioning.
   * Creates the zldb database (if not exists) and pfuser login (if not exists),
   * then grants db_owner role. Triggered during the 'database-init' deployment phase.
   *
   * @param {string} deploymentId - Deployment ID
   * @returns {object} Initialization result
   */
  async initializeSchema(deploymentId) {
    const { Deployment } = require('../models');

    try {
      const deployment = await Deployment.findByPk(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }

      logger.info(`[DBScriptExecutor] Starting schema initialization for deployment ${deploymentId}`);

      websocketServer.emitPhaseUpdate(deploymentId, 'database-init', { status: 'starting' });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: 'Starting database schema initialization (zldb + pfuser)...',
        timestamp: new Date(),
      });

      // Connect to the default 'postgres' database first to create the app database
      const dbConfig = await this.getDatabaseConfig(deployment);
      const adminConfig = { ...dbConfig, database: 'postgres' };

      const appDbName = deployment.configuration?.dbName || 'zldb';
      const appUser = deployment.configuration?.dbAppUser || 'pfuser';
      const appPassword = deployment.configuration?.dbAppPassword || this._generateRandomPassword();

      // Step 1: Create application database if not exists
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `Creating database "${appDbName}" if not exists...`,
        timestamp: new Date(),
      });

      const adminClient = new Client({
        host: adminConfig.host,
        port: adminConfig.port,
        database: adminConfig.database,
        user: adminConfig.user,
        password: adminConfig.password,
        ssl: adminConfig.ssl,
        connectionTimeoutMillis: 15000,
      });

      await adminClient.connect();

      try {
        // Check if database exists
        const dbCheck = await adminClient.query(
          `SELECT 1 FROM pg_database WHERE datname = $1`, [appDbName]
        );

        if (dbCheck.rowCount === 0) {
          // CREATE DATABASE cannot run inside a transaction
          await adminClient.query(`CREATE DATABASE "${appDbName}"`);
          logger.info(`[DBScriptExecutor] Created database: ${appDbName}`);
          websocketServer.emitLog(deploymentId, {
            level: 'info',
            message: `✓ Database "${appDbName}" created`,
            timestamp: new Date(),
          });
        } else {
          logger.info(`[DBScriptExecutor] Database "${appDbName}" already exists`);
          websocketServer.emitLog(deploymentId, {
            level: 'info',
            message: `✓ Database "${appDbName}" already exists — skipping`,
            timestamp: new Date(),
          });
        }

        // Step 2: Create application user (role) if not exists
        websocketServer.emitLog(deploymentId, {
          level: 'info',
          message: `Creating login role "${appUser}" if not exists...`,
          timestamp: new Date(),
        });

        const roleCheck = await adminClient.query(
          `SELECT 1 FROM pg_roles WHERE rolname = $1`, [appUser]
        );

        if (roleCheck.rowCount === 0) {
          await adminClient.query(
            `CREATE ROLE "${appUser}" WITH LOGIN PASSWORD '${appPassword}'`
          );
          logger.info(`[DBScriptExecutor] Created role: ${appUser}`);
          websocketServer.emitLog(deploymentId, {
            level: 'info',
            message: `✓ Role "${appUser}" created`,
            timestamp: new Date(),
          });
        } else {
          logger.info(`[DBScriptExecutor] Role "${appUser}" already exists`);
          websocketServer.emitLog(deploymentId, {
            level: 'info',
            message: `✓ Role "${appUser}" already exists — skipping`,
            timestamp: new Date(),
          });
        }

        // Step 3: Grant privileges on the application database
        await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${appDbName}" TO "${appUser}"`);
        logger.info(`[DBScriptExecutor] Granted privileges on ${appDbName} to ${appUser}`);

      } finally {
        await adminClient.end();
      }

      // Step 4: Connect to the app database and grant schema ownership
      const appClient = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        database: appDbName,
        user: dbConfig.user,
        password: dbConfig.password,
        ssl: dbConfig.ssl,
        connectionTimeoutMillis: 15000,
      });

      await appClient.connect();

      try {
        // Grant ownership of public schema to the app user
        await appClient.query(`ALTER SCHEMA public OWNER TO "${appUser}"`);
        await appClient.query(`GRANT ALL ON SCHEMA public TO "${appUser}"`);
        logger.info(`[DBScriptExecutor] Granted schema ownership to ${appUser}`);
      } finally {
        await appClient.end();
      }

      websocketServer.emitPhaseUpdate(deploymentId, 'database-init', { status: 'completed' });
      websocketServer.emitLog(deploymentId, {
        level: 'info',
        message: `✓ Database schema initialization completed — db: ${appDbName}, user: ${appUser}`,
        timestamp: new Date(),
      });

      return {
        success: true,
        database: appDbName,
        user: appUser,
        message: 'Schema initialization completed successfully',
      };

    } catch (error) {
      logger.error(`[DBScriptExecutor] Schema initialization failed`, {
        deploymentId,
        error: error.message,
        stack: error.stack,
      });

      websocketServer.emitFailure(deploymentId, error.message, { phase: 'database-init' });
      throw error;
    }
  }

  /**
   * Create an SSM Session Manager port-forwarding session to a private RDS instance.
   * Requires a bastion/jump host EC2 instance in the same VPC with SSM agent.
   *
   * @param {object} deployment - Deployment instance
   * @returns {object} Port forwarding session details { command, localPort, rdsEndpoint }
   */
  async createRDSPortForward(deployment) {
    const { execSync } = require('child_process');

    const outputs = deployment.terraformOutputs || deployment.outputs || {};
    const rdsEndpoint = outputs.rds_endpoint || outputs.db_endpoint;
    const bastionInstanceId = outputs.bastion_instance_id;

    if (!rdsEndpoint) {
      throw new Error('RDS endpoint not found in Terraform outputs');
    }
    if (!bastionInstanceId) {
      throw new Error('Bastion instance ID not found in Terraform outputs — SSM port forwarding requires a bastion host');
    }

    // Parse host and port from endpoint
    const [rdsHost, rdsPortStr] = rdsEndpoint.split(':');
    const rdsPort = rdsPortStr || '5432';
    const localPort = rdsPort; // Mirror the remote port locally

    const ssmCommand = [
      'aws', 'ssm', 'start-session',
      '--target', bastionInstanceId,
      '--document-name', 'AWS-StartPortForwardingSessionToRemoteHost',
      '--parameters', `host="${rdsHost}",portNumber="${rdsPort}",localPortNumber="${localPort}"`
    ].join(' ');

    logger.info('[DBScriptExecutor] SSM port-forward command generated', {
      deploymentId: deployment.id,
      rdsEndpoint,
      bastionInstanceId,
      localPort,
    });

    return {
      command: ssmCommand,
      localPort: parseInt(localPort),
      rdsEndpoint: rdsEndpoint,
      rdsHost: rdsHost,
      rdsPort: parseInt(rdsPort),
      bastionInstanceId,
      instructions: [
        `Run the following command to start port forwarding:`,
        `  ${ssmCommand}`,
        `Then connect to the database at localhost:${localPort}`,
      ],
    };
  }

  /**
   * Generate a random password for database users
   * @returns {string} Random password
   */
  _generateRandomPassword() {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64url');
  }
}

module.exports = new DatabaseScriptExecutor();
