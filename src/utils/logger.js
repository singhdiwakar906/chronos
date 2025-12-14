const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Define console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0 && !metadata.stack) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    return log;
  })
);

// Get log directory from environment or use default
const logDir = process.env.LOG_FILE_PATH || './logs';

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transports in non-test environments
if (process.env.NODE_ENV !== 'test') {
  // Daily rotate file for all logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'chronos-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  );

  // Separate file for error logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: logFormat,
    })
  );

  // Separate file for job execution logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'jobs-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Add job-specific logging method
logger.job = (jobId, message, metadata = {}) => {
  logger.info(message, { jobId, type: 'job', ...metadata });
};

// Add execution-specific logging method
logger.execution = (executionId, jobId, message, metadata = {}) => {
  logger.info(message, { executionId, jobId, type: 'execution', ...metadata });
};

module.exports = logger;

