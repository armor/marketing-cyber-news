/**
 * Mock Handlers Index
 * Re-exports all MSW handlers
 */

import { authHandlers } from './auth';
import { dashboardHandlers } from './dashboard';
import { threatsHandlers } from './threats';
import { bookmarkHandlers } from './bookmarks';
import { adminHandlers } from './admin';

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...threatsHandlers,
  ...bookmarkHandlers,
  ...adminHandlers,
];
