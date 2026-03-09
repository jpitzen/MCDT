'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ad_role_mappings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      ad_config_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ad_configurations',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      ad_group_dn: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      ad_group_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mapped_role: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // CHECK constraint on mapped_role
    await queryInterface.sequelize.query(`
      ALTER TABLE ad_role_mappings ADD CONSTRAINT chk_ad_role_mappings_role
        CHECK (mapped_role IN ('admin', 'approver', 'operator', 'viewer'));
    `);

    // Unique constraint on (ad_config_id, ad_group_dn)
    await queryInterface.addIndex('ad_role_mappings', ['ad_config_id', 'ad_group_dn'], {
      unique: true,
      name: 'idx_ad_role_mappings_config_group',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ad_role_mappings');
  },
};
