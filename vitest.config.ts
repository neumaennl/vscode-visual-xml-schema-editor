import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

/** Replaces the `vscode` module, which only exists in the extension host, with the mock. */
const vscodeMock = { find: /^vscode$/, replacement: `${root}src/__mocks__/vscode.ts` };

/**
 * In GitHub Actions: annotations at the lines of failing tests. The job summary comes
 * from the report step in ci.yml, so Vitest's own summary is off.
 */
const githubActionsReporter: ["github-actions", { jobSummary: { enabled: boolean } }] = [
  "github-actions",
  { jobSummary: { enabled: false } },
];

// Tests that run inside VS Code (extension-host tests) do not belong to any of these
// projects. They live in `test/extension-host/`, which no project includes, and run
// with `npm run test:extension-host`.
export default defineConfig({
  test: {
    globals: true,
    reporters: [
      "default",
      [
        "junit",
        {
          outputFile: "test-results/vitest-junit.xml",
          suiteNameTemplate: "{title}",
          classnameTemplate: "{basename}",
          titleTemplate: "{title}",
          includeConsoleOutput: false,
        },
      ],
      ...(process.env.GITHUB_ACTIONS === "true" ? [githubActionsReporter] : []),
    ],
    coverage: {
      provider: "v8",
      include: ["shared/**/*.ts", "src/**/*.ts", "webview-src/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/generated/**",
        "**/__tests__/**",
        "**/__mocks__/**",
        "**/*.test.ts",
      ],
      reporter: ["text", "json-summary", "json", "html"],
      // A run below these values fails. Branches are at 70% only until the editor's code has the
      // tests it lacks; Phase 9 of #340 then raises all four to 85%.
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
    projects: [
      {
        extends: true,
        resolve: { alias: [vscodeMock] },
        test: { name: "extension", environment: "node", include: ["src/**/*.test.ts"] },
      },
      {
        extends: true,
        resolve: { alias: [vscodeMock] },
        test: { name: "shared", environment: "node", include: ["shared/**/*.test.ts"] },
      },
      {
        extends: true,
        test: { name: "webview", environment: "jsdom", include: ["webview-src/**/*.test.ts"] },
      },
      {
        extends: true,
        test: { name: "scripts", environment: "node", include: ["scripts/**/*.test.ts"] },
      },
    ],
  },
});
