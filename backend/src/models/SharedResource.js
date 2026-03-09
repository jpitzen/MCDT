/**
 * SharedResource Model
 * 
 * Tracks resources (deployments, credentials, templates) shared with teams
 * Enables fine-grained permission control per resource
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SharedResource = sequelize.define(
    'SharedResource',
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
      resourceType: {
        type: DataTypes.ENUM('deployment', 'credential', 'template', 'alert', 'log'),
        allowNull: false,
        validate: {
          isIn: [['deployment', 'credential', 'template', 'alert', 'log']],
        },
      },
      resourceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      permissions: {
        type: DataTypes.JSON,
        defaultValue: ['read'],
        comment: 'Array of permissions (read, write, delete, admin)',
      },
      sharedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      sharedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Optional expiration date for temporary sharing',
      },
      accessCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of times team accessed this resource',
      },
      lastAccessedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      tableName: 'shared_resources',
      timestamps: true,
      indexes: [
        {
          fields: ['teamId', 'resourceType', 'resourceId'],
          unique: true,
          name: 'idx_shared_resource_unique',
        },
        {
          fields: ['teamId'],
          name: 'idx_shared_resource_team',
        },
        {
          fields: ['resourceType', 'resourceId'],
          name: 'idx_shared_resource_id',
        },
        {
          fields: ['sharedBy'],
          name: 'idx_shared_resource_owner',
        },
        {
          fields: ['expiresAt'],
          name: 'idx_shared_resource_expires',
        },
      ],
    }
  );

  /**
   * Check if team has permission on resource
   */
  SharedResource.prototype.hasPermission = function(permission) {
    // Check if expired
    if (this.expiresAt && new Date() > this.expiresAt) {
      return false;
    }

    // Check permission
    if (this.permissions.includes('*')) return true; // Admin access
    return this.permissions.includes(permission);
  };

  /**
   * Check if team can read resource
   */
  SharedResource.prototype.canRead = function() {
    return this.hasPermission('read');
  };

  /**
   * Check if team can write resource
   */
  SharedResource.prototype.canWrite = function() {
    return this.hasPermission('write');
  };

  /**
   * Check if team can delete resource
   */
  SharedResource.prototype.canDelete = function() {
    return this.hasPermission('delete');
  };

  /**
   * Check if team is admin on resource
   */
  SharedResource.prototype.isAdmin = function() {
    return this.hasPermission('*');
  };

  /**
   * Record access
   */
  SharedResource.prototype.recordAccess = async function() {
    // Check expiration
    if (this.expiresAt && new Date() > this.expiresAt) {
      throw new Error('Resource sharing has expired');
    }

    this.accessCount += 1;
    this.lastAccessedAt = new Date();
    await this.save();
    return this;
  };

  /**
   * Update permissions
   */
  SharedResource.prototype.updatePermissions = async function(newPermissions) {
    this.permissions = newPermissions;
    this.updatedAt = new Date();
    await this.save();
    return this;
  };

  /**
   * Extend expiration
   */
  SharedResource.prototype.extendExpiration = async function(days) {
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + days);
    this.expiresAt = newExpiry;
    await this.save();
    return this;
  };

  /**
   * Revoke sharing
   */
  SharedResource.prototype.revoke = async function() {
    await this.destroy();
    return true;
  };

  /**
   * Check if sharing is active
   */
  SharedResource.prototype.isActive = function() {
    // Not expired
    if (this.expiresAt && new Date() > this.expiresAt) {
      return false;
    }
    return true;
  };

  return SharedResource;
};
