module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!src/workers/**/*.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  // Setup file is optional
  setupFilesAfterEnv: [],
  // Clear mocks between tests
  clearMocks: true,
  // Ignore node_modules
  testPathIgnorePatterns: ['/node_modules/'],
};
