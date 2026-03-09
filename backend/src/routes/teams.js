/**
 * Team Management Routes
 * 
 * Handles team CRUD, member management, and resource sharing
 * Requires authentication and appropriate RBAC permissions
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const {
  checkPermission,
  authorizeTeam,
  authorizeResource,
  authorizeTeamAdmin,
} = require('../middleware/rbac');

const { Team, TeamMember, SharedResource, User } = require('../models');
const { logger } = require('../services');

/**
 * GET /api/teams
 * List all teams for the user (as owner or member)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status } = req.query;
    const offset = (page - 1) * limit;

    // Get teams as owner
    const ownedTeams = await Team.findAll({
      where: { ownerId: req.user.id },
      include: [
        {
          model: TeamMember,
          attributes: ['id', 'userId', 'role', 'status', 'joinedAt'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    // Get teams as member
    const memberTeams = await TeamMember.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Team,
          attributes: { exclude: ['updatedAt'] },
          include: [
            {
              model: TeamMember,
              attributes: ['id', 'userId', 'role', 'status'],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    const allTeams = [
      ...ownedTeams,
      ...memberTeams.map((m) => ({
        ...m.Team.toJSON(),
        memberRole: m.role,
        memberStatus: m.status,
      })),
    ];

    res.json({
      status: 'success',
      data: allTeams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allTeams.length,
      },
    });

    logger.info('Teams listed', {
      userId: req.user.id,
      count: allTeams.length,
    });
  } catch (error) {
    logger.error('Error listing teams', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list teams',
      code: 'LIST_TEAMS_ERROR',
    });
  }
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, isPublic = false, maxMembers = 50, tags = [] } =
      req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Team name is required',
        code: 'INVALID_NAME',
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Team name must be less than 100 characters',
        code: 'NAME_TOO_LONG',
      });
    }

    if (maxMembers < 2 || maxMembers > 500) {
      return res.status(400).json({
        status: 'error',
        message: 'maxMembers must be between 2 and 500',
        code: 'INVALID_MAX_MEMBERS',
      });
    }

    const team = await Team.create({
      id: uuidv4(),
      name: name.trim(),
      description: description || '',
      ownerId: req.user.id,
      isPublic,
      maxMembers,
      tags,
    });

    logger.audit('Team created', {
      userId: req.user.id,
      teamId: team.id,
      teamName: team.name,
    });

    res.status(201).json({
      status: 'success',
      message: 'Team created successfully',
      data: team,
    });
  } catch (error) {
    logger.error('Error creating team', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create team',
      code: 'CREATE_TEAM_ERROR',
    });
  }
});

/**
 * GET /api/teams/:teamId
 * Get team details with members
 */
router.get('/:teamId', authenticate, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.teamId, {
      include: [
        {
          model: TeamMember,
          include: [
            {
              model: User,
              attributes: ['id', 'email', 'username'],
            },
          ],
        },
      ],
    });

    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found',
        code: 'TEAM_NOT_FOUND',
      });
    }

    // Check if user is owner or member
    if (
      team.ownerId !== req.user.id &&
      !team.TeamMembers.some((m) => m.userId === req.user.id)
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'ACCESS_DENIED',
      });
    }

    res.json({
      status: 'success',
      data: team,
    });
  } catch (error) {
    logger.error('Error getting team', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get team',
      code: 'GET_TEAM_ERROR',
    });
  }
});

/**
 * PUT /api/teams/:teamId
 * Update team details (admin/owner only)
 */
router.put('/:teamId', authenticate, authorizeTeamAdmin(), async (req, res) => {
  try {
    const { name, description, isPublic, maxMembers, tags } = req.body;
    const team = await Team.findByPk(req.params.teamId);

    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found',
        code: 'TEAM_NOT_FOUND',
      });
    }

    if (name && name.length <= 100) team.name = name;
    if (description !== undefined) team.description = description;
    if (typeof isPublic === 'boolean') team.isPublic = isPublic;
    if (maxMembers && maxMembers >= 2 && maxMembers <= 500)
      team.maxMembers = maxMembers;
    if (Array.isArray(tags)) team.tags = tags;

    await team.save();

    logger.audit('Team updated', {
      userId: req.user.id,
      teamId: team.id,
    });

    res.json({
      status: 'success',
      message: 'Team updated successfully',
      data: team,
    });
  } catch (error) {
    logger.error('Error updating team', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update team',
      code: 'UPDATE_TEAM_ERROR',
    });
  }
});

/**
 * DELETE /api/teams/:teamId
 * Delete team (owner only)
 */
router.delete('/:teamId', authenticate, async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.teamId);

    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found',
        code: 'TEAM_NOT_FOUND',
      });
    }

    if (team.ownerId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only team owner can delete team',
        code: 'NOT_OWNER',
      });
    }

    await team.destroy();

    logger.audit('Team deleted', {
      userId: req.user.id,
      teamId: team.id,
    });

    res.json({
      status: 'success',
      message: 'Team deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting team', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete team',
      code: 'DELETE_TEAM_ERROR',
    });
  }
});

/**
 * POST /api/teams/:id/members
 * Invite user to team (admin/owner)
 */
router.post(
  '/:id/members',
  authenticate,
  authorizeTeamAdmin(),
  async (req, res) => {
    try {
      const { email, role = 'operator' } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'User email is required',
          code: 'INVALID_EMAIL',
        });
      }

      if (!['admin', 'operator', 'viewer'].includes(role)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid role',
          code: 'INVALID_ROLE',
        });
      }

      const team = await Team.findByPk(req.params.id);
      if (!team) {
        return res.status(404).json({
          status: 'error',
          message: 'Team not found',
          code: 'TEAM_NOT_FOUND',
        });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Check if already member
      const existing = await TeamMember.findOne({
        where: { teamId: team.id, userId: user.id },
      });

      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: 'User is already a team member',
          code: 'ALREADY_MEMBER',
        });
      }

      // Check max members
      const memberCount = await TeamMember.count({
        where: { teamId: team.id, status: 'active' },
      });

      if (memberCount >= team.maxMembers) {
        return res.status(409).json({
          status: 'error',
          message: 'Team has reached maximum members',
          code: 'MAX_MEMBERS_REACHED',
        });
      }

      const member = await TeamMember.create({
        id: uuidv4(),
        teamId: team.id,
        userId: user.id,
        role,
        status: 'invited',
        invitedBy: req.user.id,
        invitedAt: new Date(),
      });

      logger.audit('User invited to team', {
        invitedBy: req.user.id,
        userId: user.id,
        teamId: team.id,
      });

      res.status(201).json({
        status: 'success',
        message: 'User invited to team',
        data: member,
      });
    } catch (error) {
      logger.error('Error inviting member', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to invite member',
        code: 'INVITE_ERROR',
      });
    }
  }
);

/**
 * POST /api/teams/:teamId/members/:memberId/accept
 * Accept team invitation
 */
router.post(
  '/:teamId/members/:memberId/accept',
  authenticate,
  async (req, res) => {
    try {
      const member = await TeamMember.findByPk(req.params.memberId);

      if (!member) {
        return res.status(404).json({
          status: 'error',
          message: 'Membership not found',
          code: 'MEMBER_NOT_FOUND',
        });
      }

      if (member.userId !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Can only accept own invitation',
          code: 'NOT_INVITEE',
        });
      }

      if (member.status !== 'invited') {
        return res.status(409).json({
          status: 'error',
          message: 'Invitation is not pending',
          code: 'INVALID_STATUS',
        });
      }

      member.status = 'active';
      member.joinedAt = new Date();
      await member.save();

      logger.audit('Team invitation accepted', {
        userId: req.user.id,
        teamId: member.teamId,
      });

      res.json({
        status: 'success',
        message: 'Invitation accepted',
        data: member,
      });
    } catch (error) {
      logger.error('Error accepting invitation', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to accept invitation',
        code: 'ACCEPT_ERROR',
      });
    }
  }
);

/**
 * PUT /api/teams/:id/members/:memberId
 * Update member role (admin/owner only)
 */
router.put(
  '/:id/members/:memberId',
  authenticate,
  authorizeTeamAdmin(),
  async (req, res) => {
    try {
      const { role } = req.body;

      if (!['admin', 'operator', 'viewer', 'custom'].includes(role)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid role',
          code: 'INVALID_ROLE',
        });
      }

      const member = await TeamMember.findByPk(req.params.memberId);

      if (!member) {
        return res.status(404).json({
          status: 'error',
          message: 'Member not found',
          code: 'MEMBER_NOT_FOUND',
        });
      }

      member.role = role;
      await member.save();

      logger.audit('Member role updated', {
        userId: req.user.id,
        memberId: member.id,
        newRole: role,
      });

      res.json({
        status: 'success',
        message: 'Member role updated',
        data: member,
      });
    } catch (error) {
      logger.error('Error updating member role', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update member role',
        code: 'UPDATE_ROLE_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/teams/:teamId/members/:memberId
 * Remove member from team (admin/owner)
 */
router.delete(
  '/:teamId/members/:memberId',
  authenticate,
  authorizeTeamAdmin(),
  async (req, res) => {
    try {
      const member = await TeamMember.findByPk(req.params.memberId);

      if (!member) {
        return res.status(404).json({
          status: 'error',
          message: 'Member not found',
          code: 'MEMBER_NOT_FOUND',
        });
      }

      await member.destroy();

      logger.audit('Member removed from team', {
        userId: req.user.id,
        removedMemberId: member.id,
        teamId: member.teamId,
      });

      res.json({
        status: 'success',
        message: 'Member removed from team',
      });
    } catch (error) {
      logger.error('Error removing member', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to remove member',
        code: 'REMOVE_MEMBER_ERROR',
      });
    }
  }
);

/**
 * POST /api/teams/:teamId/resources/share
 * Share resource with team (admin/owner)
 */
router.post(
  '/:teamId/resources/share',
  authenticate,
  authorizeTeamAdmin(),
  async (req, res) => {
    try {
      const { resourceId, resourceType, permissions = ['read'], expiresAt } =
        req.body;

      if (!resourceId) {
        return res.status(400).json({
          status: 'error',
          message: 'Resource ID is required',
          code: 'MISSING_RESOURCE_ID',
        });
      }

      if (
        ![
          'deployment',
          'credential',
          'template',
          'alert',
          'log',
        ].includes(resourceType)
      ) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid resource type',
          code: 'INVALID_RESOURCE_TYPE',
        });
      }

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'At least one permission is required',
          code: 'INVALID_PERMISSIONS',
        });
      }

      const validPermissions = ['read', 'write', 'delete', 'admin'];
      if (!permissions.every((p) => validPermissions.includes(p))) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid permission in list',
          code: 'INVALID_PERMISSION',
        });
      }

      const shared = await SharedResource.create({
        id: uuidv4(),
        teamId: req.params.teamId,
        resourceId,
        resourceType,
        permissions,
        sharedBy: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      logger.audit('Resource shared with team', {
        userId: req.user.id,
        resourceId,
        teamId: req.params.teamId,
      });

      res.status(201).json({
        status: 'success',
        message: 'Resource shared successfully',
        data: shared,
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          status: 'error',
          message: 'Resource is already shared with this team',
          code: 'ALREADY_SHARED',
        });
      }

      logger.error('Error sharing resource', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to share resource',
        code: 'SHARE_ERROR',
      });
    }
  }
);

/**
 * GET /api/teams/:teamId/resources
 * List shared resources
 */
router.get('/:teamId/resources', authenticate, authorizeTeam(['admin', 'operator', 'viewer']), async (req, res) => {
  try {
    const resources = await SharedResource.findAll({
      where: { teamId: req.params.teamId },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      status: 'success',
      data: resources,
    });
  } catch (error) {
    logger.error('Error listing shared resources', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list resources',
      code: 'LIST_RESOURCES_ERROR',
    });
  }
});

/**
 * PUT /api/teams/:teamId/resources/:resourceId/permissions
 * Update resource permissions (admin/owner)
 */
router.put(
  '/:teamId/resources/:resourceId/permissions',
  authenticate,
  authorizeTeamAdmin(),
  async (req, res) => {
    try {
      const { permissions } = req.body;

      if (!Array.isArray(permissions) || permissions.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Permissions must be a non-empty array',
          code: 'INVALID_PERMISSIONS',
        });
      }

      const shared = await SharedResource.findOne({
        where: {
          teamId: req.params.teamId,
          resourceId: req.params.resourceId,
        },
      });

      if (!shared) {
        return res.status(404).json({
          status: 'error',
          message: 'Shared resource not found',
          code: 'RESOURCE_NOT_FOUND',
        });
      }

      shared.permissions = permissions;
      await shared.save();

      logger.audit('Shared resource permissions updated', {
        userId: req.user.id,
        resourceId: req.params.resourceId,
      });

      res.json({
        status: 'success',
        message: 'Permissions updated',
        data: shared,
      });
    } catch (error) {
      logger.error('Error updating permissions', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update permissions',
        code: 'UPDATE_PERMISSIONS_ERROR',
      });
    }
  }
);

/**
 * DELETE /api/teams/:teamId/resources/:resourceId
 * Unshare resource (admin/owner)
 */
router.delete(
  '/:teamId/resources/:resourceId',
  authenticate,
  authorizeTeamAdmin(),
  async (req, res) => {
    try {
      const shared = await SharedResource.findOne({
        where: {
          teamId: req.params.teamId,
          resourceId: req.params.resourceId,
        },
      });

      if (!shared) {
        return res.status(404).json({
          status: 'error',
          message: 'Shared resource not found',
          code: 'RESOURCE_NOT_FOUND',
        });
      }

      await shared.destroy();

      logger.audit('Resource unshared', {
        userId: req.user.id,
        resourceId: req.params.resourceId,
      });

      res.json({
        status: 'success',
        message: 'Resource unshared',
      });
    } catch (error) {
      logger.error('Error unsharing resource', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to unshare resource',
        code: 'UNSHARE_ERROR',
      });
    }
  }
);

module.exports = router;
