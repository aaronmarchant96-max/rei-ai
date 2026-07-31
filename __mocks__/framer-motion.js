const React = require("react");

const makeEl = (tag) =>
  React.forwardRef(({ children, ...props }, ref) =>
    React.createElement(tag, { ref, ...props }, children)
  );

const motion = new Proxy(
  {},
  {
    get: (_, tag) => makeEl(tag),
  }
);

module.exports = {
  motion,
  AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
  useInView: () => [null, true],
  useAnimation: () => ({ start: () => {}, set: () => {} }),
  useScroll: () => ({ scrollY: { get: () => 0 }, scrollYProgress: { get: () => 0 } }),
  useTransform: () => ({ get: () => 0 }),
  LayoutGroup: ({ children }) => React.createElement(React.Fragment, null, children),
};
