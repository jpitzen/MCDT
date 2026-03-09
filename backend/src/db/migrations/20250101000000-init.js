'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('admin', 'operator', 'viewer'),
        defaultValue: 'viewer',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      mfa_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      mfa_secret: {
        type: Sequelize.STRING,
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

    // Create credentials table
    await queryInterface.createTable('credentials', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      aws_account_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      aws_region: {
        type: Sequelize.STRING,
        defaultValue: 'us-east-1',
      },
      encrypted_access_key_id: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      encrypted_secret_access_key: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      encryption_iv: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_valid: {
        type: Sequelize.BOOLEAN,
        defaultValue: null,
      },
      last_validated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      validation_error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      last_rotated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rotation_scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // Create deployments table
    await queryInterface.createTable('deployments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      credential_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'credentials',
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
      cluster_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      cluster_arn: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'running', 'paused', 'completed', 'failed', 'rolled_back'),
        defaultValue: 'pending',
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      current_phase: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      configuration: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      parameters: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      results: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error_stack: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      paused_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      estimated_duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rolled_back_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rolled_back_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSONB,
        defaultValue: [],
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

    // Create audit_logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      resource_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      resource_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      resource_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      action_status: {
        type: Sequelize.ENUM('success', 'failure', 'pending'),
        defaultValue: 'pending',
      },
      changes: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      request_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      request_method: {
        type: Sequelize.ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
        allowNull: true,
      },
      context: {
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

    // Create indexes
    await queryInterface.addIndex('credentials', ['user_id']);
    await queryInterface.addIndex('credentials', ['aws_account_id']);
    await queryInterface.addIndex('credentials', ['is_active']);
    await queryInterface.addIndex('deployments', ['credential_id']);
    await queryInterface.addIndex('deployments', ['user_id']);
    await queryInterface.addIndex('deployments', ['status']);
    await queryInterface.addIndex('deployments', ['created_at']);
    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['action']);
    await queryInterface.addIndex('audit_logs', ['resource_type']);
    await queryInterface.addIndex('audit_logs', ['action_status']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    // Drop all tables in reverse order
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('deployments');
    await queryInterface.dropTable('credentials');
    await queryInterface.dropTable('users');
  },
};
