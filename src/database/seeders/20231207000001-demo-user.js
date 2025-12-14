'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('AdminPass123', salt);

    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        email: 'admin@chronos.dev',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        is_active: true,
        notification_preferences: JSON.stringify({
          email: true,
          jobFailure: true,
          jobSuccess: true,
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        email: 'demo@chronos.dev',
        password: await bcrypt.hash('DemoPass123', salt),
        name: 'Demo User',
        role: 'user',
        is_active: true,
        notification_preferences: JSON.stringify({
          email: true,
          jobFailure: true,
          jobSuccess: false,
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: ['admin@chronos.dev', 'demo@chronos.dev'],
    });
  },
};

