const winston = require('winston');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');

// Define custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'gray',
  },
};

// Create formatters
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaStr}`;
    }
  )
);

// Create logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    // Console transport (all levels during development)
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: consoleFormat,
    }),

    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add custom methods for audit logging
logger.audit = (action, resourceType, resourceId, user, changes, status = 'success') => {
  logger.info(`AUDIT: ${action}`, {
    action,
    resourceType,
    resourceId,
    userId: user?.id,
    changes,
    status,
  });
};

// Add custom methods for deployment logging
logger.deployment = (deploymentId, phase, message, metadata = {}) => {
  logger.info(`DEPLOYMENT[${deploymentId}] Phase ${phase}: ${message}`, {
    deploymentId,
    phase,
    ...metadata,
  });
};

// Add security logging
logger.security = (event, severity, details) => {
  const method = severity === 'critical' ? 'error' : 'warn';
  logger[method](`SECURITY: ${event}`, details);
};

/**
 * Create a child logger bound with a request's correlation ID.
 * Usage in middleware/routes:  req.log = logger.child({ correlationId: req.correlationId });
 * Or simply call logger.withCorrelationId(req) which returns a bound child.
 */
logger.withCorrelationId = (req) => {
  if (!req?.correlationId) return logger;
  return logger.child({ correlationId: req.correlationId });
};

winston.addColors(customLevels.colors);

module.exports = logger;
