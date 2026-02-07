export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Mocks pour les services (AVANT le stripping .js)
    '^(.*)/services/email\\.js$': '<rootDir>/src/services/__mocks__/email.ts',
    '^(.*)/services/s3\\.js$': '<rootDir>/src/services/__mocks__/s3.ts',
    // Mock pdf-lib
    '^pdf-lib$': '<rootDir>/src/__tests__/__mocks__/pdf-lib.ts',
    // Strip .js pour les autres imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFiles: ['<rootDir>/src/__tests__/setup-mocks.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 30000,
};