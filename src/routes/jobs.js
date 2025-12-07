const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/jobController');
const { authenticate } = require('../middleware/auth');
const { jobValidation, executionValidation, validate } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/jobs
 * @desc    Create a new job
 * @access  Private
 */
router.post('/', jobValidation.create, validate, createJob);

/**
 * @route   GET /api/v1/jobs
 * @desc    Get all jobs for current user
 * @access  Private
 */
router.get('/', jobValidation.list, validate, getJobs);

/**
 * @route   GET /api/v1/jobs/:id
 * @desc    Get a single job
 * @access  Private
 */
router.get('/:id', jobValidation.getById, validate, getJob);

/**
 * @route   PUT /api/v1/jobs/:id
 * @desc    Update a job
 * @access  Private
 */
router.put('/:id', jobValidation.update, validate, updateJob);

/**
 * @route   DELETE /api/v1/jobs/:id
 * @desc    Delete a job
 * @access  Private
 */
router.delete('/:id', jobValidation.getById, validate, deleteJob);

/**
 * @route   POST /api/v1/jobs/:id/pause
 * @desc    Pause a job
 * @access  Private
 */
router.post('/:id/pause', jobValidation.getById, validate, pauseJob);

/**
 * @route   POST /api/v1/jobs/:id/resume
 * @desc    Resume a paused job
 * @access  Private
 */
router.post('/:id/resume', jobValidation.getById, validate, resumeJob);

/**
 * @route   POST /api/v1/jobs/:id/cancel
 * @desc    Cancel a job
 * @access  Private
 */
router.post('/:id/cancel', jobValidation.getById, validate, cancelJob);

/**
 * @route   POST /api/v1/jobs/:id/reschedule
 * @desc    Reschedule a job
 * @access  Private
 */
router.post('/:id/reschedule', jobValidation.getById, validate, rescheduleJob);

/**
 * @route   POST /api/v1/jobs/:id/trigger
 * @desc    Trigger immediate execution of a job
 * @access  Private
 */
router.post('/:id/trigger', jobValidation.getById, validate, triggerJob);

/**
 * @route   GET /api/v1/jobs/:id/executions
 * @desc    Get job executions
 * @access  Private
 */
router.get('/:id/executions', executionValidation.list, validate, getJobExecutions);

/**
 * @route   GET /api/v1/jobs/:id/logs
 * @desc    Get job logs
 * @access  Private
 */
router.get('/:id/logs', jobValidation.getById, validate, getJobLogs);

/**
 * @route   GET /api/v1/jobs/:id/stats
 * @desc    Get job statistics
 * @access  Private
 */
router.get('/:id/stats', jobValidation.getById, validate, getJobStats);

module.exports = router;

