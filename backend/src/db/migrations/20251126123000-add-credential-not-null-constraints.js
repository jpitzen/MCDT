'use strict';

/**
 * Migration: Add NOT NULL constraints to credentials table
 * 
 * Adds NOT NULL constraints and default value for:
 * - cloud_account_id (required field)
 * - cloud_region (required field with default 'us-east-1')
 * 
 * This aligns the database schema with the Credential model definition.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, update any existing NULL values to defaults
    await queryInterface.sequelize.query(`
      UPDATE credentials 
      SET cloud_region = 'us-east-1' 
      WHERE cloud_region IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE credentials 
      SET cloud_account_id = 'unknown' 
      WHERE cloud_account_id IS NULL;
    `);

    // Add DEFAULT constraint and NOT NULL to cloud_region
    await queryInterface.sequelize.query(`
      ALTER TABLE credentials 
      ALTER COLUMN cloud_region SET DEFAULT 'us-east-1';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE credentials 
      ALTER COLUMN cloud_region SET NOT NULL;
    `);

    // Add NOT NULL constraint to cloud_account_id
    await queryInterface.sequelize.query(`
      ALTER TABLE credentials 
      ALTER COLUMN cloud_account_id SET NOT NULL;
    `);

    console.log('✓ Added NOT NULL constraints to credentials table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove NOT NULL constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE credentials 
      ALTER COLUMN cloud_region DROP NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE credentials 
      ALTER COLUMN cloud_region DROP DEFAULT;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE credentials 
      ALTER COLUMN cloud_account_id DROP NOT NULL;
    `);

    console.log('✓ Removed NOT NULL constraints from credentials table');
  },
};
