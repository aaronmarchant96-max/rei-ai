import '@testing-library/jest-dom';

// Simple IntersectionObserver polyfill for JSDOM environment
class IntersectionObserver {
  constructor(callback, options) {}
  observe(target) {}
  unobserve(target) {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  window.IntersectionObserver = IntersectionObserver;
} else if (typeof global !== 'undefined') {
  global.IntersectionObserver = IntersectionObserver;
}
