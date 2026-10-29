import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { installNode, runWith } from "./node-setup.ts";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: vi.fn() }));

/**
 * Creates the result of `spawnSync`.
 *
 * @param status - The exit code
 * @param stdout - The standard output
 * @returns The result
 */
function exited(status: number, stdout = ""): ReturnType<typeof spawnSync> {
  return { status, stdout } as ReturnType<typeof spawnSync>;
}

const realPlatform = Object.getOwnPropertyDescriptor(process, "platform") ?? { value: process.platform, configurable: true };

/**
 * Makes `process.platform` return another platform until the end of the test.
 *
 * @param platform - The platform, for example `win32`
 */
function stubPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { ...realPlatform, value: platform });
}

beforeEach(() => {
  vi.mocked(spawnSync).mockReset();
  vi.mocked(existsSync).mockReset();
  for (const name of ["NVM_DIR", "NVM_HOME", "FNM_DIR", "FNM_MULTISHELL_PATH"]) {
    vi.stubEnv(name, undefined);
  }
});

afterEach(() => {
  Object.defineProperty(process, "platform", realPlatform);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("node-setup", () => {
  describe("installNode", () => {
    test("should install the version with nvm and return the folder of its node", () => {
      stubPlatform("linux");
      vi.stubEnv("NVM_DIR", "/home/user/.nvm");
      vi.mocked(spawnSync).mockReturnValue(exited(0, "/home/user/.nvm/versions/node/v24.15.0/bin/node\n"));

      const folder = installNode("24.15.0");

      expect(folder).toBe("/home/user/.nvm/versions/node/v24.15.0/bin");
      expect(spawnSync).toHaveBeenCalledWith("bash", ["-c", expect.stringContaining("nvm install"), "bash", "24.15.0"], expect.anything());
    });

    test("should return undefined if nvm fails", () => {
      stubPlatform("linux");
      vi.stubEnv("NVM_DIR", "/home/user/.nvm");
      vi.mocked(spawnSync).mockReturnValue(exited(1));

      expect(installNode("24.15.0")).toBeUndefined();
    });

    test("should install the version with nvm-windows and return its folder under nvm root", () => {
      stubPlatform("win32");
      vi.stubEnv("NVM_HOME", "C:\\nvm");
      vi.mocked(spawnSync).mockReturnValueOnce(exited(0)).mockReturnValueOnce(exited(0, "\nCurrent Root: D:\\node-versions\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const folder = installNode("24.15.0");

      expect(folder).toBe(join("D:\\node-versions", "v24.15.0"));
      expect(spawnSync).toHaveBeenNthCalledWith(1, "nvm", ["install", "24.15.0"], { stdio: "inherit" });
    });

    test("should return undefined if nvm-windows did not create node.exe", () => {
      stubPlatform("win32");
      vi.stubEnv("NVM_HOME", "C:\\nvm");
      vi.mocked(spawnSync).mockReturnValue(exited(0, "Current Root: C:\\nvm"));
      vi.mocked(existsSync).mockReturnValue(false);

      expect(installNode("24.15.0")).toBeUndefined();
    });

    test("should install the version with fnm and return the folder of its node", () => {
      stubPlatform("linux");
      vi.stubEnv("FNM_DIR", "/home/user/.fnm");
      vi.mocked(spawnSync).mockReturnValueOnce(exited(0)).mockReturnValueOnce(exited(0, "/home/user/.fnm/node-versions/v24.15.0/installation/bin/node\n"));

      expect(installNode("24.15.0")).toBe("/home/user/.fnm/node-versions/v24.15.0/installation/bin");
      expect(spawnSync).toHaveBeenNthCalledWith(1, "fnm", ["install", "24.15.0"], { stdio: "inherit" });
    });

    test("should use the running Node without a version manager if it has the version", () => {
      expect(installNode(process.version.slice(1))).toBe(dirname(process.execPath));
      expect(spawnSync).not.toHaveBeenCalled();
    });

    test("should return undefined without a version manager if the running Node has another version", () => {
      expect(installNode("0.0.1")).toBeUndefined();
    });
  });

  describe("runWith", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    test("should run the commands with the folder first in PATH", () => {
      vi.mocked(spawnSync).mockReturnValue(exited(0));

      const code = runWith("/opt/node/bin", ["npm install", "npm test"]);

      expect(code).toBe(0);
      expect(spawnSync).toHaveBeenCalledTimes(2);
      const [command, options] = vi.mocked(spawnSync).mock.calls[0] as [string, SpawnSyncOptions?];
      const env = options?.env ?? {};
      const pathKey = Object.keys(env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
      expect(command).toBe("npm install");
      expect(env[pathKey]).toMatch(new RegExp(`^/opt/node/bin${delimiter}`));
    });

    test("should stop at the first command that fails and return its exit code", () => {
      vi.mocked(spawnSync).mockReturnValueOnce(exited(0)).mockReturnValueOnce(exited(3));

      const code = runWith("/opt/node/bin", ["npm install", "npm run lint", "npm test"]);

      expect(code).toBe(3);
      expect(spawnSync).toHaveBeenCalledTimes(2);
    });
  });
});
