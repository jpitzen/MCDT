'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_configurations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      // Connection settings
      server_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      base_dn: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      use_ssl: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      port: {
        type: Sequelize.INTEGER,
        defaultValue: 636,
      },
      connection_timeout: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
      },

      // Bind credentials (encrypted)
      bind_dn: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      bind_password_encrypted: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      bind_password_iv: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      bind_password_auth_tag: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },

      // Search settings
      user_search_filter: {
        type: Sequelize.STRING(500),
        defaultValue: '(sAMAccountName={username})',
      },
      user_search_base: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      group_search_filter: {
        type: Sequelize.STRING(500),
        defaultValue: '(objectClass=group)',
      },
      group_search_base: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },

      // Attribute mapping
      email_attribute: {
        type: Sequelize.STRING(100),
        defaultValue: 'mail',
      },
      display_name_attribute: {
        type: Sequelize.STRING(100),
        defaultValue: 'displayName',
      },
      first_name_attribute: {
        type: Sequelize.STRING(100),
        defaultValue: 'givenName',
      },
      last_name_attribute: {
        type: Sequelize.STRING(100),
        defaultValue: 'sn',
      },
      group_attribute: {
        type: Sequelize.STRING(100),
        defaultValue: 'memberOf',
      },
      unique_id_attribute: {
        type: Sequelize.STRING(100),
        defaultValue: 'objectGUID',
      },

      // Behavior
      auto_create_users: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      default_role: {
        type: Sequelize.STRING(20),
        defaultValue: 'viewer',
      },
      sync_interval_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 60,
      },

      // Metadata
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Only one active config at a time (partial unique index)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_config_active
        ON ad_configurations(is_active) WHERE is_active = true;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ad_configurations');
  },
};
