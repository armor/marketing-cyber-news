/**
 * Test Environment Setup
 * Initializes MSW and other test infrastructure
 */

import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '../src/mocks/handlers/index';

/**
 * MSW Node server for non-browser testing environments
 */
export const server = setupServer(...handlers);

/**
 * Start MSW server before all tests
 * Use 'warn' instead of 'error' for WebSocket connections
 */
beforeAll(() => {
  server.listen({
    onUnhandledRequest: (req) => {
      // Ignore WebSocket upgrade requests
      if (req.url.includes('ws://') || req.url.includes('wss://')) {
        return;
      }
      console.error(`Unhandled ${req.method} request to ${req.url}`);
    }
  });
});

/**
 * Reset handlers after each test
 */
afterEach(() => {
  server.resetHandlers();
});

/**
 * Stop MSW server after all tests
 */
afterAll(() => {
  server.close();
});
