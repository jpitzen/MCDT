const crypto = require('crypto');
const logger = require('./logger');
const { encrypt: sharedEncrypt, decrypt: sharedDecrypt, getEncryptionKey } = require('../utils/encryption');

/**
 * CredentialService - Handles encryption/decryption of multi-cloud credentials
 * Uses AES-256-GCM for authenticated encryption
 * 
 * Supported cloud providers:
 * - AWS: accessKeyId, secretAccessKey
 * - Azure: clientId, clientSecret, tenantId, subscriptionId
 * - GCP: serviceAccountKey (JSON), projectId
 * - DigitalOcean: apiToken
 * - Linode: apiToken
 */
class CredentialService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.encryptionKey = getEncryptionKey();

    // Define required fields for each cloud provider
    this.providerRequiredFields = {
      aws: ['accessKeyId', 'secretAccessKey'],
      azure: ['clientId', 'clientSecret', 'tenantId'],
      gcp: ['serviceAccountKey'],
      digitalocean: ['apiToken'],
      linode: ['apiToken'],
    };

    // Define optional fields for each cloud provider
    this.providerOptionalFields = {
      aws: ['sessionToken', 'region', 'regions'],
      azure: ['subscriptionId', 'region'],
      gcp: ['projectId', 'region'],
      digitalocean: ['region'],
      linode: ['region'],
    };
  }

  /**
   * Encrypt sensitive credential data (delegates to shared encryption utility)
   * @param {string} plaintext - The data to encrypt
   * @returns {object} - { encryptedData, iv, authTag }
   */
  encrypt(plaintext) {
    try {
      return sharedEncrypt(plaintext, this.encryptionKey);
    } catch (error) {
      logger.error('Encryption error', error);
      throw new Error('Failed to encrypt credential data');
    }
  }

  /**
   * Decrypt credential data (delegates to shared encryption utility)
   * @param {string} encryptedData - The encrypted data (hex string)
   * @param {string} iv - The initialization vector (hex string)
   * @param {string} authTag - The authentication tag (hex string)
   * @returns {string} - The decrypted plaintext
   */
  decrypt(encryptedData, iv, authTag) {
    try {
      return sharedDecrypt(encryptedData, iv, authTag, this.encryptionKey);
    } catch (error) {
      logger.error('Decryption error', error);
      throw new Error('Failed to decrypt credential data');
    }
  }

  /**
   * Encrypt AWS credentials for storage
   * @param {object} credentials - { accessKeyId, secretAccessKey }
   * @returns {object} - Encrypted credentials with IV and authTag
   */
  encryptCredentials(credentials) {
    try {
      // Encrypt both keys together as JSON (same as original design)
      // This maintains compatibility with the database schema
      const credentialString = JSON.stringify({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      });

      const { encryptedData, iv, authTag } = this.encrypt(credentialString);

      return {
        encryptedAccessKeyId: encryptedData,
        encryptedSecretAccessKey: encryptedData, // Store same encrypted data in both fields
        encryptionIv: iv,
        authTag: authTag,
      };
    } catch (error) {
      logger.error('Failed to encrypt credentials', error);
      throw error;
    }
  }

  /**
   * Decrypt AWS credentials from storage
   * @param {object} encryptedData - { encryptedAccessKeyId, encryptedSecretAccessKey, encryptionIv, authTag }
   * @returns {object} - { accessKeyId, secretAccessKey }
   */
  decryptCredentials(encryptedData) {
    try {
      // Decrypt the credential data (stored as JSON in encryptedAccessKeyId)
      const decrypted = this.decrypt(
        encryptedData.encryptedAccessKeyId,
        encryptedData.encryptionIv,
        encryptedData.authTag
      );

      // Parse the JSON to extract both keys
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt credentials', error);
      throw error;
    }
  }

  /**
   * Create a hash of credentials for validation (non-reversible)
   * @param {string} accessKeyId - AWS access key ID
   * @returns {string} - SHA256 hash
   */
  hashAccessKey(accessKeyId) {
    return crypto.createHash('sha256').update(accessKeyId).digest('hex');
  }

  /**
   * Validate encryption key is properly configured
   * @returns {boolean}
   */
  validateEncryptionKey() {
    return this.encryptionKey && this.encryptionKey.length === 32;
  }

  /**
   * Rotate encryption key (for key management)
   * Note: In production, this would require re-encrypting all stored credentials
   * @param {string} newKey - The new encryption key
   */
  rotateEncryptionKey(newKey) {
    try {
      const newHashedKey = crypto
        .createHash('sha256')
        .update(newKey)
        .digest();

      if (newHashedKey.length === 32) {
        this.encryptionKey = newHashedKey;
        logger.info('Encryption key rotated successfully');
        return true;
      }

      throw new Error('Invalid encryption key format');
    } catch (error) {
      logger.error('Failed to rotate encryption key', error);
      throw error;
    }
  }

  // ============================================================================
  // Multi-Cloud Credential Methods
  // ============================================================================

  /**
   * Validate that all required fields are present for a cloud provider
   * @param {string} provider - Cloud provider name
   * @param {object} credentials - Credential data object
   * @returns {object} - { valid: boolean, missingFields: string[] }
   */
  validateProviderCredentials(provider, credentials) {
    const requiredFields = this.providerRequiredFields[provider];
    if (!requiredFields) {
      return { valid: false, missingFields: [], error: `Unknown provider: ${provider}` };
    }

    const missingFields = requiredFields.filter(field => !credentials[field]);
    return {
      valid: missingFields.length === 0,
      missingFields,
      error: missingFields.length > 0 ? `Missing required fields: ${missingFields.join(', ')}` : null,
    };
  }

  /**
   * Encrypt multi-cloud credential data
   * @param {string} provider - Cloud provider (aws, azure, gcp, digitalocean, linode)
   * @param {object} credentials - Provider-specific credential object
   * @returns {object} - { encryptedCredentialData, credentialDataIv, credentialDataAuthTag }
   */
  encryptMultiCloudCredentials(provider, credentials) {
    try {
      // Validate required fields
      const validation = this.validateProviderCredentials(provider, credentials);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Build the credential object based on provider
      let credentialData = { provider };

      switch (provider) {
        case 'aws':
          credentialData = {
            ...credentialData,
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken || null,
            region: credentials.region || 'us-east-1',
            regions: credentials.regions || [credentials.region || 'us-east-1'],
          };
          break;

        case 'azure':
          credentialData = {
            ...credentialData,
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            tenantId: credentials.tenantId,
            subscriptionId: credentials.subscriptionId || null,
            region: credentials.region || 'eastus',
          };
          break;

        case 'gcp':
          // serviceAccountKey can be a JSON object or string
          const serviceAccountKey = typeof credentials.serviceAccountKey === 'string'
            ? JSON.parse(credentials.serviceAccountKey)
            : credentials.serviceAccountKey;
          
          credentialData = {
            ...credentialData,
            serviceAccountKey: serviceAccountKey,
            projectId: credentials.projectId || serviceAccountKey.project_id,
            region: credentials.region || 'us-central1',
          };
          break;

        case 'digitalocean':
          credentialData = {
            ...credentialData,
            apiToken: credentials.apiToken,
            region: credentials.region || 'nyc1',
          };
          break;

        case 'linode':
          credentialData = {
            ...credentialData,
            apiToken: credentials.apiToken,
            region: credentials.region || 'us-east',
          };
          break;

        default:
          throw new Error(`Unsupported cloud provider: ${provider}`);
      }

      // Encrypt the entire credential object as JSON
      const credentialString = JSON.stringify(credentialData);
      const { encryptedData, iv, authTag } = this.encrypt(credentialString);

      logger.info(`Multi-cloud credentials encrypted for ${provider}`);

      return {
        encryptedCredentialData: encryptedData,
        credentialDataIv: iv,
        credentialDataAuthTag: authTag,
      };
    } catch (error) {
      logger.error(`Failed to encrypt ${provider} credentials`, error);
      throw error;
    }
  }

  /**
   * Decrypt multi-cloud credential data
   * @param {object} encryptedData - { encryptedCredentialData, credentialDataIv, credentialDataAuthTag }
   * @returns {object} - Provider-specific credential object with provider field
   */
  decryptMultiCloudCredentials(encryptedData) {
    try {
      if (!encryptedData.encryptedCredentialData) {
        throw new Error('No encrypted credential data provided');
      }

      const decrypted = this.decrypt(
        encryptedData.encryptedCredentialData,
        encryptedData.credentialDataIv,
        encryptedData.credentialDataAuthTag
      );

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt multi-cloud credentials', error);
      throw error;
    }
  }

  /**
   * Get decrypted credentials from a Credential model instance
   * Handles both legacy AWS-only format and new multi-cloud format
   * @param {object} credential - Credential model instance
   * @returns {object} - Decrypted credential data
   */
  getDecryptedCredentialFromModel(credential) {
    if (!credential) {
      throw new Error('Credential is required');
    }

    // Check for new multi-cloud format first
    if (credential.encryptedCredentialData) {
      return this.decryptMultiCloudCredentials({
        encryptedCredentialData: credential.encryptedCredentialData,
        credentialDataIv: credential.credentialDataIv,
        credentialDataAuthTag: credential.credentialDataAuthTag,
      });
    }

    // Fall back to legacy AWS format
    if (credential.encryptedAccessKeyId && credential.authTag) {
      const decrypted = this.decryptCredentials({
        encryptedAccessKeyId: credential.encryptedAccessKeyId,
        encryptedSecretAccessKey: credential.encryptedSecretAccessKey,
        encryptionIv: credential.encryptionIv,
        authTag: credential.authTag,
      });

      return {
        provider: 'aws',
        accessKeyId: decrypted.accessKeyId,
        secretAccessKey: decrypted.secretAccessKey,
        region: credential.cloudRegion || credential.awsRegion || 'us-east-1',
        regions: credential.additionalRegions || [credential.cloudRegion || credential.awsRegion || 'us-east-1'],
        accountId: credential.awsAccountId || credential.cloudAccountId,
      };
    }

    throw new Error('No encrypted credential data found');
  }

  /**
   * Get required fields for a cloud provider
   * @param {string} provider - Cloud provider name
   * @returns {string[]} - Array of required field names
   */
  getRequiredFields(provider) {
    return this.providerRequiredFields[provider] || [];
  }

  /**
   * Get optional fields for a cloud provider
   * @param {string} provider - Cloud provider name
   * @returns {string[]} - Array of optional field names
   */
  getOptionalFields(provider) {
    return this.providerOptionalFields[provider] || [];
  }

  /**
   * Get all supported cloud providers
   * @returns {string[]} - Array of supported provider names
   */
  getSupportedProviders() {
    return Object.keys(this.providerRequiredFields);
  }
}

module.exports = new CredentialService();
