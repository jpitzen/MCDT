'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('alert_channel_configs')) {
      console.log('Table alert_channel_configs already exists, skipping creation');
      return;
    }

    await queryInterface.createTable('alert_channel_configs', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      channel_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      // Email fields
      smtp_host: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      smtp_port: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      smtp_secure: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: true,
      },
      smtp_user: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      encrypted_smtp_password: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      smtp_password_iv: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      smtp_password_auth_tag: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email_recipients: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      email_from: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // Slack fields
      encrypted_slack_webhook_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      slack_webhook_iv: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      slack_webhook_auth_tag: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      slack_webhook_hash: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      slack_channel: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // Webhook fields
      encrypted_webhook_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      webhook_url_iv: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      webhook_url_auth_tag: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      webhook_url_hash: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      webhook_auth_type: {
        type: Sequelize.STRING(50),
        defaultValue: 'none',
        allowNull: true,
      },
      encrypted_webhook_auth: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      webhook_auth_iv: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      webhook_auth_auth_tag: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      webhook_method: {
        type: Sequelize.STRING(10),
        defaultValue: 'POST',
        allowNull: true,
      },
      // Testing & validation
      last_tested_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_test_result: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      failure_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      last_failure_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Metadata
      tags: {
        type: Sequelize.JSONB,
        defaultValue: [],
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: true,
      },
      is_test: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add CHECK constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE alert_channel_configs 
      ADD CONSTRAINT alert_channel_configs_channel_type_check 
      CHECK (channel_type IN ('email', 'slack', 'webhook'));
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE alert_channel_configs 
      ADD CONSTRAINT alert_channel_configs_webhook_auth_type_check 
      CHECK (webhook_auth_type IN ('none', 'bearer', 'api-key', 'basic'));
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE alert_channel_configs 
      ADD CONSTRAINT alert_channel_configs_webhook_method_check 
      CHECK (webhook_method IN ('GET', 'POST', 'PUT', 'PATCH'));
    `);

    // Create indexes
    await queryInterface.addIndex('alert_channel_configs', ['user_id']);
    await queryInterface.addIndex('alert_channel_configs', ['channel_type']);
    await queryInterface.addIndex('alert_channel_configs', ['enabled']);
    await queryInterface.addIndex('alert_channel_configs', ['user_id', 'channel_type']);
    await queryInterface.addIndex('alert_channel_configs', ['is_test']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('alert_channel_configs');
  },
};
