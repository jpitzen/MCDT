/**
 * TeamMember Model
 * 
 * Represents membership of a user in a team with assigned role
 * Links users to teams with role-based access control
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeamMember = sequelize.define(
    'TeamMember',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      teamId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'teams',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      role: {
        type: DataTypes.ENUM('admin', 'operator', 'viewer', 'custom'),
        defaultValue: 'viewer',
        validate: {
          isIn: [['admin', 'operator', 'viewer', 'custom']],
        },
      },
      customPermissions: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of permissions for custom role',
      },
      invitedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      invitedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM('active', 'invited', 'suspended', 'removed'),
        defaultValue: 'active',
      },
      lastActivityAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
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
      tableName: 'team_members',
      timestamps: true,
      indexes: [
        {
          fields: ['teamId', 'userId'],
          unique: true,
          name: 'idx_team_member_unique',
        },
        {
          fields: ['teamId'],
          name: 'idx_team_member_team',
        },
        {
          fields: ['userId'],
          name: 'idx_team_member_user',
        },
        {
          fields: ['role'],
          name: 'idx_team_member_role',
        },
        {
          fields: ['status'],
          name: 'idx_team_member_status',
        },
      ],
    }
  );

  /**
   * Get permissions for this member
   */
  TeamMember.prototype.getPermissions = function() {
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
      custom: this.customPermissions || [],
    };

    return rolePermissions[this.role] || [];
  };

  /**
   * Check if member has permission
   */
  TeamMember.prototype.hasPermission = function(permission) {
    const permissions = this.getPermissions();
    return permissions.includes('*') || permissions.includes(permission);
  };

  /**
   * Update role
   */
  TeamMember.prototype.updateRole = async function(newRole, customPermissions = null) {
    this.role = newRole;
    if (newRole === 'custom' && customPermissions) {
      this.customPermissions = customPermissions;
    }
    this.updatedAt = new Date();
    await this.save();
    return this;
  };

  /**
   * Suspend member access
   */
  TeamMember.prototype.suspend = async function() {
    this.status = 'suspended';
    this.updatedAt = new Date();
    await this.save();
    return this;
  };

  /**
   * Restore member access
   */
  TeamMember.prototype.restore = async function() {
    this.status = 'active';
    this.updatedAt = new Date();
    await this.save();
    return this;
  };

  /**
   * Update last activity
   */
  TeamMember.prototype.recordActivity = async function() {
    this.lastActivityAt = new Date();
    await this.save();
    return this;
  };

  return TeamMember;
};
