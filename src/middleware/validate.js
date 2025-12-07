const { validationResult, body, param, query } = require('express-validator');
const { ApiError } = require('./errorHandler');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    throw new ApiError(400, 'Validation failed', formattedErrors);
  }
  
  next();
};

/**
 * Auth validation rules
 */
const authValidation = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
};

/**
 * Job validation rules
 */
const jobValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Job name is required and must be less than 255 characters'),
    body('type')
      .isIn(['http', 'script', 'email', 'webhook', 'custom'])
      .withMessage('Invalid job type'),
    body('scheduleType')
      .isIn(['immediate', 'scheduled', 'recurring'])
      .withMessage('Invalid schedule type'),
    body('scheduledAt')
      .optional()
      .isISO8601()
      .withMessage('Scheduled time must be a valid ISO 8601 date')
      .custom((value, { req }) => {
        if (req.body.scheduleType === 'scheduled' && !value) {
          throw new Error('Scheduled time is required for scheduled jobs');
        }
        if (value && new Date(value) <= new Date()) {
          throw new Error('Scheduled time must be in the future');
        }
        return true;
      }),
    body('cronExpression')
      .optional()
      .custom((value, { req }) => {
        if (req.body.scheduleType === 'recurring' && !value) {
          throw new Error('Cron expression is required for recurring jobs');
        }
        return true;
      }),
    body('payload')
      .isObject()
      .withMessage('Payload must be an object'),
    body('maxRetries')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('Max retries must be between 0 and 10'),
    body('timeout')
      .optional()
      .isInt({ min: 1000, max: 3600000 })
      .withMessage('Timeout must be between 1 second and 1 hour'),
    body('priority')
      .optional()
      .isInt({ min: 0, max: 10 })
      .withMessage('Priority must be between 0 and 10'),
  ],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid job ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Job name must be less than 255 characters'),
    body('status')
      .optional()
      .isIn(['active', 'paused', 'cancelled'])
      .withMessage('Invalid status'),
    body('scheduledAt')
      .optional()
      .isISO8601()
      .withMessage('Scheduled time must be a valid ISO 8601 date'),
    body('cronExpression')
      .optional()
      .isString()
      .withMessage('Cron expression must be a string'),
  ],

  getById: [
    param('id')
      .isUUID()
      .withMessage('Invalid job ID'),
  ],

  list: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['active', 'paused', 'completed', 'failed', 'cancelled'])
      .withMessage('Invalid status filter'),
    query('type')
      .optional()
      .isIn(['http', 'script', 'email', 'webhook', 'custom'])
      .withMessage('Invalid type filter'),
    query('scheduleType')
      .optional()
      .isIn(['immediate', 'scheduled', 'recurring'])
      .withMessage('Invalid schedule type filter'),
  ],
};

/**
 * Execution validation rules
 */
const executionValidation = {
  list: [
    param('jobId')
      .isUUID()
      .withMessage('Invalid job ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'])
      .withMessage('Invalid status filter'),
  ],

  getById: [
    param('id')
      .isUUID()
      .withMessage('Invalid execution ID'),
  ],
};

module.exports = {
  validate,
  authValidation,
  jobValidation,
  executionValidation,
};

