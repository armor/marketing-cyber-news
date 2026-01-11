/**
 * Mock Handlers Index
 * Re-exports all MSW handlers
 */

import { authHandlers } from './auth';
import { dashboardHandlers } from './dashboard';
import { threatsHandlers } from './threats';
import { bookmarkHandlers } from './bookmarks';
import { adminHandlers } from './admin';
import { approvalHandlers } from './approvals';
import { newsletterHandlers } from './newsletter';
import { channelHandlers } from './channels';
import { marketingHandlers } from './marketing';
import { voiceHandlers } from './voice';

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...threatsHandlers,
  ...bookmarkHandlers,
  ...adminHandlers,
  ...approvalHandlers,
  ...newsletterHandlers,
  ...channelHandlers,
  ...marketingHandlers,
  ...voiceHandlers,
];
