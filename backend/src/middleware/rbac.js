/**
 * Extended RBAC Authorization Middleware
 * 
 * Adds role-based access control, resource-based access control,
 * team-based access control, and permission checking
 */

const { Team, TeamMember, SharedResource } = require('../models');
const { logger } = require('../services');

/**
 * Check if user has specific permission in team
 * Used for fine-grained access control
 * 
 * @param {string} permission - Permission to check (e.g., 'deployment:create')
 * @returns {middleware}
 */
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const teamId = req.params.teamId || req.body.teamId;

      if (!teamId) {
        // Global permission (no team required)
        const globalPermissions = {
          admin: ['*'],
          operator: ['deployment:create', 'credential:manage'],
          viewer: ['deployment:read'],
        };

        const permissions = globalPermissions[req.user.role] || [];
        if (permissions.includes('*') || permissions.includes(permission)) {
          return next();
        }

        return res.status(403).json({
          status: 'error',
          message: 'User does not have this permission',
          code: 'PERMISSION_DENIED',
          required: permission,
        });
      }

      // Check team-based permission
      const member = await TeamMember.findOne({
        where: { teamId, userId: req.user.id },
      });

      if (!member) {
        return res.status(403).json({
          status: 'error',
          message: 'User is not a team member',
          code: 'NOT_TEAM_MEMBER',
        });
      }

      if (member.status !== 'active') {
        return res.status(403).json({
          status: 'error',
          message: 'Team membership is not active',
          code: 'MEMBERSHIP_INACTIVE',
        });
      }

      if (!member.hasPermission(permission)) {
        logger.security('Permission denied for user', 'warn', {
          userId: req.user.id,
          teamId,
          permission,
        });

        return res.status(403).json({
          status: 'error',
          message: 'User does not have this permission in team',
          code: 'PERMISSION_DENIED',
          required: permission,
        });
      }

      req.teamMember = member;
      next();
    } catch (error) {
      logger.error('Permission check error', error);
      res.status(500).json({
        status: 'error',
        message: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR',
      });
    }
  };
};

/**
 * Authorize based on team membership and role
 * Checks if user is active member of specified team
 * 
 * @param {array} allowedRoles - Roles allowed (e.g., ['admin', 'operator'])
 * @returns {middleware}
 */
const authorizeTeam = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const teamId = req.params.teamId || req.body.teamId;

      if (!teamId) {
        return res.status(400).json({
          status: 'error',
          message: 'Team ID is required',
          code: 'MISSING_TEAM_ID',
        });
      }

      const member = await TeamMember.findOne({
        where: { teamId, userId: req.user.id },
      });

      if (!member) {
        logger.security('Unauthorized team access', 'warn', {
          userId: req.user.id,
          teamId,
        });

        return res.status(403).json({
          status: 'error',
          message: 'User is not a member of this team',
          code: 'NOT_TEAM_MEMBER',
        });
      }

      if (member.status !== 'active') {
        return res.status(403).json({
          status: 'error',
          message: 'Team membership is not active',
          code: 'MEMBERSHIP_INACTIVE',
        });
      }

      if (!allowedRoles.includes(member.role)) {
        logger.security('Insufficient team role', 'warn', {
          userId: req.user.id,
          teamId,
          role: member.role,
          required: allowedRoles,
        });

        return res.status(403).json({
          status: 'error',
          message: 'Insufficient role for this action',
          code: 'INSUFFICIENT_ROLE',
          requiredRoles: allowedRoles,
        });
      }

      req.teamMember = member;
      req.teamId = teamId;
      next();
    } catch (error) {
      logger.error('Team authorization error', error);
      res.status(500).json({
        status: 'error',
        message: 'Team authorization failed',
        code: 'TEAM_AUTH_ERROR',
      });
    }
  };
};

/**
 * Authorize access to shared resource
 * Checks if team has permission on specific resource
 * 
 * @param {string} permission - Permission needed (read, write, delete, admin)
 * @returns {middleware}
 */
const authorizeResource = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const resourceId = req.params.resourceId || req.body.resourceId;
      const teamId = req.params.teamId || req.body.teamId;

      if (!resourceId || !teamId) {
        return res.status(400).json({
          status: 'error',
          message: 'Resource ID and Team ID are required',
          code: 'MISSING_IDS',
        });
      }

      // Check team membership
      const member = await TeamMember.findOne({
        where: { teamId, userId: req.user.id },
      });

      if (!member || member.status !== 'active') {
        return res.status(403).json({
          status: 'error',
          message: 'User is not an active team member',
          code: 'NOT_TEAM_MEMBER',
        });
      }

      // Check resource sharing
      const shared = await SharedResource.findOne({
        where: { teamId, resourceId },
      });

      if (!shared || !shared.isActive()) {
        return res.status(403).json({
          status: 'error',
          message: 'Resource is not shared with this team or sharing expired',
          code: 'RESOURCE_NOT_SHARED',
        });
      }

      if (!shared.hasPermission(permission)) {
        logger.security('Resource permission denied', 'warn', {
          userId: req.user.id,
          resourceId,
          permission,
        });

        return res.status(403).json({
          status: 'error',
          message: `Team does not have ${permission} permission on this resource`,
          code: 'RESOURCE_PERMISSION_DENIED',
        });
      }

      // Record access
      await shared.recordAccess();

      req.teamMember = member;
      req.sharedResource = shared;
      next();
    } catch (error) {
      logger.error('Resource authorization error', error);
      res.status(500).json({
        status: 'error',
        message: 'Resource authorization failed',
        code: 'RESOURCE_AUTH_ERROR',
      });
    }
  };
};

/**
 * Check if user is team owner or admin
 * 
 * @returns {middleware}
 */
const authorizeTeamAdmin = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
          code: 'NOT_AUTHENTICATED',
        });
      }

      const teamId = req.params.teamId || req.body.teamId;

      if (!teamId) {
        return res.status(400).json({
          status: 'error',
          message: 'Team ID is required',
          code: 'MISSING_TEAM_ID',
        });
      }

      const team = await Team.findByPk(teamId);

      if (!team) {
        return res.status(404).json({
          status: 'error',
          message: 'Team not found',
          code: 'TEAM_NOT_FOUND',
        });
      }

      // Owner has full access
      if (team.ownerId === req.user.id) {
        req.teamId = teamId;
        return next();
      }

      // Check if admin member
      const member = await TeamMember.findOne({
        where: { teamId, userId: req.user.id },
      });

      if (!member || member.role !== 'admin' || member.status !== 'active') {
        logger.security('Team admin access denied', 'warn', {
          userId: req.user.id,
          teamId,
        });

        return res.status(403).json({
          status: 'error',
          message: 'User must be team owner or admin',
          code: 'NOT_TEAM_ADMIN',
        });
      }

      req.teamMember = member;
      req.teamId = teamId;
      next();
    } catch (error) {
      logger.error('Team admin authorization error', error);
      res.status(500).json({
        status: 'error',
        message: 'Team admin authorization failed',
        code: 'TEAM_ADMIN_AUTH_ERROR',
      });
    }
  };
};

module.exports = {
  checkPermission,
  authorizeTeam,
  authorizeResource,
  authorizeTeamAdmin,
};
