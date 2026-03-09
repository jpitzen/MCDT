const crypto = require('crypto');
const logger = require('./logger');

/**
 * SecureCredentialService
 * Handles encryption/decryption of all sensitive credentials including:
 * - SMTP passwords and credentials
 * - Slack webhook URLs
 * - Custom webhook authentication credentials
 * - API tokens and keys
 * 
 * Uses AES-256-GCM for authenticated encryption with:
 * - 256-bit encryption key (derived from environment variable)
 * - Random 96-bit (12-byte) IV for each encryption
 * - 128-bit (16-byte) authentication tag for integrity verification
 * - Additional authenticated data (AAD) for domain separation
 */
class SecureCredentialService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.encryptionKeyEnv = process.env.SECURE_ENCRYPTION_KEY;
    this.encryptionKey = this._deriveEncryptionKey();
    
    if (!this.encryptionKeyEnv) {
      logger.warn(
        'SECURE_ENCRYPTION_KEY not set. Using default key for development only. ' +
        'This is insecure for production!'
      );
    }
  }

  /**
   * Derive encryption key from environment variable using key derivation function
   * @private
   * @returns {Buffer} 32-byte encryption key
   */
  _deriveEncryptionKey() {
    const keyMaterial = this.encryptionKeyEnv || 'dev-key-change-in-production';
    
    // Use PBKDF2 to derive a 32-byte key from the provided key material
    // This ensures consistent key derivation even if environment variable format changes
    return crypto.pbkdf2Sync(keyMaterial, 'secure-credentials-salt', 100000, 32, 'sha256');
  }

  /**
   * Encrypt sensitive credential data
   * Supports both string and object credentials
   * 
   * @param {string|object} data - Data to encrypt (string or serializable object)
   * @param {string} [associatedData] - Additional authenticated data (domain/type identifier)
   * @returns {object} - { encryptedData, iv, authTag, ciphertext } all as hex strings
   * @throws {Error} If encryption fails
   */
  encrypt(data, associatedData = 'credential') {
    try {
      // Serialize if object
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

      // Generate random 96-bit IV (12 bytes is optimal for GCM)
      const iv = crypto.randomBytes(12);

      // Create cipher in GCM mode
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Set additional authenticated data for integrity protection
      cipher.setAAD(Buffer.from(associatedData));

      // Encrypt the data
      let encryptedData = cipher.update(plaintext, 'utf8', 'hex');
      encryptedData += cipher.final('hex');

      // Get authentication tag (16 bytes)
      const authTag = cipher.getAuthTag();

      return {
        encryptedData,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        ciphertext: encryptedData, // Alias for compatibility
      };
    } catch (error) {
      logger.error('Encryption failed', {
        error: error.message,
        associatedData,
      });
      throw new Error(`Failed to encrypt credential: ${error.message}`);
    }
  }

  /**
   * Decrypt credential data
   * Verifies authentication tag for integrity
   * 
   * @param {object} encryptedData - { encryptedData, iv, authTag }
   * @param {string} [associatedData] - Additional authenticated data (must match encryption)
   * @returns {object|string} - Decrypted data (parsed if JSON, otherwise string)
   * @throws {Error} If decryption or authentication fails
   */
  decrypt(encryptedData, associatedData = 'credential') {
    try {
      const { encryptedData: encrypted, iv: ivHex, authTag: authTagHex, ciphertext } = encryptedData;
      
      // Use encrypted field or ciphertext alias
      const actualEncrypted = encrypted || ciphertext;

      if (!actualEncrypted || !ivHex || !authTagHex) {
        throw new Error('Missing encryption components (encryptedData, iv, or authTag)');
      }

      // Convert from hex to buffers
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Validate sizes
      if (iv.length !== 12) throw new Error('Invalid IV length (expected 12 bytes)');
      if (authTag.length !== 16) throw new Error('Invalid auth tag length (expected 16 bytes)');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);

      // Set authentication tag for verification
      decipher.setAuthTag(authTag);

      // Set associated authenticated data (must match encryption)
      decipher.setAAD(Buffer.from(associatedData));

      // Decrypt the data
      let decrypted = decipher.update(actualEncrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Try to parse as JSON, return as string if not valid JSON
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      // Don't log the encrypted data itself for security
      logger.error('Decryption failed', {
        error: error.message,
        associatedData,
        reason: error.name === 'TypeError' ? 'Authentication tag verification failed' : 'Unknown error',
      });
      throw new Error(`Failed to decrypt credential: ${error.message}`);
    }
  }

  /**
   * Encrypt SMTP credentials
   * @param {object} smtpConfig - { host, port, user, pass, secure }
   * @returns {object} - Encrypted SMTP config with encryption metadata
   */
  encryptSmtpCredentials(smtpConfig) {
    const { encryptedData, iv, authTag } = this.encrypt(smtpConfig, 'smtp-config');
    
    return {
      encryptedConfig: encryptedData,
      iv,
      authTag,
      // Store non-sensitive config in plaintext for reference
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: smtpConfig.user, // Username may be visible for reference
    };
  }

  /**
   * Decrypt SMTP credentials
   * @param {object} encryptedSmtp - { encryptedConfig, iv, authTag }
   * @returns {object} - Decrypted SMTP configuration
   */
  decryptSmtpCredentials(encryptedSmtp) {
    return this.decrypt(
      { 
        encryptedData: encryptedSmtp.encryptedConfig,
        iv: encryptedSmtp.iv,
        authTag: encryptedSmtp.authTag,
      },
      'smtp-config'
    );
  }

  /**
   * Encrypt webhook URL with optional authentication
   * @param {string} webhookUrl - The webhook URL
   * @param {object} [auth] - Optional authentication { type, token, header }
   * @returns {object} - { encryptedUrl, iv, authTag, publicUrl }
   */
  encryptWebhookCredentials(webhookUrl, auth = null) {
    const credentials = {
      url: webhookUrl,
      auth,
      encrypted_at: new Date().toISOString(),
    };

    const { encryptedData, iv, authTag } = this.encrypt(credentials, 'webhook-credential');

    return {
      encryptedUrl: encryptedData,
      iv,
      authTag,
      // Store hash of URL for reference (one-way)
      urlHash: crypto.createHash('sha256').update(webhookUrl).digest('hex'),
      hasAuth: Boolean(auth),
    };
  }

  /**
   * Decrypt webhook credentials
   * @param {object} encryptedWebhook - { encryptedUrl, iv, authTag }
   * @returns {object} - { url, auth }
   */
  decryptWebhookCredentials(encryptedWebhook) {
    const decrypted = this.decrypt(
      {
        encryptedData: encryptedWebhook.encryptedUrl,
        iv: encryptedWebhook.iv,
        authTag: encryptedWebhook.authTag,
      },
      'webhook-credential'
    );

    return {
      url: decrypted.url,
      auth: decrypted.auth,
    };
  }

  /**
   * Encrypt Slack webhook URL
   * @param {string} webhookUrl - Slack webhook URL
   * @returns {object} - { encryptedUrl, iv, authTag }
   */
  encryptSlackWebhook(webhookUrl) {
    return this.encryptWebhookCredentials(webhookUrl, { type: 'slack-webhook' });
  }

  /**
   * Decrypt Slack webhook URL
   * @param {object} encrypted - Encrypted webhook data
   * @returns {string} - Webhook URL
   */
  decryptSlackWebhook(encrypted) {
    const { url } = this.decryptWebhookCredentials(encrypted);
    return url;
  }

  /**
   * Encrypt API token or key
   * @param {string} token - API token or key
   * @param {string} [type] - Token type for AAD (e.g., 'slack-api', 'github-token')
   * @returns {object} - { encryptedToken, iv, authTag, tokenHash }
   */
  encryptToken(token, type = 'api-token') {
    const { encryptedData, iv, authTag } = this.encrypt(token, `token:${type}`);

    return {
      encryptedToken: encryptedData,
      iv,
      authTag,
      // Store hash of token for reference/validation
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      tokenType: type,
    };
  }

  /**
   * Decrypt API token
   * @param {object} encrypted - { encryptedToken, iv, authTag }
   * @param {string} [type] - Token type (must match encryption)
   * @returns {string} - Decrypted token
   */
  decryptToken(encrypted, type = 'api-token') {
    return this.decrypt(
      {
        encryptedData: encrypted.encryptedToken,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
      `token:${type}`
    );
  }

  /**
   * Hash credential for validation without storing plaintext
   * Uses SHA-256 for one-way hashing
   * 
   * @param {string} credential - The credential to hash
   * @param {string} [salt] - Optional salt (if not provided, uses global salt)
   * @returns {string} - Hex-encoded hash
   */
  hashCredential(credential, salt = 'credential-hash-salt') {
    return crypto
      .createHash('sha256')
      .update(credential + salt)
      .digest('hex');
  }

  /**
   * Validate credential against hash
   * @param {string} credential - The credential to validate
   * @param {string} hash - The stored hash
   * @param {string} [salt] - Optional salt (must match hashing salt)
   * @returns {boolean} - True if credential matches hash
   */
  validateCredential(credential, hash, salt = 'credential-hash-salt') {
    const computedHash = this.hashCredential(credential, salt);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(hash)
    );
  }

  /**
   * Generate secure random token
   * Useful for creating temporary credentials or API keys
   * 
   * @param {number} [length=32] - Token length in bytes
   * @returns {string} - Hex-encoded random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validate encryption key configuration
   * @returns {boolean} - True if encryption key is properly configured
   */
  validateKeyConfiguration() {
    if (!this.encryptionKeyEnv) {
      logger.warn('SECURE_ENCRYPTION_KEY environment variable not set');
      return false;
    }
    
    if (this.encryptionKey.length !== 32) {
      logger.error('Encryption key is not 32 bytes', {
        length: this.encryptionKey.length,
      });
      return false;
    }

    return true;
  }

  /**
   * Test encryption/decryption round-trip
   * @returns {boolean} - True if encryption/decryption works
   */
  testEncryptionRoundTrip() {
    try {
      const testData = { test: 'data', timestamp: Date.now() };
      const encrypted = this.encrypt(testData, 'test');
      const decrypted = this.decrypt(encrypted, 'test');

      if (
        decrypted.test === testData.test &&
        decrypted.timestamp === testData.timestamp
      ) {
        logger.debug('Encryption round-trip test passed');
        return true;
      }

      logger.error('Encryption round-trip test failed: Data mismatch');
      return false;
    } catch (error) {
      logger.error('Encryption round-trip test failed', { error: error.message });
      return false;
    }
  }
}

// Create and export singleton instance
const secureCredentialService = new SecureCredentialService();

// Validate on startup
if (!secureCredentialService.validateKeyConfiguration()) {
  logger.warn(
    'Encryption key not properly configured. ' +
    'Set SECURE_ENCRYPTION_KEY environment variable for production.'
  );
}

if (!secureCredentialService.testEncryptionRoundTrip()) {
  logger.warn('Encryption service self-test failed');
}

module.exports = secureCredentialService;
