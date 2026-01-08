import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Only setup browser mocks if running in browser environment
if (typeof window !== 'undefined') {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });

  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
}

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as Response)
);

// Mock WebSocket (only in browser environment)
if (typeof window !== 'undefined') {
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.OPEN;
    onopen: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(public url: string) {}

    close(): void {
      this.readyState = MockWebSocket.CLOSED;
    }

    send(): void {}

    addEventListener(): void {}

    removeEventListener(): void {}
  }

  global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
}

// Suppress console errors/warnings in tests (optional)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn((...args) => {
    // Filter out React warnings and nested button errors (component implementation issues)
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
        args[0].includes('<button> cannot be a descendant of <button>') ||
        args[0].includes('<button> cannot contain a nested <button>'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });

  console.warn = vi.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') ||
        args[0].includes('MSW') ||
        args[0].includes('WebSocket'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
