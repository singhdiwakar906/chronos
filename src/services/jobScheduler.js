const cronParser = require('cron-parser');
const { Job, JobExecution, JobLog } = require('../models');
const { addJob, addDelayedJob, addRecurringJob, removeRecurringJob, cancelJob } = require('../queues/jobQueue');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Job Scheduler Service
 * Manages job scheduling, creation, and lifecycle
 */
class JobScheduler {
  /**
   * Schedule a new job
   * @param {Object} jobData - Job data from API
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Created job
   */
  async scheduleJob(jobData, userId) {
    const {
      name,
      description,
      type,
      payload,
      scheduleType,
      scheduledAt,
      cronExpression,
      timezone = 'UTC',
      maxRetries,
      retryDelay,
      retryBackoff,
      timeout,
      priority,
      tags,
      metadata,
      endAt,
      maxExecutions,
    } = jobData;

    // Validate cron expression if recurring
    if (scheduleType === 'recurring') {
      this.validateCronExpression(cronExpression);
    }

    // Calculate next execution time
    let nextExecutionAt = null;
    if (scheduleType === 'immediate') {
      nextExecutionAt = new Date();
    } else if (scheduleType === 'scheduled') {
      nextExecutionAt = new Date(scheduledAt);
    } else if (scheduleType === 'recurring') {
      nextExecutionAt = this.getNextCronExecution(cronExpression, timezone);
    }

    // Create job in database
    const job = await Job.create({
      userId,
      name,
      description,
      type,
      payload,
      scheduleType,
      scheduledAt,
      cronExpression,
      timezone,
      maxRetries: maxRetries ?? 3,
      retryDelay: retryDelay ?? 5000,
      retryBackoff: retryBackoff ?? 'exponential',
      timeout: timeout ?? 300000,
      priority: priority ?? 0,
      tags: tags ?? [],
      metadata: metadata ?? {},
      nextExecutionAt,
      endAt,
      maxExecutions,
      status: 'active',
    });

    // Add to queue based on schedule type
    await this.enqueueJob(job);

    // Log job creation
    await JobLog.create({
      jobId: job.id,
      level: 'info',
      message: `Job "${name}" created and scheduled`,
      data: { scheduleType, nextExecutionAt },
    });

    logger.job(job.id, 'Job scheduled successfully', { scheduleType, nextExecutionAt });

    return job;
  }

  /**
   * Enqueue job based on schedule type
   * @param {Object} job - Job model instance
   */
  async enqueueJob(job) {
    const queueData = {
      jobId: job.id,
      id: job.id,
      name: job.name,
      type: job.type,
      payload: job.payload,
      userId: job.userId,
      timeout: job.timeout,
      maxRetries: job.maxRetries,
      retryDelay: job.retryDelay,
      retryBackoff: job.retryBackoff,
    };

    switch (job.scheduleType) {
      case 'immediate':
        await addJob(queueData, { priority: job.priority });
        break;

      case 'scheduled':
        await addDelayedJob(queueData, job.scheduledAt);
        break;

      case 'recurring':
        await addRecurringJob(queueData, job.cronExpression, job.timezone);
        break;
    }
  }

  /**
   * Reschedule a job
   * @param {string} jobId - Job ID
   * @param {Object} scheduleData - New schedule data
   */
  async rescheduleJob(jobId, scheduleData) {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const { scheduledAt, cronExpression, timezone } = scheduleData;

    // If it was a recurring job, remove the old schedule
    if (job.scheduleType === 'recurring' && job.cronExpression) {
      await removeRecurringJob(job.id, job.cronExpression);
    }

    // Cancel any pending executions
    await cancelJob(job.id);

    // Update job
    if (scheduledAt) {
      job.scheduleType = 'scheduled';
      job.scheduledAt = scheduledAt;
      job.cronExpression = null;
      job.nextExecutionAt = new Date(scheduledAt);
    } else if (cronExpression) {
      this.validateCronExpression(cronExpression);
      job.scheduleType = 'recurring';
      job.cronExpression = cronExpression;
      job.timezone = timezone || job.timezone;
      job.scheduledAt = null;
      job.nextExecutionAt = this.getNextCronExecution(cronExpression, job.timezone);
    }

    await job.save();

    // Re-enqueue with new schedule
    await this.enqueueJob(job);

    await JobLog.create({
      jobId: job.id,
      level: 'info',
      message: 'Job rescheduled',
      data: { scheduleType: job.scheduleType, nextExecutionAt: job.nextExecutionAt },
    });

    logger.job(job.id, 'Job rescheduled', { scheduleType: job.scheduleType });

    return job;
  }

  /**
   * Pause a job
   * @param {string} jobId - Job ID
   */
  async pauseJob(jobId) {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Remove from queue
    if (job.scheduleType === 'recurring' && job.cronExpression) {
      await removeRecurringJob(job.id, job.cronExpression);
    } else {
      await cancelJob(job.id);
    }

    job.status = 'paused';
    await job.save();

    await JobLog.create({
      jobId: job.id,
      level: 'info',
      message: 'Job paused',
    });

    logger.job(job.id, 'Job paused');

    return job;
  }

  /**
   * Resume a paused job
   * @param {string} jobId - Job ID
   */
  async resumeJob(jobId) {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'paused') {
      throw new Error('Job is not paused');
    }

    // Update next execution time for recurring jobs
    if (job.scheduleType === 'recurring') {
      job.nextExecutionAt = this.getNextCronExecution(job.cronExpression, job.timezone);
    }

    job.status = 'active';
    await job.save();

    // Re-enqueue
    await this.enqueueJob(job);

    await JobLog.create({
      jobId: job.id,
      level: 'info',
      message: 'Job resumed',
    });

    logger.job(job.id, 'Job resumed');

    return job;
  }

  /**
   * Cancel a job
   * @param {string} jobId - Job ID
   */
  async cancelJob(jobId) {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Remove from queue
    if (job.scheduleType === 'recurring' && job.cronExpression) {
      await removeRecurringJob(job.id, job.cronExpression);
    } else {
      await cancelJob(job.id);
    }

    job.status = 'cancelled';
    await job.save();

    await JobLog.create({
      jobId: job.id,
      level: 'info',
      message: 'Job cancelled',
    });

    logger.job(job.id, 'Job cancelled');

    return job;
  }

  /**
   * Trigger immediate execution of a job
   * @param {string} jobId - Job ID
   */
  async triggerJob(jobId) {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'active') {
      throw new Error('Can only trigger active jobs');
    }

    const queueData = {
      jobId: job.id,
      id: `${job.id}-manual-${Date.now()}`,
      name: job.name,
      type: job.type,
      payload: job.payload,
      userId: job.userId,
      timeout: job.timeout,
      maxRetries: job.maxRetries,
      isManualTrigger: true,
    };

    await addJob(queueData, { priority: 10 }); // High priority for manual triggers

    await JobLog.create({
      jobId: job.id,
      level: 'info',
      message: 'Job manually triggered',
    });

    logger.job(job.id, 'Job manually triggered');

    return job;
  }

  /**
   * Update next execution time for recurring job
   * @param {string} jobId - Job ID
   */
  async updateNextExecution(jobId) {
    const job = await Job.findByPk(jobId);
    if (!job || job.scheduleType !== 'recurring') {
      return null;
    }

    // Check if job should end
    if (job.endAt && new Date() >= new Date(job.endAt)) {
      job.status = 'completed';
      await job.save();
      return job;
    }

    if (job.maxExecutions && job.totalExecutions >= job.maxExecutions) {
      job.status = 'completed';
      await job.save();
      return job;
    }

    job.nextExecutionAt = this.getNextCronExecution(job.cronExpression, job.timezone);
    await job.save();

    return job;
  }

  /**
   * Get jobs that are due for execution
   */
  async getDueJobs() {
    return Job.findAll({
      where: {
        status: 'active',
        nextExecutionAt: {
          [Op.lte]: new Date(),
        },
      },
    });
  }

  /**
   * Validate cron expression
   * @param {string} expression - Cron expression
   */
  validateCronExpression(expression) {
    try {
      cronParser.parseExpression(expression);
    } catch (error) {
      throw new Error(`Invalid cron expression: ${error.message}`);
    }
  }

  /**
   * Get next execution time from cron expression
   * @param {string} expression - Cron expression
   * @param {string} timezone - Timezone
   */
  getNextCronExecution(expression, timezone = 'UTC') {
    const interval = cronParser.parseExpression(expression, {
      tz: timezone,
    });
    return interval.next().toDate();
  }

  /**
   * Parse cron expression to human readable format
   * @param {string} expression - Cron expression
   */
  describeCronExpression(expression) {
    const parts = expression.split(' ');
    if (parts.length < 5) {
      return 'Invalid cron expression';
    }

    // Basic description - you might want to use a library for more detailed descriptions
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    const descriptions = [];
    
    if (minute === '*' && hour === '*') {
      descriptions.push('Every minute');
    } else if (minute !== '*' && hour === '*') {
      descriptions.push(`At minute ${minute} of every hour`);
    } else if (minute !== '*' && hour !== '*') {
      descriptions.push(`At ${hour}:${minute.padStart(2, '0')}`);
    }

    if (dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      descriptions.push(`on ${days[parseInt(dayOfWeek)] || dayOfWeek}`);
    }

    if (dayOfMonth !== '*') {
      descriptions.push(`on day ${dayOfMonth} of the month`);
    }

    return descriptions.join(' ') || expression;
  }
}

module.exports = new JobScheduler();

