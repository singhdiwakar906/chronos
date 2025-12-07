'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('job_executions', {
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
      status: {
        type: Sequelize.ENUM('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'),
        defaultValue: 'pending',
      },
      attempt: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      result: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      error: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_retry: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      previous_execution_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'job_executions',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      worker_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      input: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      output: {
        type: Sequelize.JSONB,
        allowNull: true,
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
    await queryInterface.addIndex('job_executions', ['job_id']);
    await queryInterface.addIndex('job_executions', ['status']);
    await queryInterface.addIndex('job_executions', ['started_at']);
    await queryInterface.addIndex('job_executions', ['created_at']);
    await queryInterface.addIndex('job_executions', ['job_id', 'status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('job_executions');
  },
};

