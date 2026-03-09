const AWS = require('aws-sdk');
const logger = require('../logger');

class AWSSecretsService {
  constructor() {
    this.secretsManager = null;
  }

  /**
   * Initialize AWS Secrets Manager client
   * @param {object} credentials - AWS credentials { accessKeyId, secretAccessKey, region }
   */
  async initialize(credentials) {
    try {
      const config = {
        region: credentials.region || process.env.AWS_REGION || 'us-east-1',
      };

      if (credentials.accessKeyId && credentials.secretAccessKey) {
        config.accessKeyId = credentials.accessKeyId;
        config.secretAccessKey = credentials.secretAccessKey;
      }

      this.secretsManager = new AWS.SecretsManager(config);
      logger.debug('AWS Secrets Manager initialized', { region: config.region });
    } catch (error) {
      logger.error('Failed to initialize AWS Secrets Manager', { error: error.message });
      throw new Error(`AWS Secrets Manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Store credentials as a secret in AWS Secrets Manager
   * @param {string} deploymentId - Unique deployment identifier
   * @param {object} credentials - Credentials to store
   * @returns {string} ARN of the stored secret
   */
  async storeCredentials(deploymentId, credentials) {
    if (!this.secretsManager) {
      throw new Error('AWS Secrets Manager not initialized');
    }

    try {
      const secretName = `/zl-mcdt/${deploymentId}/credentials`;
      const secretValue = JSON.stringify(credentials);

      const params = {
        Name: secretName,
        SecretString: secretValue,
        Tags: [
          { Key: 'project', Value: 'multi-cloud-deployer' },
          { Key: 'deployment-id', Value: deploymentId },
          { Key: 'managed-by', Value: 'zl-mcdt' },
        ],
      };

      const result = await this.secretsManager.createSecret(params).promise();
      logger.audit(`credentials_stored_aws_secrets`, 'credential', deploymentId, null, {
        secret_name: secretName,
        arn: result.ARN,
      }, 'success');

      return result.ARN;
    } catch (error) {
      if (error.code === 'ResourceExistsException') {
        logger.warn('Secret already exists, updating', { deploymentId });
        return this.updateCredentials(deploymentId, credentials);
      }
      logger.error('Failed to store credentials in AWS Secrets Manager', {
        deploymentId,
        error: error.message,
      });
      throw new Error(`Failed to store credentials: ${error.message}`);
    }
  }

  /**
   * Update existing credentials in AWS Secrets Manager
   * @param {string} deploymentId - Unique deployment identifier
   * @param {object} credentials - Updated credentials
   * @returns {string} ARN of the updated secret
   */
  async updateCredentials(deploymentId, credentials) {
    if (!this.secretsManager) {
      throw new Error('AWS Secrets Manager not initialized');
    }

    try {
      const secretName = `/zl-mcdt/${deploymentId}/credentials`;
      const secretValue = JSON.stringify(credentials);

      const params = {
        SecretId: secretName,
        SecretString: secretValue,
      };

      const result = await this.secretsManager.updateSecret(params).promise();
      logger.info('Credentials updated in AWS Secrets Manager', { deploymentId });

      return result.ARN;
    } catch (error) {
      logger.error('Failed to update credentials', { deploymentId, error: error.message });
      throw new Error(`Failed to update credentials: ${error.message}`);
    }
  }

  /**
   * Retrieve credentials from AWS Secrets Manager
   * @param {string} deploymentId - Unique deployment identifier or ARN
   * @returns {object} Parsed credentials
   */
  async retrieveCredentials(deploymentId) {
    if (!this.secretsManager) {
      throw new Error('AWS Secrets Manager not initialized');
    }

    try {
      // Check if deploymentId is an ARN or a plain ID
      let secretName;
      if (deploymentId.startsWith('arn:aws:secretsmanager:')) {
        // It's an ARN, use it directly
        secretName = deploymentId;
      } else {
        // It's a deployment ID, construct the secret name
        secretName = `/zl-mcdt/${deploymentId}/credentials`;
      }

      const params = {
        SecretId: secretName,
      };

      const result = await this.secretsManager.getSecretValue(params).promise();
      const credentials = JSON.parse(result.SecretString);

      logger.audit(`credentials_retrieved_aws_secrets`, 'credential', deploymentId, null, {
        secret_name: secretName,
      }, 'success');

      return credentials;
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        logger.warn('Credentials not found in AWS Secrets Manager', { deploymentId });
        throw new Error(`Credentials not found: ${deploymentId}`);
      }
      logger.error('Failed to retrieve credentials from AWS Secrets Manager', {
        deploymentId,
        error: error.message,
      });
      throw new Error(`Failed to retrieve credentials: ${error.message}`);
    }
  }

  /**
   * Delete credentials from AWS Secrets Manager
   * @param {string} deploymentId - Unique deployment identifier
   * @param {boolean} forceDelete - Force delete without recovery window
   */
  async deleteCredentials(deploymentId, forceDelete = false) {
    if (!this.secretsManager) {
      throw new Error('AWS Secrets Manager not initialized');
    }

    try {
      const secretName = `/zl-mcdt/${deploymentId}/credentials`;

      const params = {
        SecretId: secretName,
        RecoveryWindowInDays: forceDelete ? 7 : 30,
      };

      await this.secretsManager.deleteSecret(params).promise();
      logger.audit(`credentials_deleted_aws_secrets`, 'credential', deploymentId, null, {
        secret_name: secretName,
        force: forceDelete,
      }, 'success');

      logger.info('Credentials deleted from AWS Secrets Manager', { deploymentId });
    } catch (error) {
      logger.error('Failed to delete credentials', { deploymentId, error: error.message });
      throw new Error(`Failed to delete credentials: ${error.message}`);
    }
  }

  /**
   * Rotate credentials by creating a new version
   * @param {string} deploymentId - Unique deployment identifier
   * @param {object} newCredentials - New credentials for rotation
   */
  async rotateCredentials(deploymentId, newCredentials) {
    try {
      const arn = await this.updateCredentials(deploymentId, newCredentials);
      logger.audit(`credentials_rotated_aws_secrets`, 'credential', deploymentId, null, {
        arn,
      }, 'success');

      return arn;
    } catch (error) {
      logger.error('Failed to rotate credentials', { deploymentId, error: error.message });
      throw error;
    }
  }

  /**
   * List all secrets for a deployment
   * @param {string} deploymentId - Unique deployment identifier
   * @returns {array} List of secrets metadata
   */
  async listSecrets(deploymentId) {
    if (!this.secretsManager) {
      throw new Error('AWS Secrets Manager not initialized');
    }

    try {
      const params = {
        Filters: [
          {
            Key: 'name',
            Values: [`/zl-mcdt/${deploymentId}`],
          },
        ],
      };

      const result = await this.secretsManager.listSecrets(params).promise();
      return result.SecretList || [];
    } catch (error) {
      logger.error('Failed to list secrets', { deploymentId, error: error.message });
      throw new Error(`Failed to list secrets: ${error.message}`);
    }
  }

  /**
   * Validate AWS Secrets Manager access
   * @returns {boolean} True if accessible
   */
  async validateAccess() {
    if (!this.secretsManager) {
      throw new Error('AWS Secrets Manager not initialized');
    }

    try {
      await this.secretsManager.listSecrets({ MaxResults: 1 }).promise();
      logger.info('AWS Secrets Manager access validated');
      return true;
    } catch (error) {
      logger.error('AWS Secrets Manager access validation failed', { error: error.message });
      throw new Error(`Access validation failed: ${error.message}`);
    }
  }
}

module.exports = new AWSSecretsService();
