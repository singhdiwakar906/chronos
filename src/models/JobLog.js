const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobLog = sequelize.define('JobLog', {
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
  executionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'job_executions',
      key: 'id',
    },
  },
  level: {
    type: DataTypes.ENUM('debug', 'info', 'warn', 'error'),
    defaultValue: 'info',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'job_logs',
  indexes: [
    { fields: ['job_id'] },
    { fields: ['execution_id'] },
    { fields: ['level'] },
    { fields: ['timestamp'] },
    { fields: ['job_id', 'timestamp'] },
  ],
});

module.exports = JobLog;

