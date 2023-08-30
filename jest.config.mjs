/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s'],
  moduleNameMapper: {
    '^(\\..*)\\.js$': '$1',
  },
  moduleFileExtensions: ['js', 'ts'],
  transform: {
    '.ts': [
      'ts-jest',
      { tsconfig: 'jest.tsconfig.json', isolatedModules: true, useESM: true },
    ],
  },
}
