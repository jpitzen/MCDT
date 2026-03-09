'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('database_credentials', {
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
      source_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      source_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      engine: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      host: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      port: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5432,
      },
      database_name: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'postgres',
      },
      encrypted_username: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      encrypted_password: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      encryption_iv: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      auth_tag: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ssl_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      ssl_mode: {
        type: Sequelize.STRING,
        defaultValue: 'require',
      },
      aws_secrets_arn: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rds_instance_id: {
        type: Sequelize.STRING,
        allowNull: true,
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
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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

    // Add indexes
    await queryInterface.addIndex('database_credentials', ['user_id']);
    await queryInterface.addIndex('database_credentials', ['source_type']);
    await queryInterface.addIndex('database_credentials', ['source_id']);
    await queryInterface.addIndex('database_credentials', ['engine']);
    await queryInterface.addIndex('database_credentials', ['host']);
    await queryInterface.addIndex('database_credentials', ['is_active']);
    
    // Unique constraint: one credential per host/port/database/user combination
    await queryInterface.addIndex('database_credentials', ['user_id', 'host', 'port', 'database_name'], {
      unique: true,
      name: 'unique_db_credential_per_user',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('database_credentials');
  },
};
