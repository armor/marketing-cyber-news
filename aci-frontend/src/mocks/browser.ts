/**
 * MSW Browser Worker
 * Mock Service Worker setup for browser environment
 *
 * To enable MSW in development:
 * 1. Set VITE_ENABLE_MSW=true in .env.local
 * 2. Add to main.tsx before rendering:
 *
 * if (import.meta.env.VITE_ENABLE_MSW === 'true') {
 *   const { worker } = await import('./mocks/browser');
 *   await worker.start({ onUnhandledRequest: 'bypass' });
 * }
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Browser worker for intercepting HTTP requests
 */
export const worker = setupWorker(...handlers);
