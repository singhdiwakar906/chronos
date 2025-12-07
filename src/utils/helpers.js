/**
 * Utility helper functions
 */

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {string} backoffType - 'fixed' or 'exponential'
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000, backoffType = 'exponential') => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = backoffType === 'exponential'
          ? baseDelay * Math.pow(2, attempt - 1)
          : baseDelay;

        await sleep(delay);
      }
    }
  }

  throw lastError;
};

/**
 * Format duration in milliseconds to human readable string
 * @param {number} ms - Duration in milliseconds
 */
const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
};

/**
 * Parse cron expression to human readable format
 * @param {string} expression - Cron expression
 */
const describeCron = (expression) => {
  const parts = expression.split(' ');
  if (parts.length < 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const descriptions = [];

  // Handle common patterns
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }

  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every hour';
  }

  if (minute !== '*' && hour !== '*') {
    descriptions.push(`At ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
  }

  if (dayOfWeek !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (dayOfWeek.includes('-')) {
      const [start, end] = dayOfWeek.split('-').map(Number);
      descriptions.push(`${days[start]} to ${days[end]}`);
    } else if (dayOfWeek.includes(',')) {
      const dayList = dayOfWeek.split(',').map(d => days[parseInt(d)]);
      descriptions.push(dayList.join(', '));
    } else {
      descriptions.push(days[parseInt(dayOfWeek)]);
    }
  }

  if (dayOfMonth !== '*') {
    descriptions.push(`on day ${dayOfMonth}`);
  }

  return descriptions.join(' ') || expression;
};

/**
 * Generate a random string
 * @param {number} length - Length of string
 */
const randomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Safe JSON parse with fallback
 * @param {string} str - String to parse
 * @param {*} fallback - Fallback value if parsing fails
 */
const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Paginate array
 * @param {Array} array - Array to paginate
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 */
const paginate = (array, page = 1, limit = 20) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    data: array.slice(start, end),
    pagination: {
      total: array.length,
      page,
      limit,
      pages: Math.ceil(array.length / limit),
    },
  };
};

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @param {number} decimals - Decimal places
 */
const percentage = (part, total, decimals = 2) => {
  if (total === 0) return 0;
  return parseFloat(((part / total) * 100).toFixed(decimals));
};

module.exports = {
  sleep,
  retryWithBackoff,
  formatDuration,
  describeCron,
  randomString,
  safeJsonParse,
  isEmpty,
  paginate,
  percentage,
};

