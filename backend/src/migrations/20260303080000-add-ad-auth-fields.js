'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Auth provider tracking
    await queryInterface.addColumn('users', 'auth_provider', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'local',
    });

    // AD-specific fields
    await queryInterface.addColumn('users', 'external_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'distinguished_name', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'ad_groups', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });

    await queryInterface.addColumn('users', 'last_ad_sync', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Allow null password for AD users
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Add CHECK constraint for auth_provider
    await queryInterface.sequelize.query(`
      ALTER TABLE users ADD CONSTRAINT chk_users_auth_provider
        CHECK (auth_provider IN ('local', 'ldap', 'ad'));
    `);

    // Indexes for AD lookups
    await queryInterface.addIndex('users', ['external_id'], {
      name: 'idx_users_external_id',
    });
    await queryInterface.addIndex('users', ['auth_provider'], {
      name: 'idx_users_auth_provider',
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('users', 'idx_users_auth_provider');
    await queryInterface.removeIndex('users', 'idx_users_external_id');

    // Remove CHECK constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_auth_provider;
    `);

    // Restore password_hash to NOT NULL
    await queryInterface.changeColumn('users', 'password_hash', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Remove AD columns
    await queryInterface.removeColumn('users', 'last_ad_sync');
    await queryInterface.removeColumn('users', 'ad_groups');
    await queryInterface.removeColumn('users', 'distinguished_name');
    await queryInterface.removeColumn('users', 'external_id');
    await queryInterface.removeColumn('users', 'auth_provider');
  },
};
