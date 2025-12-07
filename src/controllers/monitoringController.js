const { Op } = require('sequelize');
const { Job, JobExecution, JobLog, User } = require('../models');
const { getQueueStats } = require('../queues/jobQueue');
const { sequelize } = require('../config/database');
const { redisConnection } = require('../config/redis');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Get system health status
 * @route   GET /api/v1/monitoring/health
 * @access  Public
 */
const getHealth = asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../../package.json').version,
    services: {},
  };

  // Check database
  try {
    await sequelize.authenticate();
    health.services.database = { status: 'healthy' };
  } catch (error) {
    health.services.database = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }

  // Check Redis
  try {
    await redisConnection.ping();
    health.services.redis = { status: 'healthy' };
  } catch (error) {
    health.services.redis = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    success: health.status === 'healthy',
    data: health,
  });
});

/**
 * @desc    Get detailed system metrics
 * @route   GET /api/v1/monitoring/metrics
 * @access  Private (Admin)
 */
const getMetrics = asyncHandler(async (req, res) => {
  // Get queue statistics
  const queueStats = await getQueueStats();

  // Get job statistics
  const now = new Date();
  const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Job counts by status
  const jobsByStatus = await Job.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['status'],
    raw: true,
  });

  // Jobs by type
  const jobsByType = await Job.findAll({
    attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['type'],
    raw: true,
  });

  // Executions in last 24 hours
  const executions24h = await JobExecution.count({
    where: {
      createdAt: { [Op.gte]: last24Hours },
    },
  });

  // Failed executions in last 24 hours
  const failedExecutions24h = await JobExecution.count({
    where: {
      status: 'failed',
      createdAt: { [Op.gte]: last24Hours },
    },
  });

  // Success rate last 24 hours
  const completedExecutions24h = await JobExecution.count({
    where: {
      status: 'completed',
      createdAt: { [Op.gte]: last24Hours },
    },
  });

  const successRate24h = executions24h > 0 
    ? ((completedExecutions24h / executions24h) * 100).toFixed(2)
    : 100;

  // Average execution time
  const avgDuration = await JobExecution.findOne({
    attributes: [[sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']],
    where: {
      status: 'completed',
      duration: { [Op.not]: null },
      createdAt: { [Op.gte]: last24Hours },
    },
    raw: true,
  });

  // Total users and active users
  const totalUsers = await User.count();
  const activeUsers = await User.count({
    where: {
      lastLoginAt: { [Op.gte]: last7Days },
    },
  });

  // Error rate by hour (last 24 hours)
  const hourlyErrors = await JobExecution.findAll({
    attributes: [
      [sequelize.fn('date_trunc', 'hour', sequelize.col('created_at')), 'hour'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    where: {
      status: 'failed',
      createdAt: { [Op.gte]: last24Hours },
    },
    group: [sequelize.fn('date_trunc', 'hour', sequelize.col('created_at'))],
    order: [[sequelize.fn('date_trunc', 'hour', sequelize.col('created_at')), 'ASC']],
    raw: true,
  });

  res.json({
    success: true,
    data: {
      queue: queueStats,
      jobs: {
        byStatus: jobsByStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        byType: jobsByType.reduce((acc, item) => {
          acc[item.type] = parseInt(item.count);
          return acc;
        }, {}),
        total: await Job.count(),
      },
      executions: {
        last24Hours: executions24h,
        failedLast24Hours: failedExecutions24h,
        successRate24h: parseFloat(successRate24h),
        averageDurationMs: Math.round(avgDuration?.avgDuration || 0),
        hourlyErrors,
      },
      users: {
        total: totalUsers,
        activeLast7Days: activeUsers,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    },
  });
});

/**
 * @desc    Get dashboard statistics for current user
 * @route   GET /api/v1/monitoring/dashboard
 * @access  Private
 */
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const now = new Date();
  const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // User's job counts by status
  const jobsByStatus = await Job.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    where: { userId },
    group: ['status'],
    raw: true,
  });

  // Total jobs
  const totalJobs = await Job.count({ where: { userId } });

  // Recent executions
  const recentExecutions = await JobExecution.findAll({
    include: [{
      model: Job,
      as: 'job',
      where: { userId },
      attributes: ['name', 'type'],
    }],
    order: [['createdAt', 'DESC']],
    limit: 10,
  });

  // Executions in last 24 hours
  const executions24h = await JobExecution.count({
    include: [{
      model: Job,
      as: 'job',
      where: { userId },
      attributes: [],
    }],
    where: {
      createdAt: { [Op.gte]: last24Hours },
    },
  });

  // Success/failure in last 24 hours
  const successful24h = await JobExecution.count({
    include: [{
      model: Job,
      as: 'job',
      where: { userId },
      attributes: [],
    }],
    where: {
      status: 'completed',
      createdAt: { [Op.gte]: last24Hours },
    },
  });

  const failed24h = await JobExecution.count({
    include: [{
      model: Job,
      as: 'job',
      where: { userId },
      attributes: [],
    }],
    where: {
      status: 'failed',
      createdAt: { [Op.gte]: last24Hours },
    },
  });

  // Upcoming scheduled jobs
  const upcomingJobs = await Job.findAll({
    where: {
      userId,
      status: 'active',
      nextExecutionAt: { [Op.gte]: now },
    },
    order: [['nextExecutionAt', 'ASC']],
    limit: 5,
    attributes: ['id', 'name', 'type', 'scheduleType', 'nextExecutionAt'],
  });

  // Failed jobs that need attention
  const failedJobs = await Job.findAll({
    where: {
      userId,
      status: 'failed',
    },
    order: [['updatedAt', 'DESC']],
    limit: 5,
    attributes: ['id', 'name', 'type', 'lastExecutedAt', 'failedExecutions'],
  });

  // Daily execution trend (last 7 days)
  const dailyTrend = await JobExecution.findAll({
    attributes: [
      [sequelize.fn('date_trunc', 'day', sequelize.col('job_executions.created_at')), 'date'],
      [sequelize.fn('COUNT', sequelize.col('job_executions.id')), 'total'],
      [
        sequelize.fn(
          'SUM',
          sequelize.literal("CASE WHEN job_executions.status = 'completed' THEN 1 ELSE 0 END")
        ),
        'completed',
      ],
      [
        sequelize.fn(
          'SUM',
          sequelize.literal("CASE WHEN job_executions.status = 'failed' THEN 1 ELSE 0 END")
        ),
        'failed',
      ],
    ],
    include: [{
      model: Job,
      as: 'job',
      where: { userId },
      attributes: [],
    }],
    where: {
      createdAt: { [Op.gte]: last7Days },
    },
    group: [sequelize.fn('date_trunc', 'day', sequelize.col('job_executions.created_at'))],
    order: [[sequelize.fn('date_trunc', 'day', sequelize.col('job_executions.created_at')), 'ASC']],
    raw: true,
  });

  res.json({
    success: true,
    data: {
      summary: {
        totalJobs,
        jobsByStatus: jobsByStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        executions24h,
        successful24h,
        failed24h,
        successRate: executions24h > 0 
          ? ((successful24h / executions24h) * 100).toFixed(2)
          : 100,
      },
      recentExecutions,
      upcomingJobs,
      failedJobs,
      dailyTrend: dailyTrend.map(d => ({
        date: d.date,
        total: parseInt(d.total),
        completed: parseInt(d.completed),
        failed: parseInt(d.failed),
      })),
    },
  });
});

/**
 * @desc    Get recent logs
 * @route   GET /api/v1/monitoring/logs
 * @access  Private (Admin)
 */
const getLogs = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    level, 
    jobId,
    startDate,
    endDate,
  } = req.query;

  const offset = (page - 1) * limit;
  const where = {};

  if (level) where.level = level;
  if (jobId) where.jobId = jobId;
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp[Op.gte] = new Date(startDate);
    if (endDate) where.timestamp[Op.lte] = new Date(endDate);
  }

  const { count, rows: logs } = await JobLog.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['timestamp', 'DESC']],
    include: [{
      model: Job,
      as: 'job',
      attributes: ['name', 'userId'],
    }],
  });

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    },
  });
});

module.exports = {
  getHealth,
  getMetrics,
  getDashboard,
  getLogs,
};

