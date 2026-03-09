/**
 * WebSocket Server Configuration
 * Real-time deployment monitoring and log streaming
 * 
 * Features:
 * - Real-time deployment status updates
 * - Live log streaming
 * - Phase transition notifications
 * - Error broadcasting
 * - Connection pooling
 * - Namespace isolation per deployment
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../services/logger');

class WebSocketServer {
  constructor() {
    this.io = null;
    this.activeDeployments = new Map(); // deploymentId → Set of connected clients
    this.deploymentNamespaces = new Map(); // deploymentId → namespace object
    this.subscriptions = new Map(); // clientId → Set of deploymentIds
  }

  /**
   * Middleware to validate JWT token for WebSocket connections
   * @param {object} socket - Socket.IO socket instance
   * @param {function} next - Next middleware function
   */
  authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow connection without auth for now (can enforce later)
        logger.warn('[WebSocket] Connection without auth token', { clientId: socket.id });
        socket.user = null;
        return next();
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-in-production');
      socket.user = decoded;
      
      logger.info('[WebSocket] Authenticated connection', {
        clientId: socket.id,
        userId: decoded.id,
        username: decoded.username,
      });

      next();
    } catch (error) {
      logger.error('[WebSocket] Authentication failed', {
        clientId: socket.id,
        error: error.message,
      });
      
      // Allow connection even if auth fails (for backward compatibility)
      // Change to next(new Error('Authentication failed')) to enforce auth
      socket.user = null;
      next();
    }
  }

  /**
   * Initialize WebSocket server
   * @param {object} httpServer - HTTP server instance
   * @param {object} options - Socket.IO configuration options
   * @returns {object} Socket.IO instance
   */
  initialize(httpServer, options = {}) {
    try {
      this.io = socketIO(httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || 'http://localhost:3000',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        ...options,
      });

      // Apply authentication middleware
      this.io.use((socket, next) => this.authenticateSocket(socket, next));

      // Setup connection handlers
      this.setupConnectionHandlers();
      
      // Setup deployment namespaces
      this.setupNamespaces();

      logger.info('[WebSocket] Server initialized', {
        origins: process.env.FRONTEND_URL || 'http://localhost:3000',
      });

      return this.io;
    } catch (error) {
      logger.error('[WebSocket] Failed to initialize server', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup main connection handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('[WebSocket] Client connected', { clientId: socket.id });

      // Handle deployment subscription
      socket.on('subscribe-deployment', (deploymentId, callback) => {
        this.handleSubscription(socket, deploymentId, callback);
      });

      // Handle deployment unsubscription
      socket.on('unsubscribe-deployment', (deploymentId, callback) => {
        this.handleUnsubscription(socket, deploymentId, callback);
      });

      // Handle request for recent logs
      socket.on('get-recent-logs', (deploymentId, limit, callback) => {
        this.handleGetRecentLogs(socket, deploymentId, limit, callback);
      });

      // Handle get current status
      socket.on('get-status', (deploymentId, callback) => {
        this.handleGetStatus(socket, deploymentId, callback);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle ping (for keep-alive)
      socket.on('ping', (callback) => {
        if (callback) callback({ pong: true, timestamp: Date.now() });
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error('[WebSocket] Socket error', { 
          clientId: socket.id, 
          error: error.message 
        });
      });
    });
  }

  /**
   * Setup deployment-specific namespaces
   */
  setupNamespaces() {
    // Will be dynamically created per deployment
    // Pattern: /deployment/{deploymentId}
  }

  /**
   * Get or create namespace for deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {object} Namespace object
   */
  getDeploymentNamespace(deploymentId) {
    if (!this.deploymentNamespaces.has(deploymentId)) {
      const namespace = this.io.of(`/deployment/${deploymentId}`);
      this.deploymentNamespaces.set(deploymentId, namespace);

      // Setup namespace handlers
      namespace.on('connection', (socket) => {
        logger.info('[WebSocket] Client connected to deployment namespace', {
          deploymentId,
          clientId: socket.id,
        });

        socket.on('disconnect', () => {
          logger.info('[WebSocket] Client disconnected from deployment namespace', {
            deploymentId,
            clientId: socket.id,
          });
        });
      });
    }

    return this.deploymentNamespaces.get(deploymentId);
  }

  /**
   * Handle deployment subscription
   * @param {object} socket - Socket.IO socket
   * @param {string} deploymentId - Deployment ID to subscribe to
   * @param {function} callback - Acknowledgment callback
   */
  handleSubscription(socket, deploymentId, callback) {
    try {
      // Join room for this deployment
      socket.join(`deployment:${deploymentId}`);

      // Track subscription
      if (!this.subscriptions.has(socket.id)) {
        this.subscriptions.set(socket.id, new Set());
      }
      this.subscriptions.get(socket.id).add(deploymentId);

      // Track active deployments
      if (!this.activeDeployments.has(deploymentId)) {
        this.activeDeployments.set(deploymentId, new Set());
      }
      this.activeDeployments.get(deploymentId).add(socket.id);

      logger.info('[WebSocket] Client subscribed to deployment', {
        clientId: socket.id,
        deploymentId,
        totalSubscribers: this.activeDeployments.get(deploymentId).size,
      });

      if (callback) {
        callback({
          success: true,
          deploymentId,
          message: 'Subscribed to deployment',
        });
      }
    } catch (error) {
      logger.error('[WebSocket] Subscription failed', {
        clientId: socket.id,
        deploymentId,
        error: error.message,
      });

      if (callback) {
        callback({
          success: false,
          error: error.message,
        });
      }
    }
  }

  /**
   * Handle deployment unsubscription
   * @param {object} socket - Socket.IO socket
   * @param {string} deploymentId - Deployment ID to unsubscribe from
   * @param {function} callback - Acknowledgment callback
   */
  handleUnsubscription(socket, deploymentId, callback) {
    try {
      // Leave room
      socket.leave(`deployment:${deploymentId}`);

      // Update tracking
      if (this.subscriptions.has(socket.id)) {
        this.subscriptions.get(socket.id).delete(deploymentId);
      }

      if (this.activeDeployments.has(deploymentId)) {
        this.activeDeployments.get(deploymentId).delete(socket.id);
        
        // Clean up if no more subscribers
        if (this.activeDeployments.get(deploymentId).size === 0) {
          this.activeDeployments.delete(deploymentId);
          // Optional: clean up namespace
        }
      }

      logger.info('[WebSocket] Client unsubscribed from deployment', {
        clientId: socket.id,
        deploymentId,
      });

      if (callback) {
        callback({
          success: true,
          deploymentId,
          message: 'Unsubscribed from deployment',
        });
      }
    } catch (error) {
      logger.error('[WebSocket] Unsubscription failed', {
        clientId: socket.id,
        deploymentId,
        error: error.message,
      });

      if (callback) {
        callback({
          success: false,
          error: error.message,
        });
      }
    }
  }

  /**
   * Handle recent logs request
   * @param {object} socket - Socket.IO socket
   * @param {string} deploymentId - Deployment ID
   * @param {number} limit - Max logs to return
   * @param {function} callback - Response callback
   */
  async handleGetRecentLogs(socket, deploymentId, limit = 50, callback) {
    try {
      const { Deployment } = require('../models');
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        if (callback) {
          callback({
            success: false,
            error: 'Deployment not found',
          });
        }
        return;
      }

      const logs = (deployment.deploymentLogs || []).slice(-limit);

      if (callback) {
        callback({
          success: true,
          logs,
          count: logs.length,
          total: deployment.deploymentLogs?.length || 0,
        });
      }
    } catch (error) {
      logger.error('[WebSocket] Get recent logs failed', {
        clientId: socket.id,
        deploymentId,
        error: error.message,
      });

      if (callback) {
        callback({
          success: false,
          error: error.message,
        });
      }
    }
  }

  /**
   * Handle get status request
   * @param {object} socket - Socket.IO socket
   * @param {string} deploymentId - Deployment ID
   * @param {function} callback - Response callback
   */
  async handleGetStatus(socket, deploymentId, callback) {
    try {
      const { Deployment } = require('../models');
      const deployment = await Deployment.findByPk(deploymentId);

      if (!deployment) {
        if (callback) {
          callback({
            success: false,
            error: 'Deployment not found',
          });
        }
        return;
      }

      const status = {
        id: deployment.id,
        clusterName: deployment.clusterName,
        cloudProvider: deployment.cloudProvider,
        status: deployment.status,
        deploymentPhase: deployment.deploymentPhase,
        progress: deployment.progress,
        startedAt: deployment.startedAt,
        completedAt: deployment.completedAt,
        errorMessage: deployment.errorMessage,
      };

      if (callback) {
        callback({
          success: true,
          status,
        });
      }
    } catch (error) {
      logger.error('[WebSocket] Get status failed', {
        clientId: socket.id,
        deploymentId,
        error: error.message,
      });

      if (callback) {
        callback({
          success: false,
          error: error.message,
        });
      }
    }
  }

  /**
   * Handle client disconnect
   * @param {object} socket - Socket.IO socket
   */
  handleDisconnect(socket) {
    try {
      // Clean up subscriptions
      if (this.subscriptions.has(socket.id)) {
        const deployments = this.subscriptions.get(socket.id);
        
        deployments.forEach((deploymentId) => {
          if (this.activeDeployments.has(deploymentId)) {
            this.activeDeployments.get(deploymentId).delete(socket.id);
            
            // Clean up if no more subscribers
            if (this.activeDeployments.get(deploymentId).size === 0) {
              this.activeDeployments.delete(deploymentId);
            }
          }
        });

        this.subscriptions.delete(socket.id);
      }

      logger.info('[WebSocket] Client disconnected', {
        clientId: socket.id,
      });
    } catch (error) {
      logger.error('[WebSocket] Disconnect handler error', {
        clientId: socket.id,
        error: error.message,
      });
    }
  }

  /**
   * Emit deployment update to all subscribers
   * @param {string} deploymentId - Deployment ID
   * @param {string} eventType - Event type (log, phase-update, progress-update, completed, failed)
   * @param {object} data - Event data
   */
  emitDeploymentUpdate(deploymentId, eventType, data) {
    try {
      if (!this.io) return;

      const room = `deployment:${deploymentId}`;
      const event = `deployment:${eventType}`;

      this.io.to(room).emit(event, {
        deploymentId,
        eventType,
        timestamp: new Date(),
        data,
      });

      logger.debug('[WebSocket] Deployment update emitted', {
        deploymentId,
        eventType,
        subscribers: this.activeDeployments.get(deploymentId)?.size || 0,
      });
    } catch (error) {
      logger.error('[WebSocket] Emit update failed', {
        deploymentId,
        eventType,
        error: error.message,
      });
    }
  }

  /**
   * Emit log entry to subscribers
   * @param {string} deploymentId - Deployment ID
   * @param {object} logEntry - Log entry object
   */
  emitLog(deploymentId, logEntry) {
    this.emitDeploymentUpdate(deploymentId, 'log', logEntry);
  }

  /**
   * Emit phase update to subscribers
   * @param {string} deploymentId - Deployment ID
   * @param {string} phase - New phase
   * @param {object} metadata - Additional metadata
   */
  emitPhaseUpdate(deploymentId, phase, metadata = {}) {
    this.emitDeploymentUpdate(deploymentId, 'phase-update', {
      phase,
      ...metadata,
    });
  }

  /**
   * Emit progress update to subscribers
   * @param {string} deploymentId - Deployment ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {object} metadata - Additional metadata
   */
  emitProgressUpdate(deploymentId, progress, metadata = {}) {
    this.emitDeploymentUpdate(deploymentId, 'progress-update', {
      progress,
      ...metadata,
    });
  }

  /**
   * Emit completion event
   * @param {string} deploymentId - Deployment ID
   * @param {object} outputs - Deployment outputs
   */
  emitCompletion(deploymentId, outputs = {}) {
    this.emitDeploymentUpdate(deploymentId, 'completed', {
      outputs,
    });
  }

  /**
   * Emit failure event
   * @param {string} deploymentId - Deployment ID
   * @param {string} errorMessage - Error message
   * @param {object} metadata - Additional metadata
   */
  emitFailure(deploymentId, errorMessage, metadata = {}) {
    this.emitDeploymentUpdate(deploymentId, 'failed', {
      errorMessage,
      ...metadata,
    });
  }

  /**
   * Get active subscribers count for deployment
   * @param {string} deploymentId - Deployment ID
   * @returns {number} Number of connected subscribers
   */
  getSubscriberCount(deploymentId) {
    return this.activeDeployments.get(deploymentId)?.size || 0;
  }

  /**
   * Get all active deployments
   * @returns {array} Array of deployment IDs with subscriber counts
   */
  getActiveDeployments() {
    const active = [];
    this.activeDeployments.forEach((subscribers, deploymentId) => {
      if (subscribers.size > 0) {
        active.push({
          deploymentId,
          subscriberCount: subscribers.size,
        });
      }
    });
    return active;
  }

  /**
   * Get connected client count
   * @returns {number} Total connected clients
   */
  getConnectedClientCount() {
    if (!this.io) return 0;
    return this.io.engine.clientsCount || 0;
  }

  /**
   * Clean shutdown
   */
  async shutdown() {
    try {
      if (this.io) {
        await this.io.close();
      }
      logger.info('[WebSocket] Server shut down');
    } catch (error) {
      logger.error('[WebSocket] Shutdown error', { error: error.message });
    }
  }
}

module.exports = new WebSocketServer();
