const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobExecution = sequelize.define('JobExecution', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'),
    defaultValue: 'pending',
  },
  attempt: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Execution duration in milliseconds',
  },
  // Execution result
  result: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Result data from job execution',
  },
  // Error information
  error: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Error details if job failed',
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Retry information
  isRetry: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  previousExecutionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'job_executions',
      key: 'id',
    },
  },
  // Worker information
  workerId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID of worker that processed this job',
  },
  // Input/Output tracking
  input: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Input data for this execution',
  },
  output: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Output data from this execution',
  },
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
}, {
  tableName: 'job_executions',
  indexes: [
    { fields: ['job_id'] },
    { fields: ['status'] },
    { fields: ['started_at'] },
    { fields: ['created_at'] },
    { fields: ['job_id', 'status'] },
  ],
});

module.exports = JobExecution;

