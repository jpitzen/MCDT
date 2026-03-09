'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Seed admin user
    const adminPassword = await bcrypt.hash('Admin@123456', 10);
    await queryInterface.bulkInsert('users', [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@zl-mcdt.local',
        first_name: 'Admin',
        last_name: 'User',
        password_hash: adminPassword,
        role: 'admin',
        is_active: true,
        mfa_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'operator@zl-mcdt.local',
        first_name: 'Operator',
        last_name: 'User',
        password_hash: await bcrypt.hash('Operator@123456', 10),
        role: 'operator',
        is_active: true,
        mfa_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'viewer@zl-mcdt.local',
        first_name: 'Viewer',
        last_name: 'User',
        password_hash: await bcrypt.hash('Viewer@123456', 10),
        role: 'viewer',
        is_active: true,
        mfa_enabled: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Remove seeded users (in production, be more careful)
    await queryInterface.bulkDelete('users', {
      email: {
        [Sequelize.Op.in]: [
          'admin@zl-mcdt.local',
          'operator@zl-mcdt.local',
          'viewer@zl-mcdt.local',
        ],
      },
    }, {});
  },
};
