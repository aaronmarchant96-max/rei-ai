module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleFileExtensions: ["js", "jsx", "json"],
  testMatch: ["<rootDir>/src/**/*.test.[jt]s?(x)", "<rootDir>/api/**/*.test.[jt]s?(x)"],
  clearMocks: true,
  transformIgnorePatterns: [
    "node_modules/(?!(@xenova/transformers)/)",
  ],
  bail: false,
  testTimeout: 10000,
  verbose: true,
  moduleNameMapper: {
    "\\.css$": "identity-obj-proxy",
    "\\.(png|jpg|jpeg|gif|svg)$": "<rootDir>/__mocks__/fileMock.js",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  coverageThreshold: {
    "./src/CardoGuard.jsx": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "./src/lib/cardoGuard.js": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
