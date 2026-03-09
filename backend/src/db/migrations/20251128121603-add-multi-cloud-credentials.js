'use strict';

/**
 * Migration: Add Multi-Cloud Credential Support
 * 
 * Adds encrypted credential data column to support all cloud providers:
 * - AWS: accessKeyId, secretAccessKey
 * - Azure: clientId, clientSecret, tenantId, subscriptionId
 * - GCP: serviceAccountKey (JSON)
 * - DigitalOcean: apiToken
 * - Linode: apiToken
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add encrypted_credential_data column for storing provider-specific credentials
    await queryInterface.addColumn('credentials', 'encrypted_credential_data', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Encrypted JSON containing provider-specific credential data',
    });

    // Add credential_data_iv for decryption
    await queryInterface.addColumn('credentials', 'credential_data_iv', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Initialization vector for credential data encryption',
    });

    // Add credential_data_auth_tag for GCM authentication
    await queryInterface.addColumn('credentials', 'credential_data_auth_tag', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Authentication tag for credential data encryption',
    });

    // Add additional_regions for multi-region support
    await queryInterface.addColumn('credentials', 'additional_regions', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Additional regions for multi-region operations',
    });

    console.log('✅ Added multi-cloud credential columns');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('credentials', 'encrypted_credential_data');
    await queryInterface.removeColumn('credentials', 'credential_data_iv');
    await queryInterface.removeColumn('credentials', 'credential_data_auth_tag');
    await queryInterface.removeColumn('credentials', 'additional_regions');
    
    console.log('✅ Removed multi-cloud credential columns');
  },
};
