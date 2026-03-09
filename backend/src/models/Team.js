/**
 * Team Model
 * 
 * Represents a user team for collaborative deployment management
 * Teams have owners, members with roles, and shared resources
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Team = sequelize.define(
    'Team',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: [1, 100],
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      maxMembers: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
        validate: {
          min: 1,
          max: 1000,
        },
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      tags: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'teams',
      timestamps: true,
      paranoid: true, // Soft deletes
      indexes: [
        {
          fields: ['ownerId'],
          name: 'idx_team_owner',
        },
        {
          fields: ['name'],
          name: 'idx_team_name',
        },
        {
          fields: ['isPublic'],
          name: 'idx_team_public',
        },
      ],
    }
  );

  /**
   * Get team members with roles
   */
  Team.prototype.getMembers = async function() {
    const TeamMember = sequelize.models.TeamMember;
    return await TeamMember.findAll({
      where: { teamId: this.id },
      include: [
        {
          model: sequelize.models.User,
          attributes: ['id', 'username', 'email'],
        },
      ],
    });
  };

  /**
   * Add member to team
   */
  Team.prototype.addMember = async function(userId, role = 'viewer') {
    const TeamMember = sequelize.models.TeamMember;
    const member = await TeamMember.create({
      teamId: this.id,
      userId,
      role,
    });
    return member;
  };

  /**
   * Remove member from team
   */
  Team.prototype.removeMember = async function(userId) {
    const TeamMember = sequelize.models.TeamMember;
    return await TeamMember.destroy({
      where: {
        teamId: this.id,
        userId,
      },
    });
  };

  /**
   * Check if user is member
   */
  Team.prototype.isMember = async function(userId) {
    const TeamMember = sequelize.models.TeamMember;
    const member = await TeamMember.findOne({
      where: {
        teamId: this.id,
        userId,
      },
    });
    return !!member;
  };

  /**
   * Get member role
   */
  Team.prototype.getMemberRole = async function(userId) {
    const TeamMember = sequelize.models.TeamMember;
    const member = await TeamMember.findOne({
      where: {
        teamId: this.id,
        userId,
      },
    });
    return member ? member.role : null;
  };

  /**
   * Check if user has permission in team
   */
  Team.prototype.hasPermission = async function(userId, permission) {
    const role = await this.getMemberRole(userId);
    if (!role) return false;

    const rolePermissions = {
      admin: ['*'], // All permissions
      operator: [
        'deployment:create',
        'deployment:read',
        'deployment:update',
        'deployment:delete',
        'alert:read',
        'alert:manage',
        'credential:read',
      ],
      viewer: [
        'deployment:read',
        'alert:read',
        'analytics:read',
        'logs:read',
      ],
    };

    const permissions = rolePermissions[role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  };

  return Team;
};
