'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if deployment_phase column exists before attempting to modify enum
    const table = await queryInterface.describeTable('deployments');
    
    if (!table.deployment_phase) {
      console.log('deployment_phase column does not exist, skipping enum modification');
      return;
    }
    
    const currentEnum = table.deployment_phase.type;

    // Add new enum values for database phases
    await queryInterface.sequelize.query(`
      ALTER TYPE ${currentEnum} ADD VALUE IF NOT EXISTS 'database-init';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE ${currentEnum} ADD VALUE IF NOT EXISTS 'database-ready';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This would require recreating the entire enum type
    console.log('Rollback not supported for enum values. Manual intervention required if needed.');
  },
};
