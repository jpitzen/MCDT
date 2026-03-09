const { AuditLog } = require('../models');
const logger = require('../services/logger');

/**
 * Audit logging middleware
 * Logs all API requests and their outcomes
 */
const auditLogger = async (req, res, next) => {
  // Capture response
  const originalSend = res.send;

  let responseStatus = null;
  let responseData = null;

  res.send = function (data) {
    responseStatus = res.statusCode;
    responseData = data;
    originalSend.call(this, data);
  };

  // Continue to next middleware
  next();

  // Log audit entry after response is sent
  setImmediate(async () => {
    try {
      const isSuccess = responseStatus < 400;

      // Determine action from method and path
      let action = `${req.method}`;
      let resourceType = 'unknown';

      if (req.path.includes('/credentials')) {
        resourceType = 'credential';
      } else if (req.path.includes('/deployments')) {
        resourceType = 'deployment';
      } else if (req.path.includes('/clusters')) {
        resourceType = 'cluster';
      } else if (req.path.includes('/auth')) {
        resourceType = 'auth';
      }

      // Don't audit GET requests for list endpoints (too verbose)
      if (req.method === 'GET' && req.path.endsWith(resourceType + 's')) {
        return;
      }

      // Create audit log entry
      const auditEntry = {
        userId: req.user?.id || null,
        action: action,
        resourceType: resourceType,
        resourceId: req.params.id || null,
        actionStatus: isSuccess ? 'success' : 'failure',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        requestPath: req.path,
        requestMethod: req.method,
        context: {
          query: req.query,
          params: req.params,
        },
      };

      // Add error message if failed
      if (!isSuccess && responseData) {
        try {
          const parsed = JSON.parse(responseData);
          auditEntry.errorMessage = parsed.message || 'Unknown error';
        } catch (e) {
          auditEntry.errorMessage = responseData.substring(0, 200);
        }
      }

      // Save audit log
      await AuditLog.create(auditEntry);

      logger.audit(
        action,
        resourceType,
        auditEntry.resourceId,
        req.user,
        null,
        auditEntry.actionStatus
      );
    } catch (error) {
      logger.error('Failed to create audit log', error);
      // Don't throw - auditing shouldn't break requests
    }
  });
};

/**
 * Request/Response logging middleware
 * Logs incoming requests and outgoing responses
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
    });
  });

  next();
};

/**
 * Action logging decorator
 * Logs specific actions within route handlers
 */
const logAction = (actionName, resourceType, getResourceId = null) => {
  return async (req, res, next) => {
    try {
      const resourceId = getResourceId ? getResourceId(req) : req.params.id;

      logger.audit(actionName, resourceType, resourceId, req.user);

      next();
    } catch (error) {
      logger.error('Error in logAction decorator', error);
      next();
    }
  };
};

module.exports = {
  auditLogger,
  requestLogger,
  logAction,
};
