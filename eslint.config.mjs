import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import vitest from "@vitest/eslint-plugin";
import jsdoc from "eslint-plugin-jsdoc";
import tsdoc from "eslint-plugin-tsdoc";
import globals from "globals";

/** The most lines that the callback of a single test may have. */
const MAX_LINES_PER_TEST = 50;

/**
 * Limits the length of single tests: the callbacks of `test()`, `test.each()` and the like.
 * `max-lines-per-function` cannot do this, because it also counts the `describe` callbacks that hold the tests.
 */
const maxLinesPerTest = {
  meta: {
    type: "suggestion",
    messages: { tooLong: "Test has {{lines}} lines. Maximum allowed is {{max}}." },
    schema: [],
  },
  create(context) {
    const isTestCall = (callee) => {
      let node = callee;
      while (node.type === "CallExpression" || node.type === "MemberExpression") {
        node = node.type === "CallExpression" ? node.callee : node.object;
      }
      return node.type === "Identifier" && node.name === "test";
    };
    return {
      CallExpression(node) {
        if (!isTestCall(node.callee)) return;
        const callback = node.arguments.find(
          (arg) => arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression"
        );
        if (!callback) return;
        const lines = callback.loc.end.line - callback.loc.start.line + 1;
        if (lines > MAX_LINES_PER_TEST) {
          context.report({ node: callback, messageId: "tooLong", data: { lines, max: MAX_LINES_PER_TEST } });
        }
      },
    };
  },
};

/** The most lines that a conditional expression (`a ? b : c`) may span. */
const MAX_TERNARY_LINES = 3;

/**
 * Limits conditional expressions to a few lines; a longer one is easier to read as `if`/`else`
 * (see "Code quality" in docs/development-guidelines.md).
 */
const maxTernaryLines = {
  meta: {
    type: "suggestion",
    messages: {
      tooLong: "Conditional expression spans {{lines}} lines. Maximum allowed is {{max}}; use if/else instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      ConditionalExpression(node) {
        const lines = node.loc.end.line - node.loc.start.line + 1;
        if (lines > MAX_TERNARY_LINES) {
          context.report({ node, messageId: "tooLong", data: { lines, max: MAX_TERNARY_LINES } });
        }
      },
    };
  },
};

// Prettier formats the code; no rule here clashes with it (see "Formatting" in
// docs/build-and-packaging.md). The command-line check of eslint-config-prettier
// only names no-unexpected-multiline of the recommended rules, which it cannot
// check automatically. It stays on, because it reports statements that a missing
// semicolon joins with the next line.
/**
 * Forbids `unknown` in type assertions (`x as unknown`) and in variable-type annotations (`const x: unknown`).
 * Both are escape hatches that bypass type safety. Function-parameter and interface-field annotations are
 * not targeted by these selectors. If genuinely unavoidable, add eslint-disable-next-line with a
 * justification.
 */
const NO_UNKNOWN_CASTS = {
  selector:
    'TSAsExpression[typeAnnotation.type="TSUnknownKeyword"], VariableDeclarator[id.typeAnnotation.typeAnnotation.type="TSUnknownKeyword"]',
  message:
    "Avoid `unknown` in type assertions and variable-type annotations. If unavoidable, add eslint-disable-next-line with a justification.",
};

/**
 * Forbids tests to build schemas themselves: they take them from the helpers in `__tests__/`, which parse
 * XSD text, so that the schema objects are what the editor gets from a file (see "Expected results" in
 * docs/testing.md). The helpers themselves are not test files and may build schemas.
 */
const NO_HAND_BUILT_SCHEMAS = {
  selector:
    'NewExpression[callee.name="schema"], TSAsExpression[typeAnnotation.typeName.name="schema"], TSTypeAssertion[typeAnnotation.typeName.name="schema"]',
  message:
    "Take test schemas from the helpers (emptySchema(), schemaWith(), webviewSchemaWith(), …) instead of building or casting them.",
};

/** The project boundaries: which folders the code of a folder must not import. */
const PROJECT_BOUNDARIES = [
  { folder: "shared", allowed: "shared", forbidden: ["src", "webview-src", "test", "scripts"] },
  { folder: "src", allowed: "its own code and shared", forbidden: ["webview-src", "test", "scripts"] },
  { folder: "webview-src", allowed: "its own code and shared", forbidden: ["src", "test", "scripts"] },
  { folder: "scripts", allowed: "its own code", forbidden: ["src", "webview-src", "shared", "test"] },
];

/**
 * Returns the pattern of `no-restricted-imports` that enforces a project boundary.
 *
 * @param {{ folder: string, allowed: string, forbidden: string[] }} boundary - The boundary of a folder
 * @returns {{ regex: string, message: string }} The pattern
 */
function boundaryPattern({ folder, allowed, forbidden }) {
  return {
    regex: `^(\\.\\./)+(${forbidden.join("|")})(/|$)`,
    message: `Code in ${folder} may only import ${allowed} (see "Project boundaries" in docs/development-guidelines.md).`,
  };
}

export default defineConfig([
  globalIgnores([
    "out/",
    "webview/",
    "coverage/",
    "test-results/",
    ".vscode-test/",
    "node_modules/",
    "**/generated/**",
  ]),
  // Allow only .ts and .mjs files: the package is an ES module, so .js would be ambiguous, and .cjs,
  // .mts and .cts are not needed. Without this block, ESLint would skip .mts and .cts files, because
  // no other block matches them.
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tsparser,
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message:
            "Only TypeScript (.ts) and ES module (.mjs) files are allowed; .js, .cjs, .mts and .cts files are not.",
        },
      ],
    },
  },
  // JavaScript modules, such as this file and .vscode-test.mjs
  {
    files: ["**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  // TypeScript, with the recommended rules of ESLint and the strict and stylistic rules of
  // typescript-eslint that need type information. The project service takes it from the projects
  // that tsconfig.json references. Among the rules, no-unnecessary-condition reports checks that the
  // types make unnecessary, such as `x ?? []` on an array that is never undefined.
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs["flat/strict-type-checked"],
      tseslint.configs["flat/stylistic-type-checked"],
    ],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      jsdoc,
      tsdoc,
      style: { rules: { "max-ternary-lines": maxTernaryLines } },
    },
    settings: {
      jsdoc: { mode: "typescript" },
    },
    rules: {
      // Long conditional expressions are written as if/else (see "Code quality" in docs/development-guidelines.md)
      "style/max-ternary-lines": "error",
      // TSDoc (see "TSDoc" in docs/development-guidelines.md): tsdoc/syntax checks the syntax of the
      // comments, the rules of jsdoc check that functions, methods and classes have them, with every
      // parameter, the return value and the errors thrown.
      "tsdoc/syntax": "error",
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: false,
          require: {
            ArrowFunctionExpression: false,
            ClassDeclaration: true,
            FunctionDeclaration: true,
            FunctionExpression: false,
            MethodDefinition: true,
          },
        },
      ],
      // Destructured parameters are described at their type, because TSDoc has no dotted parameter
      // names such as `options.name`.
      "jsdoc/require-param": ["error", { checkDestructured: false }],
      "jsdoc/check-param-names": ["error", { checkDestructured: false }],
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-check": "error",
      "jsdoc/require-throws": "error",
      // Size limits (see "Code size" in docs/development-guidelines.md). Blank lines and comments count as well.
      "max-lines": ["error", { max: 500 }],
      "max-lines-per-function": ["error", { max: 120 }],
      // Unused code within a file is found by ESLint, not by TypeScript's noUnusedLocals. The rules of
      // typescript-eslint replace those of ESLint: they understand types, and the rule for private
      // members also finds members declared with TypeScript's `private`, not only `#private` ones.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-unused-private-class-members": "off",
      "@typescript-eslint/no-unused-private-class-members": "error",
      // Numbers in messages are fine; other types, such as undefined, are not. The options of the
      // strict preset are repeated, because options given here replace them.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "error",
      // A `default` branch counts as handling the other cases; a switch without one must list them all.
      "@typescript-eslint/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      // T[] for simple element types, Array<…> and ReadonlyArray<…> for complex ones, which would need
      // parentheses otherwise, such as Array<keyof T> instead of (keyof T)[].
      "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
      // No casts to `unknown` (see NO_UNKNOWN_CASTS)
      "no-restricted-syntax": ["error", NO_UNKNOWN_CASTS],
      // Off until the move to xmlbind-ts 3 (#444), which turns it on again. The webview receives the
      // schema as JSON, which has no classes, so it reads plain objects typed as the generated classes,
      // and the executors and the tests build such objects as literals.
      "@typescript-eslint/no-unsafe-class-instance-assignment": "off",
    },
  },
  // Vitest tests, their helpers and mocks (must come before webview config to avoid conflicts)
  {
    files: ["**/*.test.ts", "**/*.test-d.ts", "**/__tests__/**/*.ts", "**/__mocks__/**/*.ts"],
    ignores: ["test/extension-host/**"],
    extends: [vitest.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.browser,
      },
    },
    rules: {
      // Assertion helpers start with expect or contain Expect (see "Mocks and helpers" in docs/testing.md)
      "vitest/expect-expect": ["warn", { assertFunctionNames: ["expect*", "runCommandExpect*"] }],
      // Vitest takes a message as second argument of expect(); the other options of the recommended
      // setting stay as they are.
      "vitest/valid-expect": ["error", { maxArgs: 2 }],
      // Test cases use test(), as in the extension host, where Mocha's TDD interface has no it().
      // The defaults require it() inside describe(). Setting fn alone would be enough, because
      // withinDescribe then takes its value, but both are set to make the intent obvious.
      "vitest/consistent-test-it": ["error", { fn: "test", withinDescribe: "test" }],
      // Test names describe the intended behavior: test("should …") (see "Files and structure" in docs/testing.md).
      // The other options of the recommended setting stay as they are.
      "vitest/valid-title": ["error", { mustMatch: { test: "^should " } }],
      // Vitest provides its API as globals (globals: true in vitest.config.ts).
      "vitest/no-importing-vitest-globals": "error",
      // Empty mock implementations, such as mockImplementation(() => {}), are intended.
      "@typescript-eslint/no-empty-function": ["error", { allow: ["arrowFunctions"] }],
      // vitest/unbound-method replaces @typescript-eslint/unbound-method in tests;
      // it correctly handles mock functions that don't rely on `this` binding.
      "vitest/unbound-method": "error",
      "@typescript-eslint/unbound-method": "off",
    },
  },
  // Type tests check that a payload without a required field no longer fits, such as
  // Omit<RemoveElementPayload, "elementId">. For a payload with one field, that type is {} on purpose.
  {
    files: ["**/*.test-d.ts"],
    rules: {
      "@typescript-eslint/no-generated-empty-object-type": "off",
    },
  },
  // Size limits and non-null assertions of all test files, those of Vitest and those in the extension host
  // (see "Code size" in docs/development-guidelines.md). max-lines-per-function would count the describe() and suite()
  // callbacks that hold the tests, so the local rule tests/max-lines-per-test limits the single tests
  // instead. Test helpers and mocks keep the limits of other code.
  {
    files: ["**/*.test.ts", "**/*.test-d.ts"],
    plugins: {
      tests: { rules: { "max-lines-per-test": maxLinesPerTest } },
    },
    rules: {
      "max-lines": ["error", { max: 1000 }],
      "max-lines-per-function": "off",
      "tests/max-lines-per-test": "error",
      // A test may assert with ! that a value exists: if it does not, the test fails (see "TypeScript" in
      // docs/development-guidelines.md). Test helpers and mocks check their values like other code.
      "@typescript-eslint/no-non-null-assertion": "off",
      // The options replace those of the TypeScript files, so the ban on casts to `unknown` is repeated
      "no-restricted-syntax": ["error", NO_UNKNOWN_CASTS, NO_HAND_BUILT_SCHEMAS],
    },
  },
  // Tests in the extension host: Mocha (TDD interface) and the mock webview, which runs in the browser
  {
    files: ["test/extension-host/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.browser,
      },
    },
  },
  // Project boundaries (see "Project boundaries" in docs/development-guidelines.md): `shared` uses only
  // `shared`; `src` and `webview-src` use only their own code and `shared`; `scripts` uses only
  // `scripts`. Only the tests in `test/integration` may use the extension host and the webview together.
  ...PROJECT_BOUNDARIES.map((boundary) => ({
    files: [`${boundary.folder}/**/*.ts`],
    rules: {
      "no-restricted-imports": ["error", { patterns: [boundaryPattern(boundary)] }],
    },
  })),
  // Tests of the webview get the schema in the form the webview receives it, through JSON (see "Schema
  // objects on both sides" in docs/architecture/006-module-structure.md). The rule repeats the project
  // boundary, because a later setting of a rule replaces an earlier one.
  {
    files: ["webview-src/**/*.test.ts", "webview-src/__tests__/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@neumaennl/xmlbind-ts",
              importNames: ["unmarshal"],
              message:
                "Use webviewSchemaFromXml() from shared/__tests__/schemaTestHelpers, which sends the schema through JSON.",
            },
          ],
          patterns: [
            boundaryPattern(PROJECT_BOUNDARIES.find(({ folder }) => folder === "webview-src")),
            {
              regex: "shared/__tests__/schemaTestHelpers$",
              importNames: ["schemaWith", "emptySchema", "schemaWithAttrGroups", "schemaWithIncludes"],
              message: "Use webviewSchemaWith() or asReceivedByWebview(), which send the schema through JSON.",
            },
          ],
        },
      ],
    },
  },
  // Webview TypeScript files configuration (browser environment)
  {
    files: ["webview-src/**/*.ts"],
    ignores: ["**/*.test.ts", "**/__mocks__/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
]);
