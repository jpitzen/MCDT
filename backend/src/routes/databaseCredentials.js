const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const databaseCredentialService = require('../services/databaseCredentialService');
const { sendSuccess, sendError } = require('../middleware/errorHandler');
const logger = require('../services/logger');

/**
 * Database Credentials Routes
 * Manages database authentication credentials (username/password)
 * These are separate from cloud provider credentials
 */

/**
 * GET /api/database-credentials
 * Get all database credentials for the user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const credentials = await databaseCredentialService.getAll(req.user.id);
    sendSuccess(res, credentials);
  } catch (error) {
    logger.error('[DatabaseCredentials] Failed to get credentials', { error: error.message });
    sendError(res, error.message, 500);
  }
});

/**
 * GET /api/database-credentials/:id
 * Get a single database credential
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const credential = await databaseCredentialService.getById(req.params.id, req.user.id);
    
    if (!credential) {
      return sendError(res, 'Database credential not found', 404, 'NOT_FOUND');
    }
    
    sendSuccess(res, credential);
  } catch (error) {
    logger.error('[DatabaseCredentials] Failed to get credential', { error: error.message });
    sendError(res, error.message, 500);
  }
});

/**
 * POST /api/database-credentials
 * Create a new database credential
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      sourceType, 
      sourceId, 
      engine, 
      host, 
      port, 
      databaseName, 
      username, 
      password,
      sslEnabled,
      sslMode,
      awsSecretsArn,
      rdsInstanceId,
      tags,
      metadata,
    } = req.body;

    // Validate required fields
    if (!name || !engine || !host || !username || !password) {
      return sendError(res, 'Missing required fields: name, engine, host, username, password', 400, 'VALIDATION_ERROR');
    }

    // Validate engine
    const validEngines = ['postgres', 'mysql', 'mariadb', 'sqlserver', 'mssql', 'oracle'];
    if (!validEngines.includes(engine)) {
      return sendError(res, `Invalid engine. Must be one of: ${validEngines.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    // Validate source type
    const validSourceTypes = ['deployment', 'cloud', 'external'];
    const sourceTypeValue = sourceType || 'external';
    if (!validSourceTypes.includes(sourceTypeValue)) {
      return sendError(res, `Invalid sourceType. Must be one of: ${validSourceTypes.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const credential = await databaseCredentialService.create({
      name,
      description,
      sourceType: sourceTypeValue,
      sourceId,
      engine,
      host,
      port: port || getDefaultPort(engine),
      databaseName: databaseName || 'postgres',
      username,
      password,
      sslEnabled: sslEnabled !== false, // default true
      sslMode: sslMode || 'require',
      awsSecretsArn,
      rdsInstanceId,
      tags,
      metadata,
    }, req.user.id);

    logger.info('[DatabaseCredentials] Created database credential', { 
      id: credential.id, 
      name: credential.name,
      userId: req.user.id,
    });

    sendSuccess(res, credential, 201, 'Database credential created successfully');
  } catch (error) {
    logger.error('[DatabaseCredentials] Failed to create credential', { error: error.message });
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(res, 'A credential for this database already exists', 409, 'DUPLICATE_ERROR');
    }
    
    sendError(res, error.message, 500);
  }
});

/**
 * PUT /api/database-credentials/:id
 * Update a database credential
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      engine, 
      host, 
      port, 
      databaseName, 
      username, 
      password,
      sslEnabled,
      sslMode,
      awsSecretsArn,
      rdsInstanceId,
      tags,
      metadata,
    } = req.body;

    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (engine !== undefined) updateData.engine = engine;
    if (host !== undefined) updateData.host = host;
    if (port !== undefined) updateData.port = port;
    if (databaseName !== undefined) updateData.databaseName = databaseName;
    if (sslEnabled !== undefined) updateData.sslEnabled = sslEnabled;
    if (sslMode !== undefined) updateData.sslMode = sslMode;
    if (awsSecretsArn !== undefined) updateData.awsSecretsArn = awsSecretsArn;
    if (rdsInstanceId !== undefined) updateData.rdsInstanceId = rdsInstanceId;
    if (tags !== undefined) updateData.tags = tags;
    if (metadata !== undefined) updateData.metadata = metadata;
    
    // Only update credentials if both provided
    if (username && password) {
      updateData.username = username;
      updateData.password = password;
    }

    const credential = await databaseCredentialService.update(req.params.id, updateData, req.user.id);
    
    logger.info('[DatabaseCredentials] Updated database credential', { 
      id: req.params.id,
      userId: req.user.id,
    });

    sendSuccess(res, credential, 200, 'Database credential updated successfully');
  } catch (error) {
    logger.error('[DatabaseCredentials] Failed to update credential', { error: error.message });
    
    if (error.message === 'Database credential not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    
    sendError(res, error.message, 500);
  }
});

/**
 * DELETE /api/database-credentials/:id
 * Delete (soft) a database credential
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await databaseCredentialService.delete(req.params.id, req.user.id);
    
    logger.info('[DatabaseCredentials] Deleted database credential', { 
      id: req.params.id,
      userId: req.user.id,
    });

    sendSuccess(res, null, 200, 'Database credential deleted successfully');
  } catch (error) {
    logger.error('[DatabaseCredentials] Failed to delete credential', { error: error.message });
    
    if (error.message === 'Database credential not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    
    sendError(res, error.message, 500);
  }
});

/**
 * POST /api/database-credentials/:id/test
 * Test database connection using stored credentials
 */
router.post('/:id/test', authenticate, async (req, res) => {
  try {
    const result = await databaseCredentialService.testConnection(req.params.id, req.user.id);
    
    if (result.success) {
      sendSuccess(res, result, 200, 'Connection successful');
    } else {
      sendError(res, result.error || 'Connection failed', 400, 'CONNECTION_FAILED');
    }
  } catch (error) {
    logger.error('[DatabaseCredentials] Failed to test connection', { error: error.message });
    
    if (error.message === 'Database credential not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    
    sendError(res, error.message, 500);
  }
});

/**
 * POST /api/database-credentials/test-direct
 * Test connection with provided credentials (without saving)
 */
router.post('/test-direct', authenticate, async (req, res) => {
  try {
    const { engine, host, port, databaseName, username, password, sslEnabled, sslMode } = req.body;

    if (!engine || !host || !username || !password) {
      return sendError(res, 'Missing required fields: engine, host, username, password', 400, 'VALIDATION_ERROR');
    }

    const result = await databaseCredentialService.testConnectionDirect({
      engine,
      host,
      port: port || getDefaultPort(engine),
      databaseName: databaseName || 'postgres',
      username,
      password,
      sslEnabled: sslEnabled !== false,
      sslMode: sslMode || 'require',
    });

    if (result.success) {
      sendSuccess(res, result, 200, 'Connection successful');
    } else {
      sendError(res, result.error || 'Connection failed', 400, 'CONNECTION_FAILED');
    }
  } catch (error) {
    logger.error('[DatabaseCredentials] Failed to test direct connection', { error: error.message });
    sendError(res, error.message, 500);
  }
});

/**
 * POST /api/database-credentials/:id/query
 * Execute a SQL query using stored credentials
 */
router.post('/:id/query', authenticate, async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return sendError(res, 'Query is required', 400, 'VALIDATION_ERROR');
    }

    // Basic SQL injection prevention - reject dangerous keywords
    const lowerQuery = query.toLowerCase().trim();
    const dangerousKeywords = ['drop database', 'drop schema', 'truncate database'];
    for (const keyword of dangerousKeywords) {
      if (lowerQuery.includes(keyword)) {
        return sendError(res, `Query contains forbidden keyword: ${keyword}`, 400, 'FORBIDDEN_QUERY');
      }
    }

    const result = await databaseCredentialService.executeQuery(req.params.id, query, req.user.id);
    
    logger.info('[DatabaseCredentials] Executed query', { 
      credentialId: req.params.id,
      userId: req.user.id,
      rowCount: result.rowCount,
    });

    sendSuccess(res, result);
  } catch (error) {
    logger.error('[DatabaseCredentials] Failed to execute query', { error: error.message });
    
    if (error.message === 'Database credential not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    
    sendError(res, error.message, 500);
  }
});

/**
 * Helper function to get default port for database engine
 */
function getDefaultPort(engine) {
  const ports = {
    postgres: 5432,
    mysql: 3306,
    mariadb: 3306,
    sqlserver: 1433,
    mssql: 1433,
    oracle: 1521,
  };
  return ports[engine?.toLowerCase()] || 5432;
}

module.exports = router;
