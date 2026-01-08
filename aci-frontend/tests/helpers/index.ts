/**
 * Centralized export of all test helpers
 *
 * Import all helpers from this single entry point:
 * ```typescript
 * import { loginAs, verifyApiCall, selectors, ConsoleMonitor } from './helpers';
 * ```
 */

// Selectors
export * from './selectors';
export type { Selectors, SelectorKey } from './selectors';

// API assertions (deep testing)
export {
  verifyApiCall,
  verifyPersistence,
  verifyValidationBlocks,
  verifyApiSequence,
  verifyNoNetworkErrors,
  captureApiResponse,
  verifyOptimisticUpdate,
} from './api-assertions';
export type { ApiCallExpectation } from './api-assertions';

// Console monitoring
export { ConsoleMonitor, createConsoleMonitor, withConsoleMonitor } from './console-monitor';
export type { ConsoleEntry } from './console-monitor';

// Test credentials
export {
  getTestCredentials,
  getCredentialsForRole,
  isRealBackend,
  isMockMode,
  getBaseUrl,
  getApiBaseUrl,
  validateRealBackendConfig,
  getTimeoutMultiplier,
  getDefaultTimeout,
  getNetworkTimeout,
  printTestConfig,
  testConfig,
  TEST_MODE,
} from './test-credentials';
export type { Credentials, TestCredentials, TestMode, UserRole } from './test-credentials';

// Authentication
export {
  loginAs,
  login,
  logout,
  clearAuthState,
  isAuthenticated,
  getCurrentUser,
  getAuthToken,
  setAuthToken,
  attemptInvalidLogin,
  testLoginValidation,
  register,
  waitForAuthentication,
  ensureLoggedIn,
} from './auth';
export type { LoginResult } from './auth';

// Backend Authentication (real backend, no mocks)
export {
  authenticateBackend,
  authenticateWithCredentials,
  authenticateViaApi,
  logoutBackend,
  clearBackendAuthState,
  isBackendAuthenticated,
  getCurrentBackendUser,
  ensureBackendLoggedIn,
  verifyUserRole,
  getBackendCredentials,
  getAvailableRoles,
  getAllBackendCredentials,
  attemptInvalidBackendLogin,
  BACKEND_CREDENTIALS,
  ROLE_ALIASES,
} from './backend-auth';
export type { BackendRole, BackendCredentials, AuthenticatedSession } from './backend-auth';

// Backend Setup (health checks, test data verification)
export {
  checkBackendHealth,
  waitForBackend,
  ensureBackendReady,
  verifyTestDataSeeded,
  ensureTestDataSeeded,
  setupPageForBackend,
  cleanupTestData,
  verifyApiEndpoints,
  ensureApiEndpointsAvailable,
  fullBackendSetup,
  API_URL,
  HEALTH_CHECK_TIMEOUT,
  REQUIRED_ENDPOINTS,
} from './backend-setup';
export type { BackendHealth, TestDataStatus } from './backend-setup';
