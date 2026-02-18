export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/shared", "<rootDir>/src", "<rootDir>/webview-src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  testPathIgnorePatterns: ["/node_modules/", "/out/", "/webview/"],
  // Avoid picking up compiled manual mocks from the build output
  modulePathIgnorePatterns: ["/out/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "shared/**/*.ts",
    "src/**/*.ts",
    "webview-src/**/*.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/generated/**",
    "!**/__tests__/**",
    "!**/*.test.ts",
  ],
  moduleNameMapper: {
    "^shared/(.*)$": "<rootDir>/shared/$1",
  },
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "test-results",
        outputName: "jest-junit.xml",
        classNameTemplate: "{filename}",
        titleTemplate: "{title}",
      },
    ],
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.mjs"],
  projects: [
    {
      displayName: "webview",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/webview-src/**/*.test.ts"],
      testPathIgnorePatterns: ["/node_modules/", "/out/", "/webview/"],
      modulePathIgnorePatterns: ["/out/"],
      preset: "ts-jest",
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            tsconfig: "tsconfig.webview-test.json",
          },
        ],
      },
      moduleNameMapper: {
        "^shared/(.*)$": "<rootDir>/shared/$1",
      },
    },
    {
      displayName: "extension",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/**/*.test.ts"],
      testPathIgnorePatterns: ["/node_modules/", "/out/", "/webview/"],
      modulePathIgnorePatterns: ["/out/"],
      preset: "ts-jest",
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            tsconfig: "tsconfig.extension-test.json",
          },
        ],
      },
      moduleNameMapper: {
        "^shared/(.*)$": "<rootDir>/shared/$1",
        "^vscode$": "<rootDir>/src/__mocks__/vscode.ts",
      },
    },
    {
      displayName: "shared",
      testEnvironment: "node",
      testMatch: ["<rootDir>/shared/**/*.test.ts"],
      testPathIgnorePatterns: ["/node_modules/", "/out/", "/webview/"],
      modulePathIgnorePatterns: ["/out/"],
      preset: "ts-jest",
      transform: {
        "^.+\\.ts$": [
          "ts-jest",
          {
            tsconfig: "tsconfig.shared-test.json",
          },
        ],
      },
      moduleNameMapper: {
        "^vscode$": "<rootDir>/src/__mocks__/vscode.ts",
      },
    },
  ],
};
