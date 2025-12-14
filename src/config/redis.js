const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

// Create Redis connection for BullMQ
const createRedisConnection = () => {
  const connection = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  connection.on('connect', () => {
    logger.info('✅ Redis connection established');
  });

  connection.on('error', (error) => {
    logger.error('❌ Redis connection error:', error);
  });

  connection.on('close', () => {
    logger.warn('⚠️ Redis connection closed');
  });

  return connection;
};

// Create a shared Redis connection
const redisConnection = createRedisConnection();

module.exports = { redisConnection, createRedisConnection };

