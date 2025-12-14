'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('job_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      job_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'jobs',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      execution_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'job_executions',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      level: {
        type: Sequelize.ENUM('debug', 'info', 'warn', 'error'),
        defaultValue: 'info',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    // Add indexes
    await queryInterface.addIndex('job_logs', ['job_id']);
    await queryInterface.addIndex('job_logs', ['execution_id']);
    await queryInterface.addIndex('job_logs', ['level']);
    await queryInterface.addIndex('job_logs', ['timestamp']);
    await queryInterface.addIndex('job_logs', ['job_id', 'timestamp']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('job_logs');
  },
};

