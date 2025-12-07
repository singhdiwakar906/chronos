'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM('http', 'script', 'email', 'webhook', 'custom'),
        allowNull: false,
        defaultValue: 'http',
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'completed', 'failed', 'cancelled'),
        defaultValue: 'active',
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      schedule_type: {
        type: Sequelize.ENUM('immediate', 'scheduled', 'recurring'),
        allowNull: false,
        defaultValue: 'immediate',
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cron_expression: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      timezone: {
        type: Sequelize.STRING(50),
        defaultValue: 'UTC',
      },
      max_retries: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
      },
      retry_delay: {
        type: Sequelize.INTEGER,
        defaultValue: 5000,
      },
      retry_backoff: {
        type: Sequelize.ENUM('fixed', 'exponential'),
        defaultValue: 'exponential',
      },
      timeout: {
        type: Sequelize.INTEGER,
        defaultValue: 300000,
      },
      last_executed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      next_execution_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      total_executions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      successful_executions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      failed_executions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      end_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      max_executions: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
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
    await queryInterface.addIndex('jobs', ['user_id']);
    await queryInterface.addIndex('jobs', ['status']);
    await queryInterface.addIndex('jobs', ['schedule_type']);
    await queryInterface.addIndex('jobs', ['next_execution_at']);
    await queryInterface.addIndex('jobs', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('jobs');
  },
};

