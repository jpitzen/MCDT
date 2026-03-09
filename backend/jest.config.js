module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/migrations/**',
    '!src/models/index.js',
    '!src/__tests__/setup.js',
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  setupFiles: ['<rootDir>/src/__tests__/setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/__tests__/setup.js'],
  // Increase timeout for integration tests
  testTimeout: 15000,
};
