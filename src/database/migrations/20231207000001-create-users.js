'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('admin', 'user'),
        defaultValue: 'user',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notification_preferences: {
        type: Sequelize.JSONB,
        defaultValue: {
          email: true,
          jobFailure: true,
          jobSuccess: false,
        },
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('users', ['email']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  },
};

