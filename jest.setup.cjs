require("@testing-library/jest-dom");

const { TextDecoder, TextEncoder } = require("node:util");

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

// IntersectionObserver polyfill (still needed for any remaining code that uses it)
global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
global.IntersectionObserverEntry = class {};

// scrollIntoView no-op (jsdom doesn't implement it; AppShell Ecosystem nav scrolls)
if (typeof window !== "undefined" && window.HTMLElement) {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}
