/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleDirectories: [
    "node_modules",
    "src",
    "client-wasm/pkg"
  ],
  modulePaths: [
    "src",
    "node_modules",
    "client-wasm/pkg"
  ],
  moduleFileExtensions: [
    "js",
    "jsx",
    "ts",
    "d.ts",
    "wasm"
  ],
  modulePathIgnorePatterns: [
    "src/e2e"
  ],
};