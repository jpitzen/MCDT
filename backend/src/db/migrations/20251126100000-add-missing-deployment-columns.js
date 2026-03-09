'use strict';

/**
 * Migration: Add missing columns to deployments table
 * 
 * Adds:
 * - metrics_data (JSONB) - For storing deployment metrics
 * - terraform_working_dir (VARCHAR) - Terraform working directory
 * - terraform_state (JSONB) - Terraform state data
 * - terraform_outputs (JSONB) - Terraform outputs
 * - deployment_phase (ENUM) - Current deployment phase
 * - terraform_version (VARCHAR) - Terraform version used
 * - deployment_logs (JSONB) - Array of deployment logs
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add deployment_phase enum type first
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_deployments_deployment_phase AS ENUM (
          'created',
          'terraform-init',
          'terraform-plan',
          'terraform-apply',
          'cluster-ready',
          'monitoring-setup',
          'database-setup',
          'completed',
          'rollback-started',
          'rollback-complete',
          'failed'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add metrics_data column
    await queryInterface.addColumn('deployments', 'metrics_data', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Deployment metrics and performance data',
    });

    // Add terraform_working_dir column
    await queryInterface.addColumn('deployments', 'terraform_working_dir', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Terraform working directory path for this deployment',
    });

    // Add terraform_state column
    await queryInterface.addColumn('deployments', 'terraform_state', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Parsed Terraform state file',
    });

    // Add terraform_outputs column
    await queryInterface.addColumn('deployments', 'terraform_outputs', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Terraform output values (cluster endpoint, kubeconfig, etc)',
    });

    // Add deployment_phase column
    await queryInterface.addColumn('deployments', 'deployment_phase', {
      type: Sequelize.ENUM(
        'created',
        'terraform-init',
        'terraform-plan',
        'terraform-apply',
        'cluster-ready',
        'monitoring-setup',
        'database-setup',
        'completed',
        'rollback-started',
        'rollback-complete',
        'failed'
      ),
      allowNull: false,
      defaultValue: 'created',
      comment: 'Current phase of deployment lifecycle',
    });

    // Add terraform_version column
    await queryInterface.addColumn('deployments', 'terraform_version', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Version of Terraform used for deployment',
    });

    // Add deployment_logs column
    await queryInterface.addColumn('deployments', 'deployment_logs', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of deployment event logs',
    });

    // Add index on deployment_phase for efficient queries
    await queryInterface.addIndex('deployments', ['deployment_phase'], {
      name: 'idx_deployments_deployment_phase',
    });

    console.log('✓ Added missing deployment columns successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('deployments', 'idx_deployments_deployment_phase');

    // Remove columns in reverse order
    await queryInterface.removeColumn('deployments', 'deployment_logs');
    await queryInterface.removeColumn('deployments', 'terraform_version');
    await queryInterface.removeColumn('deployments', 'deployment_phase');
    await queryInterface.removeColumn('deployments', 'terraform_outputs');
    await queryInterface.removeColumn('deployments', 'terraform_state');
    await queryInterface.removeColumn('deployments', 'terraform_working_dir');
    await queryInterface.removeColumn('deployments', 'metrics_data');

    // Drop enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_deployments_deployment_phase;
    `);

    console.log('✓ Removed deployment columns successfully');
  },
};
