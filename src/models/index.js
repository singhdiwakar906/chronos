const User = require('./User');
const Job = require('./Job');
const JobExecution = require('./JobExecution');
const JobLog = require('./JobLog');

// Define associations

// User - Job relationship
User.hasMany(Job, {
  foreignKey: 'userId',
  as: 'jobs',
  onDelete: 'CASCADE',
});
Job.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Job - JobExecution relationship
Job.hasMany(JobExecution, {
  foreignKey: 'jobId',
  as: 'executions',
  onDelete: 'CASCADE',
});
JobExecution.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
});

// Job - JobLog relationship
Job.hasMany(JobLog, {
  foreignKey: 'jobId',
  as: 'logs',
  onDelete: 'CASCADE',
});
JobLog.belongsTo(Job, {
  foreignKey: 'jobId',
  as: 'job',
});

// JobExecution - JobLog relationship
JobExecution.hasMany(JobLog, {
  foreignKey: 'executionId',
  as: 'logs',
  onDelete: 'SET NULL',
});
JobLog.belongsTo(JobExecution, {
  foreignKey: 'executionId',
  as: 'execution',
});

// Self-referencing relationship for retry tracking
JobExecution.hasOne(JobExecution, {
  foreignKey: 'previousExecutionId',
  as: 'retryExecution',
});
JobExecution.belongsTo(JobExecution, {
  foreignKey: 'previousExecutionId',
  as: 'previousExecution',
});

module.exports = {
  User,
  Job,
  JobExecution,
  JobLog,
};

