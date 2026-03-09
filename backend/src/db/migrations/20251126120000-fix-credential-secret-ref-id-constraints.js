'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, update any NULL values to empty string or generate unique values
    await queryInterface.sequelize.query(`
      UPDATE credentials 
      SET secret_ref_id = 'legacy-' || id::text 
      WHERE secret_ref_id IS NULL;
    `);

    // Now add NOT NULL constraint
    await queryInterface.changeColumn('credentials', 'secret_ref_id', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    // Add unique constraint
    await queryInterface.addConstraint('credentials', {
      fields: ['secret_ref_id'],
      type: 'unique',
      name: 'credentials_secret_ref_id_unique',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove unique constraint
    await queryInterface.removeConstraint('credentials', 'credentials_secret_ref_id_unique');

    // Remove NOT NULL constraint
    await queryInterface.changeColumn('credentials', 'secret_ref_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
