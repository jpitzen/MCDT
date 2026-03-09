'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'theme_preferences', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: 'Per-user theme settings: { mode, presetKey, customPrimary, customSecondary, customHeaderBg }',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'theme_preferences');
  },
};
