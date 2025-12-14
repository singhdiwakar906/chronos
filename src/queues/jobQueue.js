const { Queue, QueueEvents } = require('bullmq');
const config = require('../config');
const logger = require('../utils/logger');

// Redis connection options for BullMQ
const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

// Create job queue
const jobQueue = new Queue('chronos-jobs', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: config.job.maxRetryAttempts,
    backoff: {
      type: 'exponential',
      delay: config.job.retryDelayMs,
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 3600, // Keep jobs for 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Create scheduled jobs queue (for recurring jobs)
const scheduledQueue = new Queue('chronos-scheduled', {
  connection: redisOptions,
});

// Queue events for monitoring
const queueEvents = new QueueEvents('chronos-jobs', {
  connection: redisOptions,
});

// Set up event listeners
queueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info('Job completed in queue', { jobId, result: returnvalue });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error('Job failed in queue', { jobId, reason: failedReason });
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.info('Job progress', { jobId, progress: data });
});

queueEvents.on('stalled', ({ jobId }) => {
  logger.warn('Job stalled', { jobId });
});

/**
 * Add a job to the queue
 * @param {Object} jobData - Job data
 * @param {Object} options - BullMQ job options
 */
const addJob = async (jobData, options = {}) => {
  const job = await jobQueue.add(jobData.name || 'job', jobData, {
    ...options,
    jobId: jobData.jobId,
  });
  
  logger.info('Job added to queue', { 
    jobId: job.id, 
    name: jobData.name,
    delay: options.delay,
  });
  
  return job;
};

/**
 * Add a delayed job
 * @param {Object} jobData - Job data
 * @param {Date} executeAt - When to execute
 */
const addDelayedJob = async (jobData, executeAt) => {
  const delay = new Date(executeAt).getTime() - Date.now();
  
  if (delay < 0) {
    throw new Error('Execute time must be in the future');
  }
  
  return addJob(jobData, { delay });
};

/**
 * Add a recurring job
 * @param {Object} jobData - Job data
 * @param {string} cronExpression - Cron expression
 * @param {string} timezone - Timezone
 */
const addRecurringJob = async (jobData, cronExpression, timezone = 'UTC') => {
  const job = await scheduledQueue.add(jobData.name || 'recurring-job', jobData, {
    repeat: {
      pattern: cronExpression,
      tz: timezone,
    },
    jobId: jobData.jobId,
  });
  
  logger.info('Recurring job added', { 
    jobId: job.id, 
    cron: cronExpression,
    timezone,
  });
  
  return job;
};

/**
 * Remove a recurring job
 * @param {string} jobId - Job ID
 * @param {string} cronExpression - Cron expression
 */
const removeRecurringJob = async (jobId, cronExpression) => {
  const removed = await scheduledQueue.removeRepeatableByKey(
    `recurring-job:${jobId}:::${cronExpression}`
  );
  
  if (removed) {
    logger.info('Recurring job removed', { jobId });
  }
  
  return removed;
};

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 */
const getJob = async (jobId) => {
  return jobQueue.getJob(jobId);
};

/**
 * Cancel a job
 * @param {string} jobId - Job ID
 */
const cancelJob = async (jobId) => {
  const job = await jobQueue.getJob(jobId);
  
  if (job) {
    await job.remove();
    logger.info('Job cancelled', { jobId });
    return true;
  }
  
  return false;
};

/**
 * Get queue statistics
 */
const getQueueStats = async () => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    jobQueue.getWaitingCount(),
    jobQueue.getActiveCount(),
    jobQueue.getCompletedCount(),
    jobQueue.getFailedCount(),
    jobQueue.getDelayedCount(),
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed,
  };
};

/**
 * Pause the queue
 */
const pauseQueue = async () => {
  await jobQueue.pause();
  logger.info('Job queue paused');
};

/**
 * Resume the queue
 */
const resumeQueue = async () => {
  await jobQueue.resume();
  logger.info('Job queue resumed');
};

/**
 * Drain the queue (remove all waiting jobs)
 */
const drainQueue = async () => {
  await jobQueue.drain();
  logger.info('Job queue drained');
};

/**
 * Clean old jobs
 * @param {number} age - Max age in milliseconds
 * @param {string} status - Job status to clean
 */
const cleanJobs = async (age, status = 'completed') => {
  const count = await jobQueue.clean(age, 1000, status);
  logger.info(`Cleaned ${count.length} ${status} jobs`);
  return count;
};

module.exports = {
  jobQueue,
  scheduledQueue,
  queueEvents,
  addJob,
  addDelayedJob,
  addRecurringJob,
  removeRecurringJob,
  getJob,
  cancelJob,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  drainQueue,
  cleanJobs,
};

