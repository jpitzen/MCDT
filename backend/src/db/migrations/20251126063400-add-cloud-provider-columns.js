'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check existing columns before adding
    const credentialsTable = await queryInterface.describeTable('credentials');
    const deploymentsTable = await queryInterface.describeTable('deployments');

    // Add cloud_provider column to credentials table if it doesn't exist
    if (!credentialsTable.cloud_provider) {
      await queryInterface.addColumn('credentials', 'cloud_provider', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'aws'
      });
    }

    // Add vault_type column to credentials table if it doesn't exist
    if (!credentialsTable.vault_type) {
      await queryInterface.addColumn('credentials', 'vault_type', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'aws-secrets'
      });
    }

    // Add secret_ref_id column to credentials table if it doesn't exist
    if (!credentialsTable.secret_ref_id) {
      await queryInterface.addColumn('credentials', 'secret_ref_id', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add cloud_account_id column to credentials table if it doesn't exist
    if (!credentialsTable.cloud_account_id) {
      await queryInterface.addColumn('credentials', 'cloud_account_id', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add cloud_region column to credentials table if it doesn't exist
    if (!credentialsTable.cloud_region) {
      await queryInterface.addColumn('credentials', 'cloud_region', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add auth_tag column to credentials table if it doesn't exist
    if (!credentialsTable.auth_tag) {
      await queryInterface.addColumn('credentials', 'auth_tag', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }

    // Add cloud_provider column to deployments table if it doesn't exist
    if (!deploymentsTable.cloud_provider) {
      await queryInterface.addColumn('deployments', 'cloud_provider', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'aws'
      });
    }

    console.log('✓ Added cloud_provider and related columns to credentials and deployments tables');
  },

  down: async (queryInterface, Sequelize) => {
    // Check if columns exist before removing
    const credentialsTable = await queryInterface.describeTable('credentials');
    const deploymentsTable = await queryInterface.describeTable('deployments');

    // Remove columns in reverse order if they exist
    if (deploymentsTable.cloud_provider) {
      await queryInterface.removeColumn('deployments', 'cloud_provider');
    }
    if (credentialsTable.auth_tag) {
      await queryInterface.removeColumn('credentials', 'auth_tag');
    }
    if (credentialsTable.cloud_region) {
      await queryInterface.removeColumn('credentials', 'cloud_region');
    }
    if (credentialsTable.cloud_account_id) {
      await queryInterface.removeColumn('credentials', 'cloud_account_id');
    }
    if (credentialsTable.secret_ref_id) {
      await queryInterface.removeColumn('credentials', 'secret_ref_id');
    }
    if (credentialsTable.vault_type) {
      await queryInterface.removeColumn('credentials', 'vault_type');
    }
    if (credentialsTable.cloud_provider) {
      await queryInterface.removeColumn('credentials', 'cloud_provider');
    }

    console.log('✓ Removed cloud_provider and related columns from credentials and deployments tables');
  }
};
