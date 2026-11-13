import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { baseUrl } from "./lib/compiler-target.ts";
import { installNode, runWith } from "./lib/node-setup.ts";
import { release, releasesPage, stubFetch } from "./__tests__/releaseTestHelpers.ts";
import { check, choose, formatTable, main, update, writeValues } from "./vscode-version.ts";

const asker = { question: vi.fn<(query: string) => Promise<string>>(), close: vi.fn() };

vi.mock("node:readline/promises", () => ({ createInterface: vi.fn(() => asker) }));
vi.mock("./lib/node-setup.ts", () => ({ installNode: vi.fn(), runWith: vi.fn() }));

const PACKAGE_JSON = {
  name: "fixture",
  engines: { vscode: "^1.125.0" },
  devDependencies: { "@types/node": "~24.13.0", "@types/vscode": "~1.125.0" },
};

/** A TypeScript configuration with the given ECMAScript edition. */
const tsconfig = (edition: string): string => `{ "compilerOptions": { "target": "${edition}", "lib": ["${edition}", "DOM"] } }\n`;

const ORIGINAL_IS_TTY = Object.getOwnPropertyDescriptor(process.stdin, "isTTY") ?? { value: undefined, configurable: true };

let dir: string;

/**
 * Writes `package.json`, `.nvmrc` and a TypeScript configuration into the test folder.
 *
 * @param nvmrc - The content of `.nvmrc`
 * @param edition - The ECMAScript edition of the TypeScript configuration
 */
function writeProject(nvmrc = "24.15.0", edition = "ES2024"): void {
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(PACKAGE_JSON, null, 2)}\n`);
  writeFileSync(join(dir, ".nvmrc"), `${nvmrc}\n`);
  writeFileSync(join(dir, "tsconfig.json"), tsconfig(edition));
}

/**
 * Reads a file of the test folder.
 *
 * @param name - The file name
 * @returns The content
 */
function read(name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

/**
 * Answers the lookups of VS Code 1.125.0, 1.141.0 and 1.150.0, their Electron and
 * Node versions, and the @tsconfig/bases configuration of Node 24 (not of Node 26).
 */
function stubReleases(): void {
  stubFetch({
    "https://releases.electronjs.org/releases.json": [
      { version: "42.3.0", node: "24.15.0" },
      { version: "43.7.7", node: "24.21.0" },
      { version: "45.1.0", node: "26.2.0" },
    ],
    "https://registry.npmjs.org/@types%2fvscode": { versions: { "1.125.0": {}, "1.140.0": {} } },
    "https://registry.npmjs.org/@types%2fnode": { versions: { "24.13.6": {}, "24.19.1": {} } },
    "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json": { v24: { end: "2028-04-30" } },
    "https://raw.githubusercontent.com/microsoft/vscode/1.125.0/.npmrc": 'target="42.3.0"\n',
    "https://raw.githubusercontent.com/microsoft/vscode/1.141.0/.npmrc": 'target="43.7.7"\n',
    "https://raw.githubusercontent.com/microsoft/vscode/1.150.0/.npmrc": 'target="45.1.0"\n',
    [releasesPage(1)]: [release("1.150.0"), release("1.141.0"), release("1.125.0")],
    [baseUrl(24)]: '{ "compilerOptions": { "target": "es2024", "lib": ["es2024", "ESNext.Array"] } }',
  });
}

/**
 * Makes `process.stdin` look like a terminal or not, until the end of the test.
 *
 * @param isTTY - Whether standard input is a terminal
 */
function stubTerminal(isTTY: boolean): void {
  Object.defineProperty(process.stdin, "isTTY", { value: isTTY, configurable: true });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vscode-version-"));
  stubTerminal(false);
  asker.question.mockReset();
  vi.mocked(installNode).mockReset();
  vi.mocked(runWith).mockReset();
  vi.mocked(createInterface).mockClear();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  Object.defineProperty(process.stdin, "isTTY", ORIGINAL_IS_TTY);
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("vscode-version", () => {
  describe("formatTable", () => {
    test("should align the columns and underline the header", () => {
      expect(formatTable(["A", "Long"], [["xyz", "1"]])).toBe("A    Long\n---  ----\nxyz  1");
    });
  });

  describe("check", () => {
    test("should return 0 if @types/vscode, @types/node, .nvmrc and the edition match engines.vscode", async () => {
      writeProject();
      stubReleases();

      await expect(check(dir)).resolves.toBe(0);
      expect(console.log).toHaveBeenCalledWith("engines.vscode, @types/vscode, @types/node, .nvmrc and the ECMAScript edition match.");
    });

    test("should return 1 and name each place in the configurations with another edition", async () => {
      writeProject("24.15.0", "ES2020");
      stubReleases();

      await expect(check(dir)).resolves.toBe(1);
      expect(console.error).toHaveBeenCalledWith("tsconfig.json: target is ES2020, expected ES2024");
      expect(console.error).toHaveBeenCalledWith("tsconfig.json: lib is ES2020, expected ES2024");
    });

    test("should return 1 and name each value that does not match", async () => {
      writeProject("24");
      stubReleases();

      await expect(check(dir)).resolves.toBe(1);
      expect(console.error).toHaveBeenCalledWith('.nvmrc: is "24", expected "24.15.0"');
      expect(console.error).toHaveBeenCalledWith("Run `npm run vscode:update -- 1.125.0` to fix this.");
    });
  });

  describe("writeValues", () => {
    test("should write the values and keep the other fields and the CRLF line endings", () => {
      const values = { engines: "^1.141.0", typesVscode: "~1.140.0", typesNode: "~24.19.0", nvmrc: "24.21.0" };

      writeValues({ pkg: structuredClone(PACKAGE_JSON), crlf: true }, values, dir);

      const pkg = read("package.json");
      expect(pkg).toContain('"vscode": "^1.141.0"\r\n');
      expect(pkg).toContain('"name": "fixture"');
      expect(pkg.replace(/\r\n/g, "")).not.toContain("\n");
      expect(read(".nvmrc")).toBe("24.21.0\r\n");
    });
  });

  describe("update", () => {
    test("should write the values of the given version and print the steps without a terminal", async () => {
      writeProject();
      stubReleases();

      await expect(update("1.141.0", dir)).resolves.toBe(0);

      const pkg = JSON.parse(read("package.json")) as typeof PACKAGE_JSON;
      expect(pkg.engines.vscode).toBe("^1.141.0");
      expect(pkg.devDependencies).toEqual({ "@types/node": "~24.19.0", "@types/vscode": "~1.140.0" });
      expect(read(".nvmrc")).toBe("24.21.0\n");
      expect(read("tsconfig.json")).toBe(tsconfig("ES2024"));
      expect(installNode).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Install and use Node 24.21.0, then run:"));
    });

    test("should write the edition into the configurations", async () => {
      writeProject("24.15.0", "ES2020");
      stubReleases();

      await expect(update("1.141.0", dir)).resolves.toBe(0);

      expect(read("tsconfig.json")).toBe(tsconfig("ES2024"));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("the ECMAScript edition ES2024 (changed tsconfig.json)."));
    });

    test("should throw for a version whose Node version has no @tsconfig/bases configuration", async () => {
      writeProject();
      stubReleases();

      await expect(update("1.150.0", dir)).rejects.toThrow("There is no @tsconfig/bases configuration for Node 26.");
      expect(read(".nvmrc")).toBe("24.15.0\n");
    });

    test("should throw without a version if there is no terminal to ask", async () => {
      writeProject();

      await expect(update(undefined, dir)).rejects.toThrow("Not running in a terminal");
    });

    test("should throw for a version that is not a release", async () => {
      writeProject();
      stubReleases();

      await expect(update("1.130.0", dir)).rejects.toThrow("VS Code 1.130.0 is not a release x.y.0 of microsoft/vscode");
      expect(read(".nvmrc")).toBe("24.15.0\n");
    });

    test("should ask for the version, install Node and run the steps in a terminal", async () => {
      writeProject();
      stubReleases();
      stubTerminal(true);
      vi.stubEnv("NODE_AUTH_TOKEN", "token");
      asker.question.mockResolvedValueOnce("1.141.0").mockResolvedValueOnce("y");
      vi.mocked(installNode).mockReturnValue("/opt/node/bin");
      vi.mocked(runWith).mockReturnValue(3);

      await expect(update(undefined, dir)).resolves.toBe(3);

      expect(installNode).toHaveBeenCalledWith("24.21.0");
      expect(runWith).toHaveBeenCalledWith("/opt/node/bin", expect.arrayContaining(["npm install", "npm test"]));
      expect(asker.close).toHaveBeenCalled();
    });

    test("should only print the steps if the user declines", async () => {
      writeProject();
      stubReleases();
      stubTerminal(true);
      asker.question.mockResolvedValueOnce("n");

      await expect(update("1.141.0", dir)).resolves.toBe(0);

      expect(installNode).not.toHaveBeenCalled();
    });

    test("should return 1 and print the steps if Node cannot be installed", async () => {
      writeProject();
      stubReleases();
      stubTerminal(true);
      asker.question.mockResolvedValueOnce("");
      vi.mocked(installNode).mockReturnValue(undefined);

      await expect(update("1.141.0", dir)).resolves.toBe(1);

      expect(console.error).toHaveBeenCalledWith("Could not install Node 24.21.0 with nvm, nvm-windows or fnm.");
      expect(runWith).not.toHaveBeenCalled();
    });
  });

  describe("choose", () => {
    const rows = [
      { vscode: "1.110.0", electron: "39.6.0", node: "22.22.0", typesNode: "22.20.5", edition: "ES2023" },
      { vscode: "1.125.0", electron: "42.3.0", node: "24.15.0", typesVscode: "1.125.0", typesNode: "24.13.6", edition: "ES2024" },
      { vscode: "1.150.0", electron: "45.1.0", node: "26.2.0", typesVscode: "1.150.0", typesNode: "26.1.0" },
    ];
    const dates = { "1.110.0": "2026-03-09", "1.125.0": "2026-06-17", "1.150.0": "2027-06-16" };

    test("should ask again until the answer is a version with both @types versions and an edition", async () => {
      asker.question.mockResolvedValueOnce("1.110.0").mockResolvedValueOnce("1.150.0").mockResolvedValueOnce(" 1.125.0 ");

      await expect(choose(rows, dates, "1.125.0", asker)).resolves.toBe("1.125.0");

      expect(asker.question).toHaveBeenCalledTimes(3);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("1.125.0 (current)"));
    });
  });

  describe("main", () => {
    test("should print the usage and return 2 for an unknown command", async () => {
      await expect(main(["help"])).resolves.toBe(2);
      expect(console.error).toHaveBeenCalledWith("Usage: node scripts/vscode-version.ts check | update [version]");
    });
  });
});
