const express = require('express');
const router = express.Router({ mergeParams: true }); // Allows access to :deploymentId from parent router
const { authenticate, authorize } = require('../middleware/auth');
const { DeploymentSqlScript, Deployment, User } = require('../models');
const logger = require('../services/logger');
const databaseScriptExecutor = require('../services/databaseScriptExecutor');

/**
 * @route   POST /api/deployments/:deploymentId/sql-scripts
 * @desc    Upload SQL scripts for a deployment
 * @access  Authenticated
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { scripts } = req.body; // Array of { scriptName, scriptContent, executionOrder, haltOnError, runInTransaction, timeoutSeconds }

    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      return res.status(400).json({ error: 'Scripts array is required' });
    }

    // Verify deployment exists and user has access
    const deployment = await Deployment.findByPk(deploymentId);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create scripts
    const createdScripts = [];
    for (const scriptData of scripts) {
      const script = await DeploymentSqlScript.create({
        deploymentId,
        scriptName: scriptData.scriptName,
        scriptContent: scriptData.scriptContent,
        executionOrder: scriptData.executionOrder !== undefined ? scriptData.executionOrder : 0,
        haltOnError: scriptData.haltOnError !== undefined ? scriptData.haltOnError : true,
        runInTransaction: scriptData.runInTransaction !== undefined ? scriptData.runInTransaction : true,
        timeoutSeconds: scriptData.timeoutSeconds || 300,
        uploadedBy: req.user.id,
        status: 'pending',
      });
      createdScripts.push(script);
    }

    logger.info(`[SQLScripts] Created ${createdScripts.length} scripts for deployment ${deploymentId}`, {
      userId: req.user.id,
    });

    res.status(201).json({
      message: `${createdScripts.length} script(s) uploaded successfully`,
      scripts: createdScripts,
    });
  } catch (error) {
    logger.error('[SQLScripts] Failed to upload scripts', {
      error: error.message,
      deploymentId: req.params.deploymentId,
      userId: req.user.id,
    });
    res.status(500).json({ error: 'Failed to upload scripts', details: error.message });
  }
});

/**
 * @route   GET /api/deployments/:deploymentId/sql-scripts
 * @desc    Get all SQL scripts for a deployment
 * @access  Authenticated
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { deploymentId } = req.params;

    // Verify deployment exists and user has access
    const deployment = await Deployment.findByPk(deploymentId);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scripts = await DeploymentSqlScript.findAll({
      where: { deploymentId },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [['executionOrder', 'ASC']],
    });

    res.json({ scripts });
  } catch (error) {
    logger.error('[SQLScripts] Failed to fetch scripts', {
      error: error.message,
      deploymentId: req.params.deploymentId,
    });
    res.status(500).json({ error: 'Failed to fetch scripts', details: error.message });
  }
});

/**
 * @route   GET /api/deployments/:deploymentId/sql-scripts/:scriptId
 * @desc    Get a single SQL script
 * @access  Authenticated
 */
router.get('/:scriptId', authenticate, async (req, res) => {
  try {
    const { deploymentId, scriptId } = req.params;

    const script = await DeploymentSqlScript.findOne({
      where: { id: scriptId, deploymentId },
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'email'],
        },
        {
          model: Deployment,
          as: 'deployment',
          attributes: ['id', 'name', 'userId'],
        },
      ],
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Check access
    if (script.deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ script });
  } catch (error) {
    logger.error('[SQLScripts] Failed to fetch script', {
      error: error.message,
      scriptId: req.params.scriptId,
    });
    res.status(500).json({ error: 'Failed to fetch script', details: error.message });
  }
});

/**
 * @route   PUT /api/deployments/:deploymentId/sql-scripts/:scriptId
 * @desc    Update a SQL script (only if status is pending)
 * @access  Authenticated
 */
router.put('/:scriptId', authenticate, async (req, res) => {
  try {
    const { deploymentId, scriptId } = req.params;
    const { scriptName, scriptContent, executionOrder, haltOnError, runInTransaction, timeoutSeconds } = req.body;

    const script = await DeploymentSqlScript.findOne({
      where: { id: scriptId, deploymentId },
      include: [
        {
          model: Deployment,
          as: 'deployment',
          attributes: ['userId'],
        },
      ],
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Check access
    if (script.deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can only update pending scripts
    if (script.status !== 'pending') {
      return res.status(400).json({ error: `Cannot update script with status: ${script.status}` });
    }

    // Update fields
    const updates = {};
    if (scriptName !== undefined) updates.scriptName = scriptName;
    if (scriptContent !== undefined) updates.scriptContent = scriptContent;
    if (executionOrder !== undefined) updates.executionOrder = executionOrder;
    if (haltOnError !== undefined) updates.haltOnError = haltOnError;
    if (runInTransaction !== undefined) updates.runInTransaction = runInTransaction;
    if (timeoutSeconds !== undefined) updates.timeoutSeconds = timeoutSeconds;

    await script.update(updates);

    logger.info('[SQLScripts] Updated script', {
      scriptId,
      userId: req.user.id,
    });

    res.json({ message: 'Script updated successfully', script });
  } catch (error) {
    logger.error('[SQLScripts] Failed to update script', {
      error: error.message,
      scriptId: req.params.scriptId,
    });
    res.status(500).json({ error: 'Failed to update script', details: error.message });
  }
});

/**
 * @route   DELETE /api/deployments/:deploymentId/sql-scripts/:scriptId
 * @desc    Delete a SQL script (only if status is pending)
 * @access  Authenticated
 */
router.delete('/:scriptId', authenticate, async (req, res) => {
  try {
    const { deploymentId, scriptId } = req.params;

    const script = await DeploymentSqlScript.findOne({
      where: { id: scriptId, deploymentId },
      include: [
        {
          model: Deployment,
          as: 'deployment',
          attributes: ['userId'],
        },
      ],
    });

    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Check access
    if (script.deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can only delete pending scripts
    if (script.status !== 'pending') {
      return res.status(400).json({ error: `Cannot delete script with status: ${script.status}` });
    }

    await script.destroy();

    logger.info('[SQLScripts] Deleted script', {
      scriptId,
      userId: req.user.id,
    });

    res.json({ message: 'Script deleted successfully' });
  } catch (error) {
    logger.error('[SQLScripts] Failed to delete script', {
      error: error.message,
      scriptId: req.params.scriptId,
    });
    res.status(500).json({ error: 'Failed to delete script', details: error.message });
  }
});

/**
 * @route   POST /api/deployments/:deploymentId/sql-scripts/execute
 * @desc    Manually trigger execution of pending SQL scripts
 * @access  Admin only
 */
router.post('/execute', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { deploymentId } = req.params;

    const deployment = await Deployment.findByPk(deploymentId);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    logger.info(`[SQLScripts] Manual execution triggered for deployment ${deploymentId}`, {
      userId: req.user.id,
    });

    // Execute scripts asynchronously
    databaseScriptExecutor
      .executeScripts(deploymentId)
      .then((results) => {
        logger.info(`[SQLScripts] Execution completed for deployment ${deploymentId}`, results);
      })
      .catch((error) => {
        logger.error(`[SQLScripts] Execution failed for deployment ${deploymentId}`, {
          error: error.message,
        });
      });

    res.json({ message: 'Script execution started. Check deployment logs for progress.' });
  } catch (error) {
    logger.error('[SQLScripts] Failed to start script execution', {
      error: error.message,
      deploymentId: req.params.deploymentId,
    });
    res.status(500).json({ error: 'Failed to start script execution', details: error.message });
  }
});

/**
 * @route   POST /api/deployments/:deploymentId/execute-query
 * @desc    Execute an arbitrary SQL query against the deployment's database
 * @access  Authenticated (admin or deployment owner)
 */
router.post('/execute-query', authenticate, async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'SQL query is required' });
    }

    // Verify deployment exists and user has access
    const deployment = await Deployment.findByPk(deploymentId);
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    if (deployment.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if deployment has RDS enabled
    if (!deployment.configuration?.enableRDS) {
      return res.status(400).json({ error: 'This deployment does not have a database enabled' });
    }

    logger.info(`[SQLQuery] Executing query for deployment ${deploymentId}`, {
      userId: req.user.id,
      queryLength: query.length,
    });

    // Execute query
    const result = await databaseScriptExecutor.executeQuery(deployment, query);

    logger.info(`[SQLQuery] Query executed successfully for deployment ${deploymentId}`, {
      userId: req.user.id,
      rowCount: result.rows?.length || 0,
    });

    res.json({
      success: true,
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields,
      executionTime: result.executionTime,
    });
  } catch (error) {
    logger.error('[SQLQuery] Query execution failed', {
      error: error.message,
      deploymentId: req.params.deploymentId,
      userId: req.user.id,
    });
    res.status(500).json({
      success: false,
      error: 'Query execution failed',
      details: error.message,
    });
  }
});

module.exports = router;
