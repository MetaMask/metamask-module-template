module.exports = {
  collectCoverage: true,
  coverageReporters: ['text', 'html'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  preset: 'ts-jest',
  resetMocks: true,
  restoreMocks: true,
  testEnvironment: 'node',
  testRegex: ['\\.test\\.(ts|js)$'],
  testTimeout: 2500,
};
