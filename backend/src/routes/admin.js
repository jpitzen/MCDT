const express = require('express');
const { Deployment, DeploymentSqlScript, DeploymentDraft, User, AuditLog } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');
const { executeInTransaction } = require('../services/transactionHelper');
const { Op } = require('sequelize');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

/**
 * GET /api/admin/users
 * Get all users
 */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await User.findAll({
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    sendSuccess(res, { users, total: users.length });
  })
);

/**
 * GET /api/admin/users/:id
 * Get specific user details
 */
router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    sendSuccess(res, { user });
  })
);

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { role } = req.body;

    if (!['admin', 'operator', 'viewer', 'approver'].includes(role)) {
      return sendError(res, 'Invalid role', 400, 'INVALID_ROLE');
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    // Prevent user from changing their own role
    if (user.id === req.user.id) {
      return sendError(res, 'Cannot change your own role', 403, 'CANNOT_CHANGE_OWN_ROLE');
    }

    user.role = role;
    await user.save();

    sendSuccess(res, { user }, 200, `User role updated to ${role}`);
  })
);

/**
 * POST /api/admin/users/:id/suspend
 * Suspend a user
 */
router.post(
  '/users/:id/suspend',
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    // Prevent user from suspending themselves
    if (user.id === req.user.id) {
      return sendError(res, 'Cannot suspend yourself', 403, 'CANNOT_SUSPEND_SELF');
    }

    user.isActive = false;
    await user.save();

    sendSuccess(res, { user }, 200, 'User suspended successfully');
  })
);

/**
 * POST /api/admin/users/:id/reactivate
 * Reactivate a suspended user
 */
router.post(
  '/users/:id/reactivate',
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    user.isActive = true;
    await user.save();

    sendSuccess(res, { user }, 200, 'User reactivated successfully');
  })
);

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [userCount, deploymentCount, draftCount, activeDeployments] = await Promise.all([
      User.count(),
      Deployment.count(),
      DeploymentDraft.count(),
      Deployment.count({ where: { status: 'running' } })
    ]);

    const stats = {
      users: {
        total: userCount,
        active: await User.count({ where: { isActive: true } })
      },
      deployments: {
        total: deploymentCount,
        active: activeDeployments,
        completed: await Deployment.count({ where: { status: 'completed' } }),
        failed: await Deployment.count({ where: { status: 'failed' } })
      },
      drafts: {
        total: draftCount
      }
    };

    sendSuccess(res, stats);
  })
);

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const { limit = 100, offset = 0 } = req.query;

    const { count, rows } = await AuditLog.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ]
    });

    sendSuccess(res, {
      logs: rows,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  })
);

/**
 * POST /api/admin/cleanup/deployments
 * Clean up deployment records
 */
router.post(
  '/cleanup/deployments',
  asyncHandler(async (req, res) => {
    const { option, days } = req.body;

    const result = await executeInTransaction(async (t) => {
      let deletedCount = 0;
      let deploymentIds = [];

      switch (option) {
        case 'all':
          // Delete all deployments
          const allDeployments = await Deployment.findAll({ 
            attributes: ['id'],
            transaction: t
          });
          deploymentIds = allDeployments.map(d => d.id);
          
          // Delete related SQL scripts first
          await DeploymentSqlScript.destroy({
            where: { deploymentId: deploymentIds },
            transaction: t
          });
          
          deletedCount = await Deployment.destroy({
            where: { id: deploymentIds },
            transaction: t
          });
          break;

        case 'failed':
          // Delete failed deployments
          const failedDeployments = await Deployment.findAll({
            where: {
              status: 'failed'
            },
            attributes: ['id'],
            transaction: t
          });
          deploymentIds = failedDeployments.map(d => d.id);
          
          await DeploymentSqlScript.destroy({
            where: { deploymentId: deploymentIds },
            transaction: t
          });
          
          deletedCount = await Deployment.destroy({
            where: { id: deploymentIds },
            transaction: t
          });
          break;

        case 'old':
          // Delete old deployments
          const cutoffDays = days || 30;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);
          
          const oldDeployments = await Deployment.findAll({
            where: {
              createdAt: {
                [Op.lt]: cutoffDate
              }
            },
            attributes: ['id'],
            transaction: t
          });
          deploymentIds = oldDeployments.map(d => d.id);
          
          await DeploymentSqlScript.destroy({
            where: { deploymentId: deploymentIds },
            transaction: t
          });
          
          deletedCount = await Deployment.destroy({
            where: { id: deploymentIds },
            transaction: t
          });
          break;

        default:
          throw new Error('Invalid cleanup option');
      }

      return { deletedCount, deploymentIds };
    });

    sendSuccess(
      res,
      result,
      200,
      `Successfully deleted ${result.deletedCount} deployment(s)`
    );
  })
);

/**
 * POST /api/admin/cleanup/drafts
 * Clean up deployment drafts
 */
router.post(
  '/cleanup/drafts',
  asyncHandler(async (req, res) => {
    const deletedCount = await executeInTransaction(async (t) => {
      return await DeploymentDraft.destroy({
        where: {},
        transaction: t
      });
    });

    sendSuccess(
      res,
      { deletedCount },
      200,
      `Successfully deleted ${deletedCount} draft(s)`
    );
  })
);

module.exports = router;
