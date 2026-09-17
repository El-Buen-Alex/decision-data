module.exports = {
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    // tsconfig.json sets jsx: "preserve" for Next.js' own SWC pipeline, which
    // ts-jest never runs, so tests get raw JSX syntax. Override to react-jsx
    // only for the Jest transform so ts-jest emits executable JS.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
};
