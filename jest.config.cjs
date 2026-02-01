const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/test/**/*.test.js"],
};

module.exports = createJestConfig(customJestConfig);
