/**
 * WebSocket Emission Service
 * Integrates WebSocket events with deployment lifecycle
 * Emits real-time updates to connected clients
 */

const websocketServer = require('../config/websocketServer');
const logger = require('./logger');

class WebSocketEmissionService {
  /**
   * Emit log during deployment
   * @param {string} deploymentId - Deployment ID
   * @param {string} type - Log type
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  static emitLog(deploymentId, type, message, data = {}) {
    try {
      const logEntry = {
        timestamp: new Date(),
        type,
        message,
        data,
      };

      websocketServer.emitLog(deploymentId, logEntry);
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit log', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Emit phase transition
   * @param {string} deploymentId - Deployment ID
   * @param {string} fromPhase - Previous phase
   * @param {string} toPhase - New phase
   * @param {object} metadata - Additional metadata
   */
  static emitPhaseTransition(deploymentId, fromPhase, toPhase, metadata = {}) {
    try {
      websocketServer.emitPhaseUpdate(deploymentId, toPhase, {
        fromPhase,
        ...metadata,
      });

      // Also emit as log entry
      this.emitLog(deploymentId, 'phase-transition', `Phase: ${toPhase}`, {
        fromPhase,
        toPhase,
      });
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit phase transition', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Emit progress update
   * @param {string} deploymentId - Deployment ID
   * @param {number} progress - Progress percentage
   * @param {string} currentPhase - Current phase
   */
  static emitProgressUpdate(deploymentId, progress, currentPhase) {
    try {
      websocketServer.emitProgressUpdate(deploymentId, progress, {
        phase: currentPhase,
      });
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit progress update', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Emit Terraform output
   * @param {string} deploymentId - Deployment ID
   * @param {string} output - Terraform output
   */
  static emitTerraformOutput(deploymentId, output) {
    try {
      this.emitLog(deploymentId, 'terraform-output', output, {
        source: 'terraform',
      });
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit Terraform output', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Emit error
   * @param {string} deploymentId - Deployment ID
   * @param {string} errorMessage - Error message
   * @param {object} metadata - Error metadata
   */
  static emitError(deploymentId, errorMessage, metadata = {}) {
    try {
      this.emitLog(deploymentId, 'error', errorMessage, metadata);

      // Only emit failure event if it's a critical error
      if (metadata.critical) {
        websocketServer.emitFailure(deploymentId, errorMessage, metadata);
      }
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit error', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Emit completion
   * @param {string} deploymentId - Deployment ID
   * @param {object} outputs - Deployment outputs
   */
  static emitCompletion(deploymentId, outputs = {}) {
    try {
      this.emitLog(deploymentId, 'deployment-complete', 'Deployment completed successfully', {
        outputs,
      });

      websocketServer.emitCompletion(deploymentId, outputs);
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit completion', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Emit failure
   * @param {string} deploymentId - Deployment ID
   * @param {string} errorMessage - Error message
   * @param {object} metadata - Error metadata
   */
  static emitDeploymentFailure(deploymentId, errorMessage, metadata = {}) {
    try {
      this.emitLog(deploymentId, 'deployment-failed', errorMessage, metadata);

      websocketServer.emitFailure(deploymentId, errorMessage, metadata);
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit deployment failure', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Emit rollback started
   * @param {string} deploymentId - Deployment ID
   * @param {string} reason - Rollback reason
   */
  static emitRollbackStarted(deploymentId, reason) {
    try {
      this.emitPhaseTransition(deploymentId, null, 'rollback-started', {
        reason,
      });

      this.emitLog(deploymentId, 'rollback-started', `Rollback initiated: ${reason}`, {
        reason,
      });
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit rollback started', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Emit rollback completed
   * @param {string} deploymentId - Deployment ID
   */
  static emitRollbackCompleted(deploymentId) {
    try {
      this.emitPhaseTransition(deploymentId, 'rollback-started', 'rollback-complete');

      this.emitLog(deploymentId, 'rollback-complete', 'Rollback completed successfully', {});
    } catch (error) {
      logger.error('[WebSocketEmission] Failed to emit rollback completed', {
        deploymentId,
        error: error.message,
      });
    }
  }

  /**
   * Get active monitoring stats
   * @returns {object} Stats about active deployments and clients
   */
  static getStats() {
    return {
      activeDeployments: websocketServer.getActiveDeployments(),
      totalDeployments: websocketServer.getActiveDeployments().length,
      connectedClients: websocketServer.getConnectedClientCount(),
      timestamp: new Date(),
    };
  }
}

module.exports = WebSocketEmissionService;
