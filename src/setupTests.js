import '@testing-library/jest-dom';
import React from 'react';

// Mock framer-motion to avoid IntersectionObserver dependency in jsdom
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: React.forwardRef(({ children, whileInView, initial, animate, variants, viewport, ...props }, ref) =>
        React.createElement('div', { ref, ...props, 'data-motion': 'div' }, children)
      ),
      p: React.forwardRef((props, ref) => React.createElement('p', { ref, ...props }, props.children)),
      span: React.forwardRef((props, ref) => React.createElement('span', { ref, ...props }, props.children)),
      h2: React.forwardRef((props, ref) => React.createElement('h2', { ref, ...props }, props.children)),
      h3: React.forwardRef((props, ref) => React.createElement('h3', { ref, ...props }, props.children)),
      section: React.forwardRef((props, ref) => React.createElement('section', { ref, ...props }, props.children)),
      button: React.forwardRef((props, ref) => React.createElement('button', { ref, ...props }, props.children)),
      a: React.forwardRef((props, ref) => React.createElement('a', { ref, ...props }, props.children)),
      ul: React.forwardRef((props, ref) => React.createElement('ul', { ref, ...props }, props.children)),
      li: React.forwardRef((props, ref) => React.createElement('li', { ref, ...props }, props.children)),
    },
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
    useInView: () => [null, true],
    useAnimation: () => ({ start: () => {}, set: () => {} }),
  };
});

// Complete IntersectionObserver polyfill for JSDOM environment
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
global.IntersectionObserverEntry = class {};
if (typeof window !== 'undefined') {
  window.IntersectionObserver = global.IntersectionObserver;
  window.IntersectionObserverEntry = global.IntersectionObserverEntry;
}