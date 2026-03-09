'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('deployment_drafts')) {
      console.log('Table deployment_drafts already exists, skipping creation');
      return;
    }

    await queryInterface.createTable('deployment_drafts', {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      credential_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'credentials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      cluster_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      cloud_provider: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      configuration: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      estimated_monthly_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      cost_breakdown: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'draft',
      },
      approved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      approval_comment: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      test_results: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      tested_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deployment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'deployments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add CHECK constraint for status
    await queryInterface.sequelize.query(`
      ALTER TABLE deployment_drafts 
      ADD CONSTRAINT deployment_drafts_status_check 
      CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'deployed'));
    `);

    // Create indexes
    await queryInterface.addIndex('deployment_drafts', ['user_id']);
    await queryInterface.addIndex('deployment_drafts', ['status']);
    await queryInterface.addIndex('deployment_drafts', ['cloud_provider']);
    await queryInterface.addIndex('deployment_drafts', ['approved_by']);
    await queryInterface.addIndex('deployment_drafts', ['created_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('deployment_drafts');
  },
};
