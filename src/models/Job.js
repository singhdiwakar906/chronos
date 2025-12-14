const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('http', 'script', 'email', 'webhook', 'custom'),
    allowNull: false,
    defaultValue: 'http',
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'completed', 'failed', 'cancelled'),
    defaultValue: 'active',
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 10,
    },
  },
  // Job payload/configuration
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    comment: 'Job-specific configuration (URL, headers, script path, etc.)',
  },
  // Scheduling configuration
  scheduleType: {
    type: DataTypes.ENUM('immediate', 'scheduled', 'recurring'),
    allowNull: false,
    defaultValue: 'immediate',
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'For scheduled jobs: when to execute',
  },
  cronExpression: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'For recurring jobs: cron expression',
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC',
  },
  // Retry configuration
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
  },
  retryDelay: {
    type: DataTypes.INTEGER,
    defaultValue: 5000,
    comment: 'Delay between retries in milliseconds',
  },
  retryBackoff: {
    type: DataTypes.ENUM('fixed', 'exponential'),
    defaultValue: 'exponential',
  },
  // Timeout configuration
  timeout: {
    type: DataTypes.INTEGER,
    defaultValue: 300000,
    comment: 'Job timeout in milliseconds',
  },
  // Execution tracking
  lastExecutedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  nextExecutionAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  totalExecutions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  successfulExecutions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  failedExecutions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Recurring job end condition
  endAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When to stop recurring job',
  },
  maxExecutions: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Maximum number of executions for recurring job',
  },
  // Metadata
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'jobs',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['schedule_type'] },
    { fields: ['next_execution_at'] },
    { fields: ['created_at'] },
  ],
});

module.exports = Job;

