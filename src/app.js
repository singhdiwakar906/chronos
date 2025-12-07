require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { connectDatabase } = require('./config/database');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
if (config.server.env !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// API routes
app.use(config.server.apiPrefix, routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Chronos Job Scheduler',
    version: '1.0.0',
    api: config.server.apiPrefix,
    documentation: `${config.server.apiPrefix}/docs`,
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    const server = app.listen(config.server.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⏰ CHRONOS JOB SCHEDULER                                    ║
║                                                               ║
║   Environment: ${config.server.env.padEnd(43)}║
║   Port: ${config.server.port.toString().padEnd(50)}║
║   API: ${config.server.apiPrefix.padEnd(51)}║
║                                                               ║
║   Ready to schedule your jobs!                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
      logger.info(`Server started on port ${config.server.port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;

