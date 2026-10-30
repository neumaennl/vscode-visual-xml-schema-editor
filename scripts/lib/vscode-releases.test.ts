import { release, releasesPage, stubFetch } from "../__tests__/releaseTestHelpers.ts";
import {
  deriveVersions,
  electronOf,
  expectedValues,
  highestAtOrBelow,
  listReleases,
  loadSharedData,
  parseElectronTarget,
  parseVersion,
  type DerivedVersions,
} from "./vscode-releases.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("vscode-releases", () => {
  describe("parseVersion", () => {
    test("should parse a version into major, minor and patch", () => {
      expect(parseVersion("1.125.0")).toEqual([1, 125, 0]);
    });

    test("should accept the prefixes ^, ~ and v and surrounding whitespace", () => {
      expect(parseVersion("^1.125.0")).toEqual([1, 125, 0]);
      expect(parseVersion("~24.13.0")).toEqual([24, 13, 0]);
      expect(parseVersion(" v24.15.0\n")).toEqual([24, 15, 0]);
    });

    test("should throw for text that is not a version", () => {
      expect(() => parseVersion("24")).toThrow('Not a version: "24"');
      expect(() => parseVersion("1.125.0-beta")).toThrow();
    });
  });

  describe("highestAtOrBelow", () => {
    test("should return the highest version of the major version up to the minor version", () => {
      expect(highestAtOrBelow(["24.12.2", "24.13.1", "24.13.6", "24.19.1"], 24, 15)).toBe("24.13.6");
    });

    test("should ignore pre-releases and other major versions", () => {
      expect(highestAtOrBelow(["22.20.5", "24.13.0-beta", "24.12.2", "26.1.0"], 24, 15)).toBe("24.12.2");
    });

    test("should return undefined if no version matches", () => {
      expect(highestAtOrBelow(["24.19.1"], 24, 15)).toBeUndefined();
    });
  });

  describe("parseElectronTarget", () => {
    test("should read a quoted or unquoted target", () => {
      expect(parseElectronTarget('disturl="https://electronjs.org/headers"\ntarget="42.3.0"\n')).toBe("42.3.0");
      expect(parseElectronTarget("target=39.8.8")).toBe("39.8.8");
    });

    test("should return undefined if the file has no target", () => {
      expect(parseElectronTarget('runtime="electron"\n')).toBeUndefined();
    });
  });

  describe("deriveVersions", () => {
    const data = {
      electron: "42.3.0",
      electronNode: { "42.3.0": "24.15.0" },
      typesVscode: ["1.120.0", "1.125.0", "1.134.0"],
      typesNode: ["24.13.6", "24.19.1"],
      nodeSchedule: { v24: { end: "2028-04-30" } },
    };

    test("should derive the Node and @types versions of a VS Code release", () => {
      expect(deriveVersions("1.125.0", data)).toEqual({
        vscode: "1.125.0",
        electron: "42.3.0",
        node: "24.15.0",
        typesVscode: "1.125.0",
        typesNode: "24.13.6",
        nodeEnd: "2028-04-30",
      });
    });

    test("should leave out what has no match", () => {
      const derived = deriveVersions("1.110.0", { ...data, nodeSchedule: {} });

      expect(derived.typesVscode).toBeUndefined();
      expect(derived.nodeEnd).toBeUndefined();
    });

    test("should throw if the Node version of the Electron release is unknown", () => {
      expect(() => deriveVersions("1.125.0", { ...data, electron: "99.0.0" })).toThrow(
        "Unknown Node version for Electron 99.0.0",
      );
    });
  });

  describe("expectedValues", () => {
    test("should turn derived versions into the values of package.json and .nvmrc", () => {
      const derived = { vscode: "1.125.0", electron: "42.3.0", node: "24.15.0", typesVscode: "1.125.0", typesNode: "24.13.6" };

      expect(expectedValues(derived)).toEqual({
        engines: "^1.125.0",
        typesVscode: "~1.125.0",
        typesNode: "~24.13.0",
        nvmrc: "24.15.0",
      });
    });

    test("should throw if an @types version is missing", () => {
      const derived: DerivedVersions = { vscode: "1.110.0", electron: "39.6.0", node: "22.22.0", typesNode: "22.20.5" };

      expect(() => expectedValues(derived)).toThrow("No matching @types/vscode or @types/node for VS Code 1.110.0");
    });
  });

  describe("loadSharedData", () => {
    test("should load the Electron releases, the @types versions and the Node schedule", async () => {
      const fetchMock = stubFetch({
        "https://releases.electronjs.org/releases.json": [{ version: "42.3.0", node: "24.15.0" }],
        "https://registry.npmjs.org/@types%2fvscode": { versions: { "1.125.0": {} } },
        "https://registry.npmjs.org/@types%2fnode": { versions: { "24.13.6": {}, "24.19.1": {} } },
        "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json": { v24: { end: "2028-04-30" } },
      });

      const shared = await loadSharedData();

      expect(shared).toEqual({
        electronNode: { "42.3.0": "24.15.0" },
        typesVscode: ["1.125.0"],
        typesNode: ["24.13.6", "24.19.1"],
        nodeSchedule: { v24: { end: "2028-04-30" } },
      });
      expect(fetchMock).toHaveBeenCalledWith("https://registry.npmjs.org/@types%2fnode", {
        headers: { Accept: "application/vnd.npm.install-v1+json" },
      });
    });
  });

  describe("electronOf", () => {
    test("should read the Electron version from the .npmrc of the release tag", async () => {
      stubFetch({ "https://raw.githubusercontent.com/microsoft/vscode/1.125.0/.npmrc": 'target="42.3.0"\n' });

      await expect(electronOf("1.125.0")).resolves.toBe("42.3.0");
    });

    test("should throw if the .npmrc has no target", async () => {
      stubFetch({ "https://raw.githubusercontent.com/microsoft/vscode/1.125.0/.npmrc": 'runtime="electron"\n' });

      await expect(electronOf("1.125.0")).rejects.toThrow("No Electron target in the .npmrc of VS Code 1.125.0");
    });

    test("should throw if the request fails", async () => {
      stubFetch({});

      await expect(electronOf("1.999.0")).rejects.toThrow("HTTP 404");
    });
  });

  describe("listReleases", () => {
    test("should list the releases x.y.0 from the given minor version on, oldest first", async () => {
      stubFetch({
        [releasesPage(1)]: [
          release("1.126.0"),
          release("1.125.1"),
          release("1.125.0"),
          release("1.124.0", { prerelease: true }),
          release("1.123.0", { draft: true }),
          release("1.122.0"),
        ],
      });

      await expect(listReleases(123)).resolves.toEqual([
        { version: "1.125.0", date: "2026-06-17" },
        { version: "1.126.0", date: "2026-06-17" },
      ]);
    });

    test("should read further pages until a page reaches below the minor version", async () => {
      const firstPage = Array.from({ length: 100 }, (_, i) => release(`1.${300 - i}.0`));
      const fetchMock = stubFetch({
        [releasesPage(1)]: firstPage,
        [releasesPage(2)]: [release("1.200.0"), release("1.199.0")],
      });

      const releases = await listReleases(200);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(releases).toHaveLength(101);
      expect(releases[0].version).toBe("1.200.0");
    });

    test("should send a GitHub token if one is set", async () => {
      vi.stubEnv("GITHUB_TOKEN", "test-token");
      const fetchMock = stubFetch({ [releasesPage(1)]: [] });

      await listReleases(125);

      expect(fetchMock).toHaveBeenCalledWith(releasesPage(1), {
        headers: { Authorization: "Bearer test-token" },
      });
    });
  });
});
