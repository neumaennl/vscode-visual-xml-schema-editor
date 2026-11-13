import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stubFetch } from "../__tests__/releaseTestHelpers.ts";
import {
  baseUrl,
  editionProblems,
  findEditions,
  loadEdition,
  loadEditions,
  parseBaseEdition,
  readTarget,
  writeEdition,
} from "./compiler-target.ts";

const NODE24_BASE = {
  compilerOptions: { lib: ["es2024", "ESNext.Array", "ESNext.Promise"], module: "nodenext", target: "es2024" },
};

const EXTENSION_TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": [
      "ES2020"
    ],
    "strict": true
  }
}
`;

const WEBVIEW_TSCONFIG = `{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["es2020", "es2020.promise", "DOM"],
    "noEmit": true
  }
}
`;

const TEST_TSCONFIG = `{\r\n  "extends": "./tsconfig.extension.json",\r\n  "compilerOptions": { "types": ["node"] }\r\n}\r\n`;

const ESLINT_CONFIG = `export default [
  { languageOptions: { ecmaVersion: 2020 } },
  { languageOptions: { parserOptions: { ecmaVersion: 2020, sourceType: 'module' } } },
];
`;

let dir: string;

/**
 * Reads a file of the test folder.
 *
 * @param name - The file name
 * @returns The content
 */
function read(name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "compiler-target-"));
  writeFileSync(join(dir, "tsconfig.extension.json"), EXTENSION_TSCONFIG);
  writeFileSync(join(dir, "tsconfig.webview.json"), WEBVIEW_TSCONFIG);
  writeFileSync(join(dir, "tsconfig.extension-test.json"), TEST_TSCONFIG);
  writeFileSync(join(dir, "eslint.config.mjs"), ESLINT_CONFIG);
  writeFileSync(join(dir, "package.json"), '{ "target": "ES2020" }\n');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe("compiler-target", () => {
  describe("parseBaseEdition", () => {
    test("should return the target of the base in upper case", () => {
      expect(parseBaseEdition(JSON.stringify(NODE24_BASE), "node24.json")).toBe("ES2024");
    });

    test.each([
      ["no JSON", "{ // comment", "node24.json: not valid JSON."],
      ["no target", "{}", "node24.json: expected a target ESxxxx, found undefined."],
      ["a target that is not an edition", '{ "compilerOptions": { "target": "esnext" } }', 'node24.json: expected a target ESxxxx, found "esnext".'],
    ])("should throw for %s", (_case, text, message) => {
      expect(() => parseBaseEdition(text, "node24.json")).toThrow(message);
    });
  });

  describe("loadEdition", () => {
    test("should download the edition of the base for the Node major version", async () => {
      stubFetch({ [baseUrl(24)]: JSON.stringify(NODE24_BASE) });

      await expect(loadEdition(24)).resolves.toBe("ES2024");
    });

    test("should return undefined if there is no base for the version", async () => {
      stubFetch({});

      await expect(loadEdition(99)).resolves.toBeUndefined();
    });

    test("should throw if the request fails for another reason", async () => {
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: false, status: 500 })));

      await expect(loadEdition(24)).rejects.toThrow(`${baseUrl(24)}: HTTP 500`);
    });
  });

  describe("loadEditions", () => {
    test("should download each major version once", async () => {
      const fetchMock = stubFetch({ [baseUrl(24)]: JSON.stringify(NODE24_BASE) });

      const editions = await loadEditions([22, 24, 24]);

      expect(editions).toEqual(new Map([[22, undefined], [24, "ES2024"]]));
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("findEditions", () => {
    test("should find target, the ESxxxx entries of lib and ecmaVersion in the configurations", () => {
      expect(findEditions(dir)).toEqual([
        { file: "eslint.config.mjs", setting: "ecmaVersion", value: "ES2020" },
        { file: "eslint.config.mjs", setting: "ecmaVersion", value: "ES2020" },
        { file: "tsconfig.extension.json", setting: "target", value: "ES2020" },
        { file: "tsconfig.extension.json", setting: "lib", value: "ES2020" },
        { file: "tsconfig.webview.json", setting: "target", value: "ES2020" },
        { file: "tsconfig.webview.json", setting: "lib", value: "ES2020" },
      ]);
    });
  });

  describe("readTarget", () => {
    test("should return the target of a configuration in upper case", () => {
      expect(readTarget(join(dir, "tsconfig.webview.json"))).toBe("ES2020");
    });

    test("should throw if the configuration has no target", () => {
      expect(() => readTarget(join(dir, "tsconfig.extension-test.json"))).toThrow("expected a target ESxxxx.");
    });
  });

  describe("editionProblems", () => {
    test("should name each place with another edition", () => {
      writeFileSync(join(dir, "eslint.config.mjs"), ESLINT_CONFIG.replace(/2020/g, "2024"));
      writeFileSync(join(dir, "tsconfig.extension.json"), EXTENSION_TSCONFIG.replace(/ES2020/g, "ES2024"));

      expect(editionProblems(dir, 24, "ES2024")).toEqual([
        "tsconfig.webview.json: target is ES2020, expected ES2024",
        "tsconfig.webview.json: lib is ES2020, expected ES2024",
      ]);
    });

    test("should report a Node version without a base", () => {
      expect(editionProblems(dir, 99, undefined)).toEqual(["There is no @tsconfig/bases configuration for Node 99."]);
    });
  });

  describe("writeEdition", () => {
    test("should replace only the editions and return the changed files", () => {
      expect(writeEdition(dir, "ES2024")).toEqual(["eslint.config.mjs", "tsconfig.extension.json", "tsconfig.webview.json"]);

      expect(read("tsconfig.extension.json")).toBe(EXTENSION_TSCONFIG.replace(/ES2020/g, "ES2024"));
      expect(read("tsconfig.webview.json")).toBe(WEBVIEW_TSCONFIG.replace('"target": "es2020"', '"target": "ES2024"').replace('["es2020",', '["ES2024",'));
      expect(read("eslint.config.mjs")).toBe(ESLINT_CONFIG.replace(/2020/g, "2024"));
      expect(read("tsconfig.extension-test.json")).toBe(TEST_TSCONFIG);
      expect(read("package.json")).toBe('{ "target": "ES2020" }\n');
      expect(findEditions(dir).every((use) => use.value === "ES2024")).toBe(true);
    });
  });
});
