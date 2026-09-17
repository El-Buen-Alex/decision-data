module.exports = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // e2e/ holds Playwright specs (run via `npx playwright test`), not Jest unit tests.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  moduleNameMapper: {
    // Mirrors the "@/*" path alias from tsconfig.json, which ts-jest does not
    // resolve on its own.
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    // tsconfig.json sets jsx: "preserve" for Next.js' own SWC pipeline, which
    // ts-jest never runs, so tests get raw JSX syntax. Override to react-jsx
    // only for the Jest transform so ts-jest emits executable JS.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
};
