/**
 * Jest test environment setup
 *
 * - Stubs environment variables so services don't crash on import
 * - Provides shared test helpers
 * - Closes any open handles after all tests
 */

// Minimal env vars required by services that read process.env at import time
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.TERRAFORM_WORKING_DIR = '/tmp/zlaws_test_deployments';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Silence Winston logger output during tests
jest.mock('../services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  deployment: jest.fn(),
  security: jest.fn(),
}));

// Mock WebSocket server (no real socket.io in unit tests)
jest.mock('../config/websocketServer', () => ({
  emitDeploymentUpdate: jest.fn(),
  emitLog: jest.fn(),
  emitPhaseUpdate: jest.fn(),
  emitProgressUpdate: jest.fn(),
  emitCompletion: jest.fn(),
  emitFailure: jest.fn(),
}));

// Note: afterAll is not available in setupFiles; Jest handles cleanup automatically.
