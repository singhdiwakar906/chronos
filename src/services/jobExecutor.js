const https = require('https');
const http = require('http');
const { URL } = require('url');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * Job Executor Service
 * Handles execution of different job types
 */
class JobExecutor {
  /**
   * Execute a job based on its type
   * @param {Object} job - Job data
   * @returns {Promise<Object>} - Execution result
   */
  async execute(job) {
    const { type, payload } = job;
    
    logger.execution(job.executionId, job.id, `Executing ${type} job`, { payload });
    
    switch (type) {
      case 'http':
        return this.executeHttpJob(payload);
      case 'webhook':
        return this.executeWebhookJob(payload);
      case 'script':
        return this.executeScriptJob(payload);
      case 'email':
        return this.executeEmailJob(payload);
      case 'custom':
        return this.executeCustomJob(payload);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
   * Execute HTTP request job
   * @param {Object} payload - Job payload
   */
  async executeHttpJob(payload) {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
    } = payload;

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout,
      };

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          };

          // Try to parse JSON response
          try {
            result.body = JSON.parse(data);
          } catch (e) {
            // Keep as string if not JSON
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            logger.info('HTTP job completed successfully', { 
              url, 
              method, 
              statusCode: res.statusCode 
            });
            resolve(result);
          } else {
            reject(new Error(`HTTP request failed with status ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HTTP request timed out'));
      });

      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Execute Webhook job (similar to HTTP but optimized for webhooks)
   * @param {Object} payload - Job payload
   */
  async executeWebhookJob(payload) {
    const {
      url,
      method = 'POST',
      headers = {},
      data,
      secret,
    } = payload;

    // Add webhook signature if secret is provided
    const webhookHeaders = { ...headers };
    if (secret && data) {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(data))
        .digest('hex');
      webhookHeaders['X-Webhook-Signature'] = signature;
    }

    return this.executeHttpJob({
      url,
      method,
      headers: webhookHeaders,
      body: data,
    });
  }

  /**
   * Execute Script job
   * @param {Object} payload - Job payload
   */
  async executeScriptJob(payload) {
    const {
      command,
      args = [],
      cwd,
      env = {},
      timeout = 60000,
    } = payload;

    const fullCommand = `${command} ${args.join(' ')}`;
    
    logger.info('Executing script', { command: fullCommand, cwd });

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd,
        env: { ...process.env, ...env },
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return {
        success: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command: fullCommand,
      };
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  /**
   * Execute Email job
   * @param {Object} payload - Job payload
   */
  async executeEmailJob(payload) {
    const {
      to,
      subject,
      text,
      html,
      from,
    } = payload;

    // This is a placeholder - in production, integrate with your email service
    // For now, we'll simulate sending
    logger.info('Sending email', { to, subject });

    // Simulate email sending
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          messageId: `email_${Date.now()}`,
          to,
          subject,
        });
      }, 100);
    });
  }

  /**
   * Execute Custom job
   * @param {Object} payload - Job payload
   */
  async executeCustomJob(payload) {
    const { handler, data } = payload;

    // For custom jobs, the payload should contain a handler name
    // that maps to a registered handler function
    if (!handler) {
      throw new Error('Custom job requires a handler name');
    }

    // Get registered handler (you would register these in your application)
    const handlerFn = customHandlers[handler];
    if (!handlerFn) {
      throw new Error(`Unknown handler: ${handler}`);
    }

    return handlerFn(data);
  }
}

// Registry for custom job handlers
const customHandlers = {};

/**
 * Register a custom job handler
 * @param {string} name - Handler name
 * @param {Function} handler - Handler function
 */
const registerHandler = (name, handler) => {
  customHandlers[name] = handler;
  logger.info('Custom handler registered', { name });
};

// Register some example handlers
registerHandler('log', async (data) => {
  logger.info('Custom log handler executed', data);
  return { logged: true, data };
});

registerHandler('delay', async (data) => {
  const delay = data.delay || 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));
  return { delayed: true, duration: delay };
});

module.exports = {
  JobExecutor,
  registerHandler,
};

