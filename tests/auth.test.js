const request = require('supertest');

// Mock the database before requiring the app
jest.mock('../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn().mockResolvedValue(true),
    define: jest.fn(),
  },
  connectDatabase: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/models', () => ({
  User: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Job: {},
  JobExecution: {},
  JobLog: {},
}));

jest.mock('../src/config/redis', () => ({
  redisConnection: {
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
  },
  createRedisConnection: jest.fn(),
}));

const express = require('express');
const authRoutes = require('../src/routes/auth');
const { errorHandler } = require('../src/middleware/errorHandler');

describe('Auth API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    // Add error handler middleware
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        details: err.details || null,
      });
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should require email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          password: 'SecurePass123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require valid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require password with minimum 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require name with minimum 2 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'A',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should require email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'SecurePass123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});

describe('Helper Functions', () => {
  const helpers = require('../src/utils/helpers');

  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(helpers.formatDuration(500)).toBe('500ms');
      expect(helpers.formatDuration(1500)).toBe('1.50s');
      expect(helpers.formatDuration(90000)).toBe('1.50m');
      expect(helpers.formatDuration(5400000)).toBe('1.50h');
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty values', () => {
      expect(helpers.isEmpty(null)).toBe(true);
      expect(helpers.isEmpty(undefined)).toBe(true);
      expect(helpers.isEmpty('')).toBe(true);
      expect(helpers.isEmpty('   ')).toBe(true);
      expect(helpers.isEmpty([])).toBe(true);
      expect(helpers.isEmpty({})).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(helpers.isEmpty('hello')).toBe(false);
      expect(helpers.isEmpty([1, 2, 3])).toBe(false);
      expect(helpers.isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('percentage', () => {
    it('should calculate percentage correctly', () => {
      expect(helpers.percentage(50, 100)).toBe(50);
      expect(helpers.percentage(25, 100)).toBe(25);
      expect(helpers.percentage(1, 3, 2)).toBe(33.33);
    });

    it('should return 0 when total is 0', () => {
      expect(helpers.percentage(10, 0)).toBe(0);
    });
  });

  describe('paginate', () => {
    it('should paginate array correctly', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const result = helpers.paginate(arr, 1, 3);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.pages).toBe(4);

      const result2 = helpers.paginate(arr, 2, 3);
      expect(result2.data).toEqual([4, 5, 6]);
    });
  });

  describe('randomString', () => {
    it('should generate random string of specified length', () => {
      const str = helpers.randomString(16);
      expect(str.length).toBe(16);
    });

    it('should generate different strings each time', () => {
      const str1 = helpers.randomString(32);
      const str2 = helpers.randomString(32);
      expect(str1).not.toBe(str2);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      expect(helpers.safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    });

    it('should return fallback for invalid JSON', () => {
      expect(helpers.safeJsonParse('invalid', {})).toEqual({});
      expect(helpers.safeJsonParse('invalid', null)).toBe(null);
    });
  });

  describe('sleep', () => {
    it('should wait for specified duration', async () => {
      const start = Date.now();
      await helpers.sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95);
    });
  });
});
