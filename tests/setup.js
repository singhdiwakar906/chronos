// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Global test utilities
global.testUtils = {
  generateTestUser: () => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    isActive: true,
    notificationPreferences: {
      email: true,
      jobFailure: true,
      jobSuccess: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  generateTestJob: (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174001',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Job',
    description: 'A test job',
    type: 'http',
    status: 'active',
    scheduleType: 'immediate',
    payload: {
      url: 'https://api.example.com/test',
      method: 'GET',
    },
    maxRetries: 3,
    retryDelay: 5000,
    timeout: 30000,
    priority: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
};
