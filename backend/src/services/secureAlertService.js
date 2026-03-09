const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('./logger');
const secureCredentialService = require('./secureCredentialService');

/**
 * SecureAlertService
 * Handles deployment alerts across multiple channels with encrypted credential storage
 * Supports:
 * - Email via SMTP (credentials encrypted)
 * - Slack webhooks (URL encrypted)
 * - Custom webhooks (URL and auth encrypted)
 * 
 * All sensitive credentials are stored encrypted in AlertChannelConfig database records
 */
class SecureAlertService {
  constructor() {
    this.emailTransporters = new Map(); // Cache transports by config ID
    this.alertRules = new Map();
    this.logger = logger;
  }

  /**
   * Initialize email transporter from encrypted config
   * Creates and caches transporter for later use
   * 
   * @param {object} configData - AlertChannelConfig with encrypted SMTP credentials
   * @param {object} secureService - SecureCredentialService instance
   * @returns {object} - Nodemailer transporter
   * @throws {Error} If decryption fails
   */
  initializeEmailTransporter(configData, secureService = secureCredentialService) {
    try {
      // Decrypt SMTP credentials
      const smtpConfig = secureService.decryptSmtpCredentials({
        encryptedConfig: configData.encryptedSmtpPassword,
        iv: configData.smtpPasswordIv,
        authTag: configData.smtpPasswordAuthTag,
      });

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      // Cache for later use
      this.emailTransporters.set(configData.id, transporter);

      logger.info('Email transporter initialized from encrypted config', {
        configId: configData.id,
        host: smtpConfig.host,
      });

      return transporter;
    } catch (error) {
      logger.error('Failed to initialize email transporter from encrypted config', {
        configId: configData.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get or initialize email transporter
   * @private
   */
  getEmailTransporter(configId) {
    return this.emailTransporters.get(configId);
  }

  /**
   * Send email alert using encrypted config
   * 
   * @param {object} alertData - Alert data
   * @param {object} channelConfig - AlertChannelConfig with encrypted SMTP
   * @returns {Promise} Send result
   */
  async sendEmailAlert(alertData, channelConfig) {
    try {
      const { subject, message, deploymentId, severity } = alertData;

      // Get recipients from config (not from env)
      const recipients = channelConfig.emailRecipients
        ?.split(',')
        .map((r) => r.trim())
        .filter((r) => r);

      if (!recipients || recipients.length === 0) {
        logger.warn('Email alert skipped', {
          reason: 'No recipients configured',
          deploymentId,
          configId: channelConfig.id,
        });
        return { success: false, reason: 'No recipients configured' };
      }

      // Get or create transporter
      let transporter = this.getEmailTransporter(channelConfig.id);
      if (!transporter) {
        transporter = this.initializeEmailTransporter(channelConfig);
      }

      const htmlContent = this._generateEmailHtml(
        subject,
        message,
        deploymentId,
        severity
      );

      const info = await transporter.sendMail({
        from: channelConfig.emailFrom || 'alerts@zlaws.io',
        to: recipients.join(','),
        subject: `[${severity.toUpperCase()}] ${subject}`,
        html: htmlContent,
        // Don't include replyTo as it might leak config
      });

      logger.audit(
        'email_alert_sent',
        'alert',
        channelConfig.id,
        null,
        {
          deploymentId,
          recipientCount: recipients.length,
          messageId: info.messageId,
          severity,
        },
        'success'
      );

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email alert', {
        error: error.message,
        deploymentId: alertData.deploymentId,
        configId: channelConfig.id,
      });

      // Update failure count in config
      channelConfig.failureCount = (channelConfig.failureCount || 0) + 1;
      channelConfig.lastFailureAt = new Date();
      await channelConfig.save();

      return { success: false, error: error.message };
    }
  }

  /**
   * Send Slack alert using encrypted webhook URL
   * 
   * @param {object} alertData - Alert data
   * @param {object} channelConfig - AlertChannelConfig with encrypted Slack URL
   * @param {object} secureService - SecureCredentialService instance
   * @returns {Promise} Send result
   */
  async sendSlackAlert(alertData, channelConfig, secureService = secureCredentialService) {
    try {
      const { subject, message, deploymentId, severity } = alertData;

      // Decrypt webhook URL
      const webhookUrl = secureService.decryptSlackWebhook({
        encryptedUrl: channelConfig.encryptedSlackWebhookUrl,
        iv: channelConfig.slackWebhookIv,
        authTag: channelConfig.slackWebhookAuthTag,
      });

      if (!webhookUrl) {
        logger.warn('Slack alert skipped', {
          reason: 'No webhook URL configured',
          deploymentId,
          configId: channelConfig.id,
        });
        return { success: false, reason: 'No webhook URL' };
      }

      const color = this._getSeverityColor(severity);
      const payload = {
        channel: channelConfig.slackChannel || '#alerts',
        attachments: [
          {
            color,
            title: subject,
            text: message,
            fields: [
              {
                title: 'Deployment ID',
                value: deploymentId,
                short: true,
              },
              {
                title: 'Severity',
                value: severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: false,
              },
            ],
          },
        ],
      };

      const response = await axios.post(webhookUrl, payload, {
        timeout: 10000,
      });

      logger.audit(
        'slack_alert_sent',
        'alert',
        channelConfig.id,
        null,
        {
          deploymentId,
          channel: channelConfig.slackChannel,
          severity,
        },
        'success'
      );

      return { success: true, status: response.status };
    } catch (error) {
      logger.error('Failed to send Slack alert', {
        error: error.message,
        deploymentId: alertData.deploymentId,
        configId: channelConfig.id,
      });

      // Update failure count
      channelConfig.failureCount = (channelConfig.failureCount || 0) + 1;
      channelConfig.lastFailureAt = new Date();
      await channelConfig.save();

      return { success: false, error: error.message };
    }
  }

  /**
   * Send webhook alert using encrypted URL and credentials
   * 
   * @param {object} alertData - Alert data
   * @param {object} channelConfig - AlertChannelConfig with encrypted webhook config
   * @param {object} secureService - SecureCredentialService instance
   * @returns {Promise} Send result
   */
  async sendWebhookAlert(alertData, channelConfig, secureService = secureCredentialService) {
    try {
      const { subject, message, deploymentId, severity } = alertData;

      // Decrypt webhook URL and auth
      const webhookCreds = secureService.decryptWebhookCredentials({
        encryptedUrl: channelConfig.encryptedWebhookUrl,
        iv: channelConfig.webhookUrlIv,
        authTag: channelConfig.webhookUrlAuthTag,
      });

      if (!webhookCreds.url) {
        logger.warn('Webhook alert skipped', {
          reason: 'No webhook URL configured',
          deploymentId,
          configId: channelConfig.id,
        });
        return { success: false, reason: 'No webhook URL' };
      }

      const payload = {
        timestamp: new Date().toISOString(),
        deploymentId,
        subject,
        message,
        severity,
        source: 'ZLAWS Alert Service',
      };

      // Build headers with auth if configured
      const headers = { 'Content-Type': 'application/json' };
      if (webhookCreds.auth?.token && channelConfig.webhookAuthType !== 'none') {
        const token = secureService.decryptToken(
          {
            encryptedToken: channelConfig.encryptedWebhookAuth,
            iv: channelConfig.webhookAuthIv,
            authTag: channelConfig.webhookAuthAuthTag,
          },
          `webhook-auth:${channelConfig.webhookAuthType}`
        );

        switch (channelConfig.webhookAuthType) {
          case 'bearer':
            headers.Authorization = `Bearer ${token}`;
            break;
          case 'api-key':
            headers['X-API-Key'] = token;
            break;
          case 'basic':
            headers.Authorization = `Basic ${Buffer.from(token).toString('base64')}`;
            break;
        }
      }

      const response = await axios({
        method: channelConfig.webhookMethod || 'POST',
        url: webhookCreds.url,
        data: payload,
        headers,
        timeout: 10000,
      });

      logger.audit(
        'webhook_alert_sent',
        'alert',
        channelConfig.id,
        null,
        {
          deploymentId,
          webhookUrlHash: channelConfig.webhookUrlHash,
          severity,
        },
        'success'
      );

      return { success: true, status: response.status };
    } catch (error) {
      logger.error('Failed to send webhook alert', {
        error: error.message,
        deploymentId: alertData.deploymentId,
        configId: channelConfig.id,
      });

      // Update failure count
      channelConfig.failureCount = (channelConfig.failureCount || 0) + 1;
      channelConfig.lastFailureAt = new Date();
      await channelConfig.save();

      return { success: false, error: error.message };
    }
  }

  /**
   * Register an alert rule
   */
  registerAlertRule(ruleId, rule) {
    const { condition, channels, subject, messageTemplate, enabled = true } = rule;

    if (!condition || !channels || !subject) {
      throw new Error('Invalid alert rule: missing required fields');
    }

    this.alertRules.set(ruleId, {
      ruleId,
      condition,
      channels,
      subject,
      messageTemplate,
      enabled,
      createdAt: new Date(),
    });

    logger.info('Alert rule registered', { ruleId });
  }

  /**
   * Check and trigger alerts based on rules
   * Uses encrypted credentials from AlertChannelConfig
   * 
   * @param {object} deploymentData - Deployment data
   * @param {Array} channelConfigs - Array of AlertChannelConfig records
   * @returns {Promise} Triggered alerts
   */
  async checkAndTriggerAlerts(deploymentData, channelConfigs = []) {
    try {
      const triggeredAlerts = [];

      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue;

        if (this._evaluateCondition(rule.condition, deploymentData)) {
          const alertData = this._buildAlertData(rule, deploymentData);

          // Send to configured channels with encrypted credentials
          const results = await this._sendAlert(alertData, rule.channels, channelConfigs);

          triggeredAlerts.push({
            ruleId,
            deploymentId: deploymentData.id,
            channels: rule.channels,
            results,
            triggeredAt: new Date(),
          });

          logger.info('Alert triggered', {
            ruleId,
            deploymentId: deploymentData.id,
          });
        }
      }

      return triggeredAlerts;
    } catch (error) {
      logger.error('Failed to check and trigger alerts', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send alert to configured channels
   * @private
   */
  async _sendAlert(alertData, channelTypes, channelConfigs) {
    const results = {};

    for (const channelType of channelTypes) {
      const config = channelConfigs.find(
        (c) => c.channelType === channelType && c.enabled
      );

      if (!config) {
        results[channelType] = { success: false, reason: 'Channel not configured' };
        continue;
      }

      switch (channelType) {
        case 'email':
          results.email = await this.sendEmailAlert(alertData, config);
          break;
        case 'slack':
          results.slack = await this.sendSlackAlert(alertData, config);
          break;
        case 'webhook':
          results.webhook = await this.sendWebhookAlert(alertData, config);
          break;
      }
    }

    return results;
  }

  /**
   * Evaluate alert condition
   * @private
   */
  _evaluateCondition(condition, data) {
    const { type, field, operator, value } = condition;

    if (type === 'deployment') {
      const fieldValue = this._getNestedValue(data, field);

      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'notEquals':
          return fieldValue !== value;
        case 'contains':
          return String(fieldValue).includes(value);
        case 'greaterThan':
          return Number(fieldValue) > Number(value);
        case 'lessThan':
          return Number(fieldValue) < Number(value);
        case 'in':
          return Array.isArray(value) && value.includes(fieldValue);
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Get nested object value
   * @private
   */
  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Build alert data
   * @private
   */
  _buildAlertData(rule, deploymentData) {
    const message = rule.messageTemplate
      ? this._interpolateTemplate(rule.messageTemplate, deploymentData)
      : `Deployment ${deploymentData.id} triggered an alert`;

    return {
      ...deploymentData,
      subject: rule.subject,
      message,
      deploymentId: deploymentData.id,
      severity: this._determineSeverity(rule),
    };
  }

  /**
   * Interpolate message template
   * @private
   */
  _interpolateTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return this._getNestedValue(data, key) || match;
    });
  }

  /**
   * Determine severity level
   * @private
   */
  _determineSeverity(rule) {
    if (rule.condition?.field?.includes('error')) return 'critical';
    if (rule.condition?.field?.includes('warn')) return 'warning';
    if (rule.condition?.field?.includes('fail')) return 'error';
    return 'info';
  }

  /**
   * Get severity color for Slack
   * @private
   */
  _getSeverityColor(severity) {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'error':
        return 'warning';
      case 'warning':
        return '#ff9900';
      case 'info':
        return 'good';
      default:
        return '#808080';
    }
  }

  /**
   * Generate HTML email content
   * @private
   */
  _generateEmailHtml(subject, message, deploymentId, severity) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>${subject}</h2>
            <p>${message}</p>
            <hr>
            <p><strong>Deployment ID:</strong> ${deploymentId}</p>
            <p><strong>Severity:</strong> <span style="color: ${this._getSeverityColorHex(severity)}; font-weight: bold;">${severity.toUpperCase()}</span></p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <hr>
            <p style="font-size: 12px; color: #999;">This is an automated alert from ZLAWS Deployment Platform</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get severity color in hex
   * @private
   */
  _getSeverityColorHex(severity) {
    switch (severity) {
      case 'critical':
        return '#d32f2f';
      case 'error':
        return '#f57c00';
      case 'warning':
        return '#fbc02d';
      case 'info':
        return '#1976d2';
      default:
        return '#666';
    }
  }

  /**
   * Get all registered alert rules
   */
  getAllRules() {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get specific alert rule
   */
  getRule(ruleId) {
    return this.alertRules.get(ruleId);
  }

  /**
   * Update alert rule
   */
  updateRule(ruleId, updates) {
    const rule = this.alertRules.get(ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found`);

    const updated = { ...rule, ...updates, updatedAt: new Date() };
    this.alertRules.set(ruleId, updated);

    logger.info('Alert rule updated', { ruleId });
    return updated;
  }

  /**
   * Delete alert rule
   */
  deleteRule(ruleId) {
    const deleted = this.alertRules.delete(ruleId);
    if (deleted) {
      logger.info('Alert rule deleted', { ruleId });
    }
    return deleted;
  }

  /**
   * Test channel configuration
   * Sends a test alert to verify configuration works
   * 
   * @param {object} channelConfig - AlertChannelConfig to test
   * @returns {Promise<object>} Test result
   */
  async testChannel(channelConfig) {
    try {
      const testData = {
        subject: '[TEST] ZLAWS Alert System Test',
        message: 'This is a test message to verify your alert channel is configured correctly.',
        deploymentId: 'test-' + Date.now(),
        severity: 'info',
      };

      let result;

      switch (channelConfig.channelType) {
        case 'email':
          result = await this.sendEmailAlert(testData, channelConfig);
          break;
        case 'slack':
          result = await this.sendSlackAlert(testData, channelConfig);
          break;
        case 'webhook':
          result = await this.sendWebhookAlert(testData, channelConfig);
          break;
        default:
          result = { success: false, reason: 'Unknown channel type' };
      }

      // Update test result
      channelConfig.lastTestedAt = new Date();
      channelConfig.lastTestResult = result.success ? 'success' : result.error || result.reason;
      await channelConfig.save();

      return result;
    } catch (error) {
      logger.error('Channel test failed', {
        configId: channelConfig.id,
        error: error.message,
      });

      channelConfig.lastTestedAt = new Date();
      channelConfig.lastTestResult = error.message;
      await channelConfig.save();

      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const secureAlertService = new SecureAlertService();

module.exports = secureAlertService;
