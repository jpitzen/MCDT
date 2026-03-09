'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('deployment_sql_scripts', {
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
        onUpdate: 'CASCADE',
      },
      script_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      script_content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      execution_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('pending', 'running', 'completed', 'failed', 'skipped'),
        defaultValue: 'pending',
        allowNull: false,
      },
      executed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      execution_duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rows_affected: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error_stack: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      halt_on_error: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      run_in_transaction: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      timeout_seconds: {
        type: Sequelize.INTEGER,
        defaultValue: 300,
        allowNull: false,
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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

    // Add indexes
    await queryInterface.addIndex('deployment_sql_scripts', ['deployment_id'], {
      name: 'idx_deployment_sql_scripts_deployment',
    });

    await queryInterface.addIndex('deployment_sql_scripts', ['status'], {
      name: 'idx_deployment_sql_scripts_status',
    });

    await queryInterface.addIndex('deployment_sql_scripts', ['deployment_id', 'execution_order'], {
      name: 'idx_deployment_sql_scripts_order',
    });

    // Add unique constraint
    await queryInterface.addConstraint('deployment_sql_scripts', {
      fields: ['deployment_id', 'script_name'],
      type: 'unique',
      name: 'unique_deployment_script_name',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('deployment_sql_scripts');
  },
};
