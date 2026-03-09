const AWS = require('aws-sdk');
const logger = require('./logger');

/**
 * Get secret value from AWS Secrets Manager
 * @param {string} secretArn - Secret ARN
 * @returns {string} Secret value
 */
async function getSecretFromSecretsManager(secretArn) {
  try {
    // Extract region from ARN (format: arn:aws:secretsmanager:region:account:secret:name)
    const region = secretArn.split(':')[3];

    const secretsManager = new AWS.SecretsManager({
      region: region,
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
