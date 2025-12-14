const { Op } = require('sequelize');
const { Job, JobExecution, JobLog, User } = require('../models');
const jobScheduler = require('../services/jobScheduler');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @desc    Create a new job
 * @route   POST /api/v1/jobs
 * @access  Private
 */
const createJob = asyncHandler(async (req, res) => {
  const job = await jobScheduler.scheduleJob(req.body, req.userId);

  res.status(201).json({
    success: true,
    message: 'Job created successfully',
    data: job,
  });
});

/**
 * @desc    Get all jobs for current user
 * @route   GET /api/v1/jobs
 * @access  Private
 */
const getJobs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    scheduleType,
    search,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = req.query;

  const offset = (page - 1) * limit;
  const where = { userId: req.userId };

  // Apply filters
  if (status) where.status = status;
  if (type) where.type = type;
  if (scheduleType) where.scheduleType = scheduleType;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows: jobs } = await Job.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [[sortBy, sortOrder.toUpperCase()]],
    attributes: {
      exclude: ['payload'], // Exclude payload for list view
    },
  });

  res.json({
    success: true,
    data: {
      jobs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    },
  });
});

/**
 * @desc    Get a single job by ID
 * @route   GET /api/v1/jobs/:id
 * @access  Private
 */
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
    include: [
      {
        model: JobExecution,
        as: 'executions',
        limit: 10,
        order: [['createdAt', 'DESC']],
      },
    ],
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  res.json({
    success: true,
    data: job,
  });
});

/**
 * @desc    Update a job
 * @route   PUT /api/v1/jobs/:id
 * @access  Private
 */
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  // Fields that can be updated
  const updateableFields = [
    'name',
    'description',
    'payload',
    'maxRetries',
    'retryDelay',
    'timeout',
    'priority',
    'tags',
    'metadata',
    'endAt',
    'maxExecutions',
  ];

  updateableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      job[field] = req.body[field];
    }
  });

  await job.save();

  // Log update
  await JobLog.create({
    jobId: job.id,
    level: 'info',
    message: 'Job updated',
    data: { updatedFields: Object.keys(req.body) },
  });

  res.json({
    success: true,
    message: 'Job updated successfully',
    data: job,
  });
});

/**
 * @desc    Delete a job
 * @route   DELETE /api/v1/jobs/:id
 * @access  Private
 */
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  // Cancel the job first
  await jobScheduler.cancelJob(job.id);

  // Delete the job
  await job.destroy();

  logger.info('Job deleted', { jobId: req.params.id, userId: req.userId });

  res.json({
    success: true,
    message: 'Job deleted successfully',
  });
});

/**
 * @desc    Pause a job
 * @route   POST /api/v1/jobs/:id/pause
 * @access  Private
 */
const pauseJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (job.status !== 'active') {
    throw new ApiError(400, 'Can only pause active jobs');
  }

  const updatedJob = await jobScheduler.pauseJob(job.id);

  res.json({
    success: true,
    message: 'Job paused successfully',
    data: updatedJob,
  });
});

/**
 * @desc    Resume a paused job
 * @route   POST /api/v1/jobs/:id/resume
 * @access  Private
 */
const resumeJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (job.status !== 'paused') {
    throw new ApiError(400, 'Can only resume paused jobs');
  }

  const updatedJob = await jobScheduler.resumeJob(job.id);

  res.json({
    success: true,
    message: 'Job resumed successfully',
    data: updatedJob,
  });
});

/**
 * @desc    Cancel a job
 * @route   POST /api/v1/jobs/:id/cancel
 * @access  Private
 */
const cancelJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (job.status === 'cancelled') {
    throw new ApiError(400, 'Job is already cancelled');
  }

  const updatedJob = await jobScheduler.cancelJob(job.id);

  res.json({
    success: true,
    message: 'Job cancelled successfully',
    data: updatedJob,
  });
});

/**
 * @desc    Reschedule a job
 * @route   POST /api/v1/jobs/:id/reschedule
 * @access  Private
 */
const rescheduleJob = asyncHandler(async (req, res) => {
  const { scheduledAt, cronExpression, timezone } = req.body;

  if (!scheduledAt && !cronExpression) {
    throw new ApiError(400, 'Either scheduledAt or cronExpression is required');
  }

  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  const updatedJob = await jobScheduler.rescheduleJob(job.id, {
    scheduledAt,
    cronExpression,
    timezone,
  });

  res.json({
    success: true,
    message: 'Job rescheduled successfully',
    data: updatedJob,
  });
});

/**
 * @desc    Trigger immediate execution of a job
 * @route   POST /api/v1/jobs/:id/trigger
 * @access  Private
 */
const triggerJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  await jobScheduler.triggerJob(job.id);

  res.json({
    success: true,
    message: 'Job triggered successfully',
    data: job,
  });
});

/**
 * @desc    Get job executions
 * @route   GET /api/v1/jobs/:id/executions
 * @access  Private
 */
const getJobExecutions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  // Verify job belongs to user
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  const where = { jobId: req.params.id };
  if (status) where.status = status;

  const { count, rows: executions } = await JobExecution.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    data: {
      executions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    },
  });
});

/**
 * @desc    Get job logs
 * @route   GET /api/v1/jobs/:id/logs
 * @access  Private
 */
const getJobLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, level, executionId } = req.query;
  const offset = (page - 1) * limit;

  // Verify job belongs to user
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  const where = { jobId: req.params.id };
  if (level) where.level = level;
  if (executionId) where.executionId = executionId;

  const { count, rows: logs } = await JobLog.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['timestamp', 'DESC']],
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

/**
 * @desc    Get job statistics
 * @route   GET /api/v1/jobs/:id/stats
 * @access  Private
 */
const getJobStats = asyncHandler(async (req, res) => {
  // Verify job belongs to user
  const job = await Job.findOne({
    where: {
      id: req.params.id,
      userId: req.userId,
    },
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  // Get execution statistics
  const executions = await JobExecution.findAll({
    where: { jobId: job.id },
    attributes: ['status', 'duration'],
  });

  const stats = {
    total: executions.length,
    completed: executions.filter((e) => e.status === 'completed').length,
    failed: executions.filter((e) => e.status === 'failed').length,
    running: executions.filter((e) => e.status === 'running').length,
    pending: executions.filter((e) => e.status === 'pending').length,
    averageDuration: 0,
    successRate: 0,
  };

  const completedExecutions = executions.filter(
    (e) => e.status === 'completed' && e.duration
  );

  if (completedExecutions.length > 0) {
    stats.averageDuration =
      completedExecutions.reduce((sum, e) => sum + e.duration, 0) /
      completedExecutions.length;
  }

  if (stats.total > 0) {
    stats.successRate = (stats.completed / stats.total) * 100;
  }

  res.json({
    success: true,
    data: {
      job: {
        id: job.id,
        name: job.name,
        status: job.status,
        totalExecutions: job.totalExecutions,
        successfulExecutions: job.successfulExecutions,
        failedExecutions: job.failedExecutions,
        lastExecutedAt: job.lastExecutedAt,
        nextExecutionAt: job.nextExecutionAt,
      },
      stats,
    },
  });
});

module.exports = {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
  pauseJob,
  resumeJob,
  cancelJob,
  rescheduleJob,
  triggerJob,
  getJobExecutions,
  getJobLogs,
  getJobStats,
};

