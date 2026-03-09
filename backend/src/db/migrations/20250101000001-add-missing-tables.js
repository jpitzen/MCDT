'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create deployment_logs table
    await queryInterface.createTable('deployment_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      deployment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'deployments',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      log_level: {
        type: Sequelize.ENUM('debug', 'info', 'warn', 'error', 'fatal'),
        defaultValue: 'info',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      log_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      data: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      source: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'system',
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      stack_trace: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create teams table
    await queryInterface.createTable('teams', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      max_members: {
        type: Sequelize.INTEGER,
        defaultValue: 100,
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      tags: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Create team_members table
    await queryInterface.createTable('team_members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      team_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'teams',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      role: {
        type: Sequelize.ENUM('admin', 'operator', 'viewer', 'custom'),
        defaultValue: 'viewer',
      },
      custom_permissions: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      invited_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      invited_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      joined_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      status: {
        type: Sequelize.ENUM('active', 'invited', 'suspended', 'removed'),
        defaultValue: 'active',
      },
      last_activity_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create shared_resources table
    await queryInterface.createTable('shared_resources', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      team_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'teams',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      resource_type: {
        type: Sequelize.ENUM('deployment', 'credential', 'template', 'alert', 'log'),
        allowNull: false,
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      permissions: {
        type: Sequelize.JSONB,
        defaultValue: ['read'],
      },
      shared_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      shared_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      access_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      last_accessed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes for deployment_logs
    await queryInterface.addIndex('deployment_logs', ['deployment_id'], {
      name: 'idx_deployment_logs_deployment_id',
    });
    await queryInterface.addIndex('deployment_logs', ['log_level'], {
      name: 'idx_deployment_logs_log_level',
    });
    await queryInterface.addIndex('deployment_logs', ['log_type'], {
      name: 'idx_deployment_logs_log_type',
    });
    await queryInterface.addIndex('deployment_logs', ['created_at'], {
      name: 'idx_deployment_logs_created_at',
    });
    await queryInterface.addIndex('deployment_logs', ['expires_at'], {
      name: 'idx_deployment_logs_expires_at',
    });
    await queryInterface.addIndex('deployment_logs', ['deployment_id', 'created_at'], {
      name: 'idx_deployment_logs_deployment_created',
    });
    await queryInterface.addIndex('deployment_logs', ['deployment_id', 'log_level'], {
      name: 'idx_deployment_logs_deployment_level',
    });

    // Create indexes for teams
    await queryInterface.addIndex('teams', ['owner_id'], {
      name: 'idx_team_owner',
    });
    await queryInterface.addIndex('teams', ['name'], {
      name: 'idx_team_name',
    });
    await queryInterface.addIndex('teams', ['is_public'], {
      name: 'idx_team_public',
    });

    // Create indexes for team_members
    await queryInterface.addIndex('team_members', ['team_id', 'user_id'], {
      unique: true,
      name: 'idx_team_member_unique',
    });
    await queryInterface.addIndex('team_members', ['team_id'], {
      name: 'idx_team_member_team',
    });
    await queryInterface.addIndex('team_members', ['user_id'], {
      name: 'idx_team_member_user',
    });
    await queryInterface.addIndex('team_members', ['status'], {
      name: 'idx_team_member_status',
    });

    // Create indexes for shared_resources
    await queryInterface.addIndex('shared_resources', ['team_id', 'resource_type', 'resource_id'], {
      unique: true,
      name: 'idx_shared_resource_unique',
    });
    await queryInterface.addIndex('shared_resources', ['team_id'], {
      name: 'idx_shared_resource_team',
    });
    await queryInterface.addIndex('shared_resources', ['resource_type', 'resource_id'], {
      name: 'idx_shared_resource_resource',
    });
    await queryInterface.addIndex('shared_resources', ['expires_at'], {
      name: 'idx_shared_resource_expires',
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order (respecting foreign keys)
    await queryInterface.dropTable('shared_resources');
    await queryInterface.dropTable('team_members');
    await queryInterface.dropTable('teams');
    await queryInterface.dropTable('deployment_logs');
  },
};
