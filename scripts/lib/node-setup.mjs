// Installs a Node version with a version manager and runs commands with it.
// Used by vscode-version.mjs.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";

/**
 * Runs a command and returns its output.
 *
 * @param {string} command - The program
 * @param {string[]} args - Its arguments
 * @returns {string | undefined} The trimmed standard output, or undefined if the command failed
 */
function output(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

/**
 * Installs a Node version with the first version manager found: nvm on Linux and
 * macOS, nvm-windows, or fnm. Without one, the running Node is used if it has
 * the right version.
 *
 * @param {string} version - The Node version, for example `24.15.0`
 * @returns {string | undefined} The folder with `node` and `npm` of that version, or undefined if it could not be installed
 */
export function installNode(version) {
  const env = process.env;
  if (env.NVM_DIR && process.platform !== "win32") {
    const script = '. "$NVM_DIR/nvm.sh" && nvm install "$1" >&2 && nvm which "$1"';
    const node = output("bash", ["-c", script, "bash", version]);
    return node && dirname(node);
  }
  if (env.NVM_HOME && process.platform === "win32") {
    if (spawnSync("nvm", ["install", version], { stdio: "inherit" }).status !== 0) {
      return undefined;
    }
    const root = /:\s*(.+)$/.exec(output("nvm", ["root"]) ?? "")?.[1] ?? env.NVM_HOME;
    const folder = join(root.trim(), `v${version}`);
    return existsSync(join(folder, "node.exe")) ? folder : undefined;
  }
  if (env.FNM_DIR || env.FNM_MULTISHELL_PATH) {
    if (spawnSync("fnm", ["install", version], { stdio: "inherit" }).status !== 0) {
      return undefined;
    }
    const node = output("fnm", ["exec", `--using=${version}`, "node", "-p", "process.execPath"]);
    return node && dirname(node);
  }
  return process.version === `v${version}` ? dirname(process.execPath) : undefined;
}

/**
 * Runs npm commands with the `node` and `npm` from the given folder, stopping at
 * the first one that fails.
 *
 * @param {string} folder - The folder with `node` and `npm`
 * @param {string[]} commands - The commands, for example `npm test`
 * @returns {number} The exit code of the failed command, or 0
 */
export function runWith(folder, commands) {
  const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
  const env = { ...process.env, [pathKey]: `${folder}${delimiter}${process.env[pathKey] ?? ""}` };
  for (const command of commands) {
    console.log(`\n> ${command}`);
    const result = spawnSync(command, { stdio: "inherit", env, shell: true });
    if (result.status !== 0) {
      return result.status ?? 1;
    }
  }
  return 0;
}
