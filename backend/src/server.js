require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const http = require('http');

// Import models to initialize database
const { sequelize } = require('./models');

// Import services
const { logger } = require('./services');

// Import middleware
const { requestLogger, auditLogger } = require('./middleware/audit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { correlationId } = require('./middleware/correlationId');
const { 
  generalLimiter, 
  authLimiter, 
  deploymentLimiter, 
  credentialLimiter 
} = require('./middleware/rateLimiter');

// Import WebSocket server
const websocketServer = require('./config/websocketServer');

// Import background jobs
const adSyncJob = require('./jobs/adSyncJob');

// Import routes
const authRoutes = require('./routes/auth');
const credentialsRoutes = require('./routes/credentials');
const deploymentsRoutes = require('./routes/deployments');
const deploymentDraftsRoutes = require('./routes/deployment-drafts');
const clustersRoutes = require('./routes/clusters');
const statusRoutes = require('./routes/status');
const analyticsRoutes = require('./routes/analytics');
const alertsRoutes = require('./routes/alerts');
const logsRoutes = require('./routes/logs');
const templatesRoutes = require('./routes/templates');
const teamsRoutes = require('./routes/teams');
const costRoutes = require('./routes/cost');
const usersRoutes = require('./routes/users');
const sqlScriptsRoutes = require('./routes/sqlScripts');
const adminRoutes = require('./routes/admin');
const infrastructureRoutes = require('./routes/infrastructure');
const databaseCredentialsRoutes = require('./routes/databaseCredentials');
const containerDeploymentsRoutes = require('./routes/containerDeployments');
const localDeploymentsRoutes = require('./routes/local-deployments');
const adConfigRoutes = require('./routes/adConfig');
const healthRoutes = require('./routes/health');
const apiDocsRoutes = require('./swagger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || ['http://localhost:3000'],
  credentials: true,
}));

// Response compression
app.use(compression());

// Correlation ID for request tracing
app.use(correlationId);

// Request Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend build (if exists)
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
const fs = require('fs');
const frontendBuildExists = fs.existsSync(frontendBuildPath);
if (frontendBuildExists) {
  app.use(express.static(frontendBuildPath));
}

// Handle favicon.ico requests - return 204 No Content if not found
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(frontendBuildPath, 'favicon.ico');
  if (frontendBuildExists && fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(204).end();
  }
});

// Logging Middleware
app.use(requestLogger);
app.use(auditLogger);

// Rate limiting (apply general limiter to all API routes)
app.use('/api/', generalLimiter);

// Health check endpoint (no auth required)
app.use('/api/health', healthRoutes);

// API Routes (v1 namespace) with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/credentials', credentialLimiter, credentialsRoutes);
app.use('/api/deployments', deploymentLimiter, deploymentsRoutes);
app.use('/api/deployment-drafts', deploymentDraftsRoutes);
app.use('/api/deployments/:deploymentId/sql-scripts', deploymentLimiter, sqlScriptsRoutes);
app.use('/api/clusters', clustersRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/cost', costRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/infrastructure', infrastructureRoutes);
app.use('/api/database-credentials', databaseCredentialsRoutes);
app.use('/api/container-deployments', deploymentLimiter, containerDeploymentsRoutes);
app.use('/api/local-deployments', localDeploymentsRoutes);
app.use('/api/ad-config', credentialLimiter, adConfigRoutes);

// API Documentation (no auth required)
app.use('/api/docs', apiDocsRoutes);

// Serve React app for all non-API routes (must be before 404 handler)
app.get('*', (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Only serve React app if build exists
  if (frontendBuildExists) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  } else {
    // In development, frontend runs separately
    res.status(200).json({
      message: 'Backend API is running. Frontend not built.',
      hint: 'Run "npm start" in frontend/ folder, or "npm run build" for production.',
    });
  }
});

// 404 handler (must be before global error handler)
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Database initialization and server start
const initializeServer = async () => {
  try {
    // Sync database schema
    // NOTE: Database sync disabled - tables must be created manually or via migrations
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ force: false });
    //   logger.info('Database schema synchronized');
    // } else {
    //   await sequelize.authenticate();
    //   logger.info('Database connection authenticated');
    // }
    
    // Just authenticate the connection
    await sequelize.authenticate();
    logger.info('Database connection authenticated');

    // Create HTTP server for WebSocket support
    const httpServer = http.createServer(app);

    // Initialize WebSocket server
    websocketServer.initialize(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
      },
    });

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`ZL-MCDT API server started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        websocketEnabled: true,
      });

      // Start AD sync scheduler (non-blocking)
      adSyncJob.start().catch((err) =>
        logger.warn('AD sync scheduler failed to start', { error: err.message })
      );
    });
  } catch (error) {
    logger.error('Failed to initialize server', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  adSyncJob.stop();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  adSyncJob.stop();
  await sequelize.close();
  process.exit(0);
});

// Start the server
initializeServer();

module.exports = app;
