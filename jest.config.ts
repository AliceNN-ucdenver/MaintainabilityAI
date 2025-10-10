import type {Config} from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/examples'],
  moduleFileExtensions: ['ts','js','json'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
};

export default config;
