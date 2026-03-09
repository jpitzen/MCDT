'use strict';

/**
 * Migration: Add deploymentTarget column and 'local' registry type to container_deployments
 * This enables local-only, registry-only, or both deployment targets
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, add the deployment_target column with ENUM
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- Create the enum type if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_container_deployments_deploymentTarget') THEN
          CREATE TYPE "enum_container_deployments_deploymentTarget" AS ENUM ('local', 'registry', 'both');
        END IF;
      END
      $$;
    `);

    // Add the deploymentTarget column if it doesn't exist
    const tableInfo = await queryInterface.describeTable('container_deployments');
    if (!tableInfo.deploymentTarget) {
      await queryInterface.addColumn('container_deployments', 'deploymentTarget', {
        type: Sequelize.ENUM('local', 'registry', 'both'),
        defaultValue: 'both',
        allowNull: false
      });
    }

    // Update registryType enum to include 'local'
    // PostgreSQL doesn't allow altering enum values directly in older versions,
    // so we'll use a workaround
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- Add 'local' to registryType enum if not exists
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_container_deployments_registryType')
          AND enumlabel = 'local'
        ) THEN
          ALTER TYPE "enum_container_deployments_registryType" ADD VALUE 'local';
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END
      $$;
    `);

    console.log('✅ Added deploymentTarget column and local registry type');
  },

  async down(queryInterface, Sequelize) {
    // Remove the deploymentTarget column
    const tableInfo = await queryInterface.describeTable('container_deployments');
    if (tableInfo.deploymentTarget) {
      await queryInterface.removeColumn('container_deployments', 'deploymentTarget');
    }

    // Drop the enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_container_deployments_deploymentTarget";
    `);

    // Note: Cannot remove enum values in PostgreSQL, so 'local' stays in registryType
    console.log('✅ Removed deploymentTarget column');
  }
};
