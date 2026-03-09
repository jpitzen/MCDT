'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'approver' to the enum_users_role type
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'approver';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This would require recreating the entire enum type
    console.log('Rollback not supported for enum values. Manual intervention required if needed.');
  },
};
