const crypto = require('crypto');
const { Client: PgClient } = require('pg');
const mysql = require('mysql2/promise');
const { DatabaseCredential, Deployment, Credential } = require('../models');
const credentialService = require('./credentialService');
const logger = require('./logger');

/**
 * DatabaseCredentialService
 * Manages database credentials for connecting to and querying databases
 */
class DatabaseCredentialService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production')
      .digest();
  }

  /**
   * Encrypt database credentials (username and password)
   * @param {string} username - Database username
   * @param {string} password - Database password
   * @returns {object} - { encryptedUsername, encryptedPassword, encryptionIv, authTag }
   */
  encryptCredentials(username, password) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt username and password together as JSON
      const dataToEncrypt = JSON.stringify({ username, password });
      let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encryptedUsername: encrypted, // Store same encrypted blob
        encryptedPassword: encrypted, // for both fields for compatibility
        encryptionIv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
      };
    } catch (error) {
      logger.error('[DatabaseCredentialService] Encryption error', { error: error.message });
      throw new Error('Failed to encrypt database credentials');
    }
  }

  /**
   * Decrypt database credentials
   * @param {object} encryptedData - { encryptedUsername, encryptionIv, authTag }
   * @returns {object} - { username, password }
   */
  decryptCredentials(encryptedData) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(encryptedData.encryptionIv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encryptedUsername, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('[DatabaseCredentialService] Decryption error', { error: error.message });
      throw new Error('Failed to decrypt database credentials');
    }
  }

  /**
   * Create a new database credential
   * @param {object} data - Credential data
   * @param {string} userId - User ID
   * @returns {object} Created credential
   */
  async create(data, userId) {
    try {
      const { username, password, ...rest } = data;

      // Encrypt credentials
      const encrypted = this.encryptCredentials(username, password);

      const credential = await DatabaseCredential.create({
        ...rest,
        ...encrypted,
        userId,
      });

      logger.info('[DatabaseCredentialService] Created database credential', { 
        id: credential.id, 
        name: credential.name,
        host: credential.host,
      });

      // Return without encrypted fields
      return this.sanitize(credential);
    } catch (error) {
      logger.error('[DatabaseCredentialService] Failed to create credential', { error: error.message });
      throw error;
    }
  }

  /**
   * Update a database credential
   * @param {string} id - Credential ID
   * @param {object} data - Updated data
   * @param {string} userId - User ID
   * @returns {object} Updated credential
   */
  async update(id, data, userId) {
    try {
      const credential = await DatabaseCredential.findOne({
        where: { id, userId, isActive: true },
      });

      if (!credential) {
        throw new Error('Database credential not found');
      }

      const { username, password, ...rest } = data;
      let updateData = { ...rest };

      // Re-encrypt if credentials changed
      if (username && password) {
        const encrypted = this.encryptCredentials(username, password);
        updateData = { ...updateData, ...encrypted };
      }

      await credential.update(updateData);

      logger.info('[DatabaseCredentialService] Updated database credential', { id });
      return this.sanitize(credential);
    } catch (error) {
      logger.error('[DatabaseCredentialService] Failed to update credential', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete (soft) a database credential
   * @param {string} id - Credential ID
   * @param {string} userId - User ID
   */
  async delete(id, userId) {
    try {
      const credential = await DatabaseCredential.findOne({
        where: { id, userId },
      });

      if (!credential) {
        throw new Error('Database credential not found');
      }

      await credential.update({ isActive: false });
      logger.info('[DatabaseCredentialService] Deleted database credential', { id });
    } catch (error) {
      logger.error('[DatabaseCredentialService] Failed to delete credential', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all database credentials for a user
   * @param {string} userId - User ID
   * @returns {array} List of credentials
   */
  async getAll(userId) {
    try {
      const credentials = await DatabaseCredential.findAll({
        where: { userId, isActive: true },
        order: [['createdAt', 'DESC']],
      });

      return credentials.map(cred => this.sanitize(cred));
    } catch (error) {
      logger.error('[DatabaseCredentialService] Failed to get credentials', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a single database credential by ID
   * @param {string} id - Credential ID
   * @param {string} userId - User ID
   * @returns {object} Credential
   */
  async getById(id, userId) {
    try {
      const credential = await DatabaseCredential.findOne({
        where: { id, userId, isActive: true },
      });

      if (!credential) {
        return null;
      }

      return this.sanitize(credential);
    } catch (error) {
      logger.error('[DatabaseCredentialService] Failed to get credential', { error: error.message });
      throw error;
    }
  }

  /**
   * Find credential by host/database
   * @param {string} host - Database host
   * @param {string} databaseName - Database name
   * @param {string} userId - User ID
   * @returns {object|null} Credential or null
   */
  async findByHostAndDatabase(host, databaseName, userId) {
    try {
      const credential = await DatabaseCredential.findOne({
        where: { host, databaseName, userId, isActive: true },
      });

      return credential;
    } catch (error) {
      logger.error('[DatabaseCredentialService] Failed to find credential', { error: error.message });
      throw error;
    }
  }

  /**
   * Test database connection
   * @param {string} id - Credential ID
   * @param {string} userId - User ID
   * @returns {object} Test result
   */
  async testConnection(id, userId) {
    try {
      const credential = await DatabaseCredential.findOne({
        where: { id, userId, isActive: true },
      });

      if (!credential) {
        throw new Error('Database credential not found');
      }

      const { username, password } = this.decryptCredentials({
        encryptedUsername: credential.encryptedUsername,
        encryptionIv: credential.encryptionIv,
        authTag: credential.authTag,
      });

      const result = await this.testConnectionDirect({
        engine: credential.engine,
        host: credential.host,
        port: credential.port,
        databaseName: credential.databaseName,
        username,
        password,
        sslEnabled: credential.sslEnabled,
        sslMode: credential.sslMode,
      });

      // Update validation status
      await credential.update({
        isValid: result.success,
        lastValidatedAt: new Date(),
        validationError: result.success ? null : result.error,
      });

      return result;
    } catch (error) {
      logger.error('[DatabaseCredentialService] Failed to test connection', { error: error.message });
      throw error;
    }
  }

  /**
   * Test connection with provided credentials (not from DB)
   * @param {object} config - Connection config
   * @returns {object} Test result
   */
  async testConnectionDirect(config) {
    const { engine, host, port, databaseName, username, password, sslEnabled, sslMode } = config;

    try {
      if (engine === 'postgres' || engine === 'postgresql') {
        return await this.testPostgresConnection(host, port, databaseName, username, password, sslEnabled, sslMode);
      } else if (engine === 'mysql' || engine === 'mariadb') {
        return await this.testMySQLConnection(host, port, databaseName, username, password, sslEnabled);
      } else if (engine === 'sqlserver' || engine === 'mssql') {
        return await this.testMSSQLConnection(host, port, databaseName, username, password);
      } else {
        return { success: false, error: `Unsupported database engine: ${engine}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test PostgreSQL connection
   */
  async testPostgresConnection(host, port, database, user, password, sslEnabled, sslMode) {
    const client = new PgClient({
      host,
      port,
      database,
      user,
      password,
      ssl: sslEnabled ? { rejectUnauthorized: sslMode === 'verify-full' } : false,
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      const result = await client.query('SELECT version()');
      await client.end();
      
      return { 
        success: true, 
        version: result.rows[0].version,
        message: 'Connection successful',
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Test MySQL connection
   */
  async testMySQLConnection(host, port, database, user, password, sslEnabled) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host,
        port,
        database,
        user,
        password,
        ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 10000,
      });

      const [rows] = await connection.execute('SELECT VERSION() as version');
      await connection.end();

      return {
        success: true,
        version: rows[0].version,
        message: 'Connection successful',
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      try { if (connection) await connection.end(); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Test MSSQL connection
   */
  async testMSSQLConnection(host, port, database, user, password) {
    try {
      const sql = require('mssql');
      const config = {
        user,
        password,
        server: host,
        port,
        database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
        },
        connectionTimeout: 10000,
      };

      const pool = await sql.connect(config);
      const result = await pool.request().query('SELECT @@VERSION as version');
      await pool.close();

      return {
        success: true,
        version: result.recordset[0].version,
        message: 'Connection successful',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a query using stored credentials
   * @param {string} credentialId - Database credential ID
   * @param {string} query - SQL query to execute
   * @param {string} userId - User ID
   * @returns {object} Query result
   */
  async executeQuery(credentialId, query, userId) {
    try {
      const credential = await DatabaseCredential.findOne({
        where: { id: credentialId, userId, isActive: true },
      });

      if (!credential) {
        throw new Error('Database credential not found');
      }

      const { username, password } = this.decryptCredentials({
        encryptedUsername: credential.encryptedUsername,
        encryptionIv: credential.encryptionIv,
        authTag: credential.authTag,
      });

      const config = {
        engine: credential.engine,
        host: credential.host,
        port: credential.port,
        databaseName: credential.databaseName,
        username,
        password,
        sslEnabled: credential.sslEnabled,
        sslMode: credential.sslMode,
      };

      return await this.executeQueryDirect(config, query);
    } catch (error) {
      logger.error('[DatabaseCredentialService] Failed to execute query', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute query with direct config
   * @param {object} config - Connection config
   * @param {string} query - SQL query
   * @returns {object} Query result
   */
  async executeQueryDirect(config, query) {
    const { engine, host, port, databaseName, username, password, sslEnabled, sslMode } = config;

    try {
      if (engine === 'postgres' || engine === 'postgresql') {
        return await this.executePostgresQuery(host, port, databaseName, username, password, sslEnabled, sslMode, query);
      } else if (engine === 'mysql' || engine === 'mariadb') {
        return await this.executeMySQLQuery(host, port, databaseName, username, password, sslEnabled, query);
      } else if (engine === 'sqlserver' || engine === 'mssql') {
        return await this.executeMSSQLQuery(host, port, databaseName, username, password, query);
      } else {
        throw new Error(`Unsupported database engine: ${engine}`);
      }
    } catch (error) {
      logger.error('[DatabaseCredentialService] Query execution failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute PostgreSQL query
   */
  async executePostgresQuery(host, port, database, user, password, sslEnabled, sslMode, query) {
    const client = new PgClient({
      host,
      port,
      database,
      user,
      password,
      ssl: sslEnabled ? { rejectUnauthorized: sslMode === 'verify-full' } : false,
      connectionTimeoutMillis: 30000,
    });

    try {
      await client.connect();
      const result = await client.query(query);
      await client.end();

      return {
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => f.name) || [],
      };
    } finally {
      try { await client.end(); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Execute MySQL query
   */
  async executeMySQLQuery(host, port, database, user, password, sslEnabled, query) {
    let connection;
    try {
      connection = await mysql.createConnection({
        host,
        port,
        database,
        user,
        password,
        ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 30000,
      });

      const [rows, fields] = await connection.execute(query);
      await connection.end();

      return {
        success: true,
        rows,
        rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows || 0,
        fields: fields?.map(f => f.name) || [],
      };
    } finally {
      try { if (connection) await connection.end(); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Execute MSSQL query
   */
  async executeMSSQLQuery(host, port, database, user, password, query) {
    const sql = require('mssql');
    const config = {
      user,
      password,
      server: host,
      port,
      database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      connectionTimeout: 30000,
      requestTimeout: 30000,
    };

    const pool = await sql.connect(config);
    try {
      const result = await pool.request().query(query);
      await pool.close();

      return {
        success: true,
        rows: result.recordset || [],
        rowCount: result.rowsAffected?.[0] || result.recordset?.length || 0,
        fields: Object.keys(result.recordset?.[0] || {}),
      };
    } finally {
      try { await pool.close(); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Sanitize credential for API response (remove encrypted fields)
   * @param {object} credential - Database credential model
   * @returns {object} Sanitized credential
   */
  sanitize(credential) {
    const json = credential.toJSON ? credential.toJSON() : credential;
    const {
      encryptedUsername,
      encryptedPassword,
      encryptionIv,
      authTag,
      ...safe
    } = json;
    return safe;
  }
}

module.exports = new DatabaseCredentialService();
