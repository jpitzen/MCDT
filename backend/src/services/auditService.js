/**
 * Audit Service
 *
 * Structured audit logging to the audit_logs DB table AND Winston logger.
 * Provides a single `log()` method used across all security-relevant operations.
 */
const { AuditLog } = require('../models');
const logger = require('./logger');

class AuditService {
  /**
   * Write an audit record.
   *
   * @param {string}  category     – High-level category (e.g. 'auth', 'ad_config', 'ad_sync', 'role_mapping', 'theme')
   * @param {string}  action       – Specific event (e.g. 'login_success', 'config_created')
   * @param {object}  details      – Freeform metadata (never include plaintext passwords)
   * @param {object}  options
   * @param {string}  [options.userId]        – Actor's user ID (null for anonymous / failed logins)
   * @param {string}  [options.resourceId]    – ID of the affected resource
   * @param {string}  [options.resourceName]  – Human-readable name of the resource
   * @param {string}  [options.status]        – 'success' | 'failure' | 'pending'
   * @param {string}  [options.errorMessage]  – Error description on failure
   * @param {object}  [options.req]           – Express request for IP / user-agent extraction
   */
  async log(category, action, details = {}, options = {}) {
    const {
      userId = null,
      resourceId = null,
      resourceName = null,
      status = 'success',
      errorMessage = null,
      req = null,
    } = options;

    // ── Winston log (always) ──────────────────────────────────────
    const logPayload = {
      audit: true,
      category,
      action,
      userId,
      resourceId,
      resourceName,
      status,
      ...details,
    };

    if (status === 'failure') {
      logger.warn(`[Audit] ${category}:${action}`, logPayload);
    } else {
      logger.info(`[Audit] ${category}:${action}`, logPayload);
    }

    // ── Database record ───────────────────────────────────────────
    try {
      await AuditLog.create({
        userId,
        action: `${category}:${action}`,
        resourceType: category,
        resourceId: resourceId ? String(resourceId) : null,
        resourceName,
        actionStatus: status,
        changes: details,
        errorMessage,
        ipAddress: req?.ip || null,
        userAgent: req?.get?.('user-agent') || null,
        requestPath: req?.originalUrl || null,
        requestMethod: req?.method || null,
        context: {
          correlationId: req?.correlationId || null,
        },
      });
    } catch (err) {
      // Never let audit failures break business logic
      logger.error('Failed to persist audit record', {
        auditAction: `${category}:${action}`,
        error: err.message,
      });
    }
  }

  // ── Convenience shortcuts ──────────────────────────────────────

  /** Auth events */
  auth(action, details, options) {
    return this.log('auth', action, details, options);
  }

  /** AD configuration events */
  adConfig(action, details, options) {
    return this.log('ad_config', action, details, options);
  }

  /** AD sync events */
  adSync(action, details, options) {
    return this.log('ad_sync', action, details, options);
  }

  /** Role mapping events */
  roleMapping(action, details, options) {
    return this.log('role_mapping', action, details, options);
  }

  /** Theme events */
  theme(action, details, options) {
    return this.log('theme', action, details, options);
  }
}

module.exports = new AuditService();
