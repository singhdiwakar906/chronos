require('dotenv').config();

const { Worker } = require('bullmq');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { connectDatabase } = require('../config/database');
const { Job, JobExecution, JobLog } = require('../models');
const { JobExecutor } = require('../services/jobExecutor');
const jobScheduler = require('../services/jobScheduler');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// Worker ID for tracking
const WORKER_ID = `worker-${process.pid}-${uuidv4().slice(0, 8)}`;

// Redis connection options
const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

// Create job executor instance
const executor = new JobExecutor();

/**
 * Process a job
 * @param {Object} bullJob - BullMQ job object
 */
const processJob = async (bullJob) => {
  const jobData = bullJob.data;
  const startTime = Date.now();
  let execution = null;

  try {
    logger.info(`Processing job: ${jobData.name}`, { 
      jobId: jobData.jobId,
      workerId: WORKER_ID,
      attempt: bullJob.attemptsMade + 1,
    });

    // Create execution record
    execution = await JobExecution.create({
      jobId: jobData.jobId,
      status: 'running',
      attempt: bullJob.attemptsMade + 1,
      startedAt: new Date(),
      workerId: WORKER_ID,
      input: jobData.payload,
      isRetry: bullJob.attemptsMade > 0,
    });

    // Log job start
    await JobLog.create({
      jobId: jobData.jobId,
      executionId: execution.id,
      level: 'info',
      message: `Job execution started (attempt ${execution.attempt})`,
      data: { workerId: WORKER_ID },
    });

    // Update progress
    await bullJob.updateProgress(10);

    // Execute the job
    const result = await executor.execute({
      ...jobData,
      executionId: execution.id,
    });

    // Update progress
    await bullJob.updateProgress(100);

    // Calculate duration
    const duration = Date.now() - startTime;

    // Update execution record
    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.duration = duration;
    execution.result = result;
    execution.output = result;
    await execution.save();

    // Update job stats
    const job = await Job.findByPk(jobData.jobId);
    if (job) {
      job.lastExecutedAt = new Date();
      job.totalExecutions += 1;
      job.successfulExecutions += 1;
      
      // Update next execution for recurring jobs
      if (job.scheduleType === 'recurring') {
        await jobScheduler.updateNextExecution(job.id);
      } else if (job.scheduleType !== 'recurring') {
        job.status = 'completed';
      }
      
      await job.save();

      // Send success notification if enabled
      await notificationService.notifyJobCompleted(
        job.userId,
        job.id,
        job.name,
        execution.id,
        duration
      );
    }

    // Log success
    await JobLog.create({
      jobId: jobData.jobId,
      executionId: execution.id,
      level: 'info',
      message: `Job completed successfully in ${duration}ms`,
      data: { duration, result: typeof result === 'object' ? result : { value: result } },
    });

    logger.info(`Job completed: ${jobData.name}`, {
      jobId: jobData.jobId,
      executionId: execution.id,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const isLastAttempt = bullJob.attemptsMade + 1 >= (jobData.maxRetries || config.job.maxRetryAttempts);

    logger.error(`Job failed: ${jobData.name}`, {
      jobId: jobData.jobId,
      executionId: execution?.id,
      error: error.message,
      attempt: bullJob.attemptsMade + 1,
      isLastAttempt,
    });

    // Update execution record if it exists
    if (execution) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = duration;
      execution.error = {
        message: error.message,
        stack: error.stack,
      };
      execution.errorMessage = error.message;
      await execution.save();
    }

    // Update job stats
    const job = await Job.findByPk(jobData.jobId);
    if (job) {
      job.lastExecutedAt = new Date();
      job.totalExecutions += 1;
      job.failedExecutions += 1;

      if (isLastAttempt) {
        job.status = 'failed';
        
        // Send max retries exceeded notification
        await notificationService.notifyMaxRetriesExceeded(
          job.userId,
          job.id,
          job.name,
          jobData.maxRetries || config.job.maxRetryAttempts,
          error.message
        );
      } else {
        // Send retry notification
        await notificationService.notifyJobRetry(
          job.userId,
          job.id,
          job.name,
          bullJob.attemptsMade + 1,
          jobData.maxRetries || config.job.maxRetryAttempts,
          error.message
        );
      }

      await job.save();
    }

    // Log failure
    await JobLog.create({
      jobId: jobData.jobId,
      executionId: execution?.id,
      level: 'error',
      message: `Job failed: ${error.message}`,
      data: { 
        error: error.message, 
        stack: error.stack,
        attempt: bullJob.attemptsMade + 1,
        isLastAttempt,
      },
    });

    // Re-throw to trigger BullMQ retry mechanism
    throw error;
  }
};

/**
 * Start the worker
 */
const startWorker = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Create worker for main job queue
    const jobWorker = new Worker('chronos-jobs', processJob, {
      connection: redisOptions,
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 100,
        duration: 60000, // Max 100 jobs per minute
      },
    });

    // Create worker for scheduled/recurring jobs
    const scheduledWorker = new Worker('chronos-scheduled', processJob, {
      connection: redisOptions,
      concurrency: 5,
    });

    // Set up event listeners for main worker
    jobWorker.on('completed', (job, result) => {
      logger.info('Worker: Job completed', { 
        jobId: job.id, 
        name: job.name,
        workerId: WORKER_ID,
      });
    });

    jobWorker.on('failed', (job, err) => {
      logger.error('Worker: Job failed', {
        jobId: job?.id,
        name: job?.name,
        error: err.message,
        workerId: WORKER_ID,
      });
    });

    jobWorker.on('error', (err) => {
      logger.error('Worker error:', err);
    });

    jobWorker.on('stalled', (jobId) => {
      logger.warn('Worker: Job stalled', { jobId, workerId: WORKER_ID });
    });

    // Set up event listeners for scheduled worker
    scheduledWorker.on('completed', (job, result) => {
      logger.info('Scheduled Worker: Job completed', { 
        jobId: job.id,
        workerId: WORKER_ID,
      });
    });

    scheduledWorker.on('failed', (job, err) => {
      logger.error('Scheduled Worker: Job failed', {
        jobId: job?.id,
        error: err.message,
        workerId: WORKER_ID,
      });
    });

    logger.info(`Worker started: ${WORKER_ID}`);
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⚡ CHRONOS JOB WORKER                                       ║
║                                                               ║
║   Worker ID: ${WORKER_ID.padEnd(40)}    ║
║   Concurrency: 5 jobs                                         ║
║   Rate Limit: 100 jobs/minute                                 ║
║                                                               ║
║   Listening for jobs...                                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down worker...`);
      
      await jobWorker.close();
      await scheduledWorker.close();
      
      logger.info('Worker shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
};

// Start the worker
startWorker();

