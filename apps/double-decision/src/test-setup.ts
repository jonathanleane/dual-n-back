import '@testing-library/jest-dom/vitest';

// Node v26 exposes localStorage/sessionStorage as undefined globals, which
// prevents vitest/jsdom from injecting its own implementations. Pull them
// off the jsdom window if the globals aren't already defined.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsdomWindow = (globalThis as any).jsdom?.window;
if (typeof localStorage === 'undefined' && jsdomWindow) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomWindow.localStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: jsdomWindow.sessionStorage,
    writable: true,
    configurable: true,
  });
}
