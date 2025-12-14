const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');
const { User } = require('../models');

/**
 * Notification Service
 * Handles sending notifications to users about job events
 */
class NotificationService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    if (config.email.host && config.email.user) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });

      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email configuration not provided. Email notifications disabled.');
    }
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  async notify(userId, type, data) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn('User not found for notification', { userId });
        return;
      }

      // Check user notification preferences
      if (!this.shouldNotify(user, type)) {
        logger.info('Notification skipped due to user preferences', { userId, type });
        return;
      }

      // Send email notification
      if (user.notificationPreferences.email && this.transporter) {
        await this.sendEmail(user.email, type, data);
      }

      // Here you could add other notification channels:
      // - Push notifications
      // - SMS
      // - Slack/Discord webhooks
      // - In-app notifications

      logger.info('Notification sent', { userId, type });
    } catch (error) {
      logger.error('Failed to send notification', { userId, type, error: error.message });
    }
  }

  /**
   * Check if user should receive notification
   * @param {Object} user - User object
   * @param {string} type - Notification type
   */
  shouldNotify(user, type) {
    const preferences = user.notificationPreferences || {};

    switch (type) {
      case 'job_failed':
        return preferences.jobFailure !== false;
      case 'job_completed':
        return preferences.jobSuccess === true;
      case 'job_retry':
        return preferences.jobFailure !== false;
      default:
        return true;
    }
  }

  /**
   * Send email notification
   * @param {string} to - Recipient email
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  async sendEmail(to, type, data) {
    if (!this.transporter) {
      logger.warn('Email transporter not configured');
      return;
    }

    const emailContent = this.getEmailContent(type, data);

    const mailOptions = {
      from: config.email.from,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent', { messageId: info.messageId, to });
      return info;
    } catch (error) {
      logger.error('Failed to send email', { to, error: error.message });
      throw error;
    }
  }

  /**
   * Get email content based on notification type
   * @param {string} type - Notification type
   * @param {Object} data - Notification data
   */
  getEmailContent(type, data) {
    const templates = {
      job_failed: {
        subject: `[Chronos] Job "${data.jobName}" Failed`,
        text: `Your job "${data.jobName}" has failed after ${data.attempts} attempt(s).\n\nError: ${data.error}\n\nJob ID: ${data.jobId}\nExecution ID: ${data.executionId}\n\nPlease check your job configuration and logs for more details.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Job Failed</h2>
            <p>Your job <strong>"${data.jobName}"</strong> has failed after ${data.attempts} attempt(s).</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Error:</strong></p>
              <pre style="color: #e74c3c;">${data.error}</pre>
            </div>
            <p><strong>Job ID:</strong> ${data.jobId}</p>
            <p><strong>Execution ID:</strong> ${data.executionId}</p>
            <p>Please check your job configuration and logs for more details.</p>
          </div>
        `,
      },
      job_completed: {
        subject: `[Chronos] Job "${data.jobName}" Completed Successfully`,
        text: `Your job "${data.jobName}" has completed successfully.\n\nJob ID: ${data.jobId}\nExecution ID: ${data.executionId}\nDuration: ${data.duration}ms`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">Job Completed</h2>
            <p>Your job <strong>"${data.jobName}"</strong> has completed successfully.</p>
            <p><strong>Job ID:</strong> ${data.jobId}</p>
            <p><strong>Execution ID:</strong> ${data.executionId}</p>
            <p><strong>Duration:</strong> ${data.duration}ms</p>
          </div>
        `,
      },
      job_retry: {
        subject: `[Chronos] Job "${data.jobName}" Retrying (Attempt ${data.attempt})`,
        text: `Your job "${data.jobName}" failed and is being retried.\n\nAttempt: ${data.attempt}/${data.maxRetries}\nPrevious Error: ${data.error}\n\nJob ID: ${data.jobId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f39c12;">Job Retrying</h2>
            <p>Your job <strong>"${data.jobName}"</strong> failed and is being retried.</p>
            <p><strong>Attempt:</strong> ${data.attempt}/${data.maxRetries}</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Previous Error:</strong></p>
              <pre style="color: #e74c3c;">${data.error}</pre>
            </div>
            <p><strong>Job ID:</strong> ${data.jobId}</p>
          </div>
        `,
      },
      max_retries_exceeded: {
        subject: `[Chronos] Job "${data.jobName}" Failed - Max Retries Exceeded`,
        text: `Your job "${data.jobName}" has failed permanently after ${data.maxRetries} retry attempts.\n\nLast Error: ${data.error}\n\nJob ID: ${data.jobId}\n\nPlease review the job configuration and fix any issues before retrying.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c0392b;">Job Failed Permanently</h2>
            <p>Your job <strong>"${data.jobName}"</strong> has failed permanently after ${data.maxRetries} retry attempts.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Last Error:</strong></p>
              <pre style="color: #e74c3c;">${data.error}</pre>
            </div>
            <p><strong>Job ID:</strong> ${data.jobId}</p>
            <p>Please review the job configuration and fix any issues before retrying.</p>
          </div>
        `,
      },
    };

    return templates[type] || {
      subject: `[Chronos] Notification`,
      text: JSON.stringify(data),
      html: `<pre>${JSON.stringify(data, null, 2)}</pre>`,
    };
  }

  /**
   * Send job failure notification
   */
  async notifyJobFailed(userId, jobId, jobName, executionId, error, attempts) {
    return this.notify(userId, 'job_failed', {
      jobId,
      jobName,
      executionId,
      error,
      attempts,
    });
  }

  /**
   * Send job completion notification
   */
  async notifyJobCompleted(userId, jobId, jobName, executionId, duration) {
    return this.notify(userId, 'job_completed', {
      jobId,
      jobName,
      executionId,
      duration,
    });
  }

  /**
   * Send job retry notification
   */
  async notifyJobRetry(userId, jobId, jobName, attempt, maxRetries, error) {
    return this.notify(userId, 'job_retry', {
      jobId,
      jobName,
      attempt,
      maxRetries,
      error,
    });
  }

  /**
   * Send max retries exceeded notification
   */
  async notifyMaxRetriesExceeded(userId, jobId, jobName, maxRetries, error) {
    return this.notify(userId, 'max_retries_exceeded', {
      jobId,
      jobName,
      maxRetries,
      error,
    });
  }
}

module.exports = new NotificationService();

