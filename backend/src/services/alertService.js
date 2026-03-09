const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('./logger');

/**
 * AlertService
 * Handles deployment alerts across multiple channels (email, Slack, webhooks)
 * Supports configurable alert rules and conditions
 */
class AlertService {
  constructor() {
    this.emailTransporter = null;
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.alertRules = new Map();
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter
   * @private
   */
  initializeEmailTransporter() {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      logger.info('Email transporter initialized', {
        host: process.env.SMTP_HOST,
      });
    } else {
      logger.warn('Email transporter not configured (SMTP_HOST not set)');
    }
  }

  /**
   * Send email alert
   * @param {object} alertData - Alert data
   * @returns {Promise} Send result
   */
  async sendEmailAlert(alertData) {
    try {
      const { recipients, subject, message, deploymentId, severity } = alertData;

      if (!this.emailTransporter || !recipients || recipients.length === 0) {
        logger.warn('Email alert skipped', {
          reason: 'No email transporter or recipients',
          deploymentId,
        });
        return { success: false, reason: 'Email not configured' };
      }

      const htmlContent = this._generateEmailHtml(
        subject,
        message,
        deploymentId,
        severity
      );

      const info = await this.emailTransporter.sendMail({
        from: process.env.ALERT_EMAIL_FROM || 'alerts@zlaws.io',
        to: recipients.join(','),
        subject: `[${severity.toUpperCase()}] ${subject}`,
        html: htmlContent,
        replyTo: process.env.ALERT_EMAIL_REPLY_TO,
      });

      logger.info('Email alert sent', {
        deploymentId,
        recipients: recipients.length,
        messageId: info.messageId,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email alert', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send Slack alert
   * @param {object} alertData - Alert data
   * @returns {Promise} Send result
   */
  async sendSlackAlert(alertData) {
    try {
      const { channel, subject, message, deploymentId, severity } = alertData;

      if (!this.slackWebhookUrl) {
        logger.warn('Slack alert skipped', {
          reason: 'Slack webhook not configured',
          deploymentId,
        });
        return { success: false, reason: 'Slack not configured' };
      }

      const color = this._getSeverityColor(severity);
      const payload = {
        channel: channel || process.env.SLACK_CHANNEL || '#alerts',
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

      const response = await axios.post(this.slackWebhookUrl, payload);

      logger.info('Slack alert sent', {
        deploymentId,
        status: response.status,
      });

      return { success: true, status: response.status };
    } catch (error) {
      logger.error('Failed to send Slack alert', {
        error: error.message,
        deploymentId: alertData.deploymentId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send webhook alert
   * @param {object} alertData - Alert data
   * @returns {Promise} Send result
   */
  async sendWebhookAlert(alertData) {
    try {
      const { webhookUrl, subject, message, deploymentId, severity } = alertData;

      if (!webhookUrl) {
        logger.warn('Webhook alert skipped', {
          reason: 'No webhook URL provided',
          deploymentId,
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

      const response = await axios.post(webhookUrl, payload, {
        timeout: 10000,
      });

      logger.info('Webhook alert sent', {
        deploymentId,
        webhookUrl: webhookUrl.substring(0, 50) + '...',
        status: response.status,
      });

      return { success: true, status: response.status };
    } catch (error) {
      logger.error('Failed to send webhook alert', {
        error: error.message,
        deploymentId: alertData.deploymentId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Register an alert rule
   * @param {string} ruleId - Rule identifier
   * @param {object} rule - Rule configuration
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
   * @param {object} deploymentData - Deployment data to check against rules
   * @returns {Promise} Triggered alerts
   */
  async checkAndTriggerAlerts(deploymentData) {
    try {
      const triggeredAlerts = [];

      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue;

        if (this._evaluateCondition(rule.condition, deploymentData)) {
          const alertData = this._buildAlertData(
            rule,
            deploymentData
          );

          const results = await this._sendAlert(alertData, rule.channels);

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
   * Send alert to specified channels
   * @private
   */
  async _sendAlert(alertData, channels) {
    const results = {};

    if (channels.includes('email')) {
      results.email = await this.sendEmailAlert(alertData);
    }

    if (channels.includes('slack')) {
      results.slack = await this.sendSlackAlert(alertData);
    }

    if (channels.includes('webhook') && alertData.webhookUrl) {
      results.webhook = await this.sendWebhookAlert(alertData);
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
      recipients: this._getAlertRecipients(rule),
      channel: this._getSlackChannel(rule),
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
   * Get alert recipients
   * @private
   */
  _getAlertRecipients(rule) {
    const recipients = [];
    if (process.env.ALERT_EMAIL_RECIPIENTS) {
      recipients.push(...process.env.ALERT_EMAIL_RECIPIENTS.split(','));
    }
    return recipients;
  }

  /**
   * Get Slack channel
   * @private
   */
  _getSlackChannel(rule) {
    return rule.channel || process.env.SLACK_CHANNEL || '#alerts';
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
}

// Create singleton instance
const alertService = new AlertService();

module.exports = alertService;
