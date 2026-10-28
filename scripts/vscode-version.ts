// Keeps the lowest supported VS Code version (`engines.vscode`), `@types/vscode`,
// `@types/node` and `.nvmrc` in line. The extension host runs on the Node version
// of the Electron that VS Code ships, so these values are derived from it.
//
//   node scripts/vscode-version.ts update [version]
//     Shows the VS Code releases since the current minimum with their Electron and
//     Node versions, asks for the new minimum (unless given), updates `package.json`
//     and `.nvmrc`, and then installs that Node version (with nvm, nvm-windows or
//     fnm) and runs npm install, lint, the tests and the packaging.
//   node scripts/vscode-version.ts check
//     Fails if `@types/vscode`, `@types/node` or `.nvmrc` don't match `engines.vscode`.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface, type Interface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { installNode, runWith } from "./lib/node-setup.ts";
import {
  deriveVersions,
  electronOf,
  expectedValues,
  listReleases,
  loadSharedData,
  parseVersion,
  type DerivedVersions,
  type ExpectedValues,
} from "./lib/vscode-releases.ts";

/** The terminal interface; only `question()` is used. */
type Asker = Pick<Interface, "question">;

/** The parts of `package.json` that the script reads and writes. */
export interface PackageJson {
  engines: { vscode: string };
  devDependencies: Record<string, string>;
}

/** `package.json` as read from disk, with its line endings. */
export interface Manifest {
  pkg: PackageJson;
  crlf: boolean;
}

const STEPS = ["npm install", "npm run lint", "npm test", "npm run package", "npm run package:verify"];

const LABELS: Record<keyof ExpectedValues, string> = {
  engines: "engines.vscode",
  typesVscode: "@types/vscode",
  typesNode: "@types/node",
  nvmrc: ".nvmrc",
};

/**
 * Formats rows as a text table with aligned columns.
 *
 * @param header - The column titles
 * @param rows - The cells
 * @returns The table
 */
export function formatTable(header: string[], rows: string[][]): string {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]): string => cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}

/**
 * Reads `package.json` and `.nvmrc`.
 *
 * @param dir - The folder that contains both files
 * @returns The manifest with its line endings, and the current values
 */
function readCurrent(dir: string): Manifest & { actual: ExpectedValues } {
  const text = readFileSync(join(dir, "package.json"), "utf8");
  const pkg = JSON.parse(text) as PackageJson;
  const actual = {
    engines: pkg.engines.vscode,
    typesVscode: pkg.devDependencies["@types/vscode"],
    typesNode: pkg.devDependencies["@types/node"],
    nvmrc: readFileSync(join(dir, ".nvmrc"), "utf8").trim(),
  };
  return { pkg, crlf: text.includes("\r\n"), actual };
}

/**
 * Checks that `@types/vscode`, `@types/node` and `.nvmrc` match `engines.vscode`.
 *
 * @param dir - The folder with `package.json` and `.nvmrc`
 * @returns The exit code: 0 if everything matches, 1 otherwise
 */
export async function check(dir = "."): Promise<number> {
  const { actual } = readCurrent(dir);
  const vscode = parseVersion(actual.engines).join(".");
  const derived = deriveVersions(vscode, { ...(await loadSharedData()), electron: await electronOf(vscode) });
  const expected = expectedValues(derived);
  const keys = Object.keys(expected) as (keyof ExpectedValues)[];
  const drift = keys.filter((key) => expected[key] !== actual[key]);
  console.log(`VS Code ${vscode} ships Electron ${derived.electron} with Node ${derived.node}.`);
  for (const key of drift) {
    console.error(`${LABELS[key]}: is "${actual[key]}", expected "${expected[key]}"`);
  }
  if (drift.length > 0) {
    console.error("Run `npm run vscode:update -- " + vscode + "` to fix this.");
    return 1;
  }
  console.log("engines.vscode, @types/vscode, @types/node and .nvmrc match.");
  return 0;
}

/**
 * Shows the table of VS Code releases and asks for the new minimum version.
 *
 * @param rows - The derived versions per release
 * @param dates - Release date per VS Code version
 * @param current - The current minimum VS Code version
 * @param rl - The terminal interface
 * @returns The chosen VS Code version
 */
export async function choose(rows: DerivedVersions[], dates: Record<string, string>, current: string, rl: Asker): Promise<string> {
  const header = ["VS Code", "Released", "Electron", "Node", "@types/vscode", "@types/node", "Node end of life"];
  const cells = rows.map((r) => [
    r.vscode === current ? `${r.vscode} (current)` : r.vscode,
    dates[r.vscode],
    r.electron,
    r.node,
    r.typesVscode ?? "-",
    r.typesNode ?? "-",
    r.nodeEnd ?? "-",
  ]);
  console.log(`\n${formatTable(header, cells)}\n`);
  console.log("@types/vscode and @types/node show the highest published version that is not newer.\n");
  for (;;) {
    const answer = (await rl.question("New minimum VS Code version: ")).trim();
    if (rows.some((r) => r.vscode === answer && r.typesVscode && r.typesNode)) {
      return answer;
    }
    console.log(`Choose a version from the table that has both @types versions.`);
  }
}

/**
 * Writes the expected values into `package.json` and `.nvmrc`, keeping the line
 * endings of `package.json` (Git may check files out with CRLF on Windows).
 *
 * @param manifest - The parsed `package.json` and its line endings
 * @param values - The values to write
 * @param dir - The folder with `package.json` and `.nvmrc`
 */
export function writeValues({ pkg, crlf }: Manifest, values: ExpectedValues, dir = "."): void {
  const eol = crlf ? "\r\n" : "\n";
  pkg.engines.vscode = values.engines;
  pkg.devDependencies["@types/vscode"] = values.typesVscode;
  pkg.devDependencies["@types/node"] = values.typesNode;
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`.replace(/\n/g, eol));
  writeFileSync(join(dir, ".nvmrc"), `${values.nvmrc}${eol}`);
}

/**
 * Asks whether to install the Node version and run the steps after the update.
 * Without a terminal, it does not ask.
 *
 * @param rl - The terminal interface
 * @param version - The Node version
 * @returns Whether to run the steps
 */
async function confirmSteps(rl: Asker, version: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return false;
  }
  if (!process.env.NODE_AUTH_TOKEN) {
    console.log("NODE_AUTH_TOKEN is not set; npm install needs it for GitHub Packages.");
  }
  const answer = await rl.question(`Install Node ${version} and run ${STEPS.join(", ")} now? [Y/n] `);
  return !/^n/i.test(answer.trim());
}

/**
 * Installs the Node version and runs the steps, or prints them if the Node
 * version could not be installed.
 *
 * @param version - The Node version
 * @returns The exit code
 */
function runSteps(version: string): number {
  const folder = installNode(version);
  if (!folder) {
    console.error(`Could not install Node ${version} with nvm, nvm-windows or fnm.`);
    printSteps(version);
    return 1;
  }
  return runWith(folder, STEPS);
}

/**
 * Prints the steps to run after the update.
 *
 * @param version - The Node version
 */
function printSteps(version: string): void {
  console.log(`Install and use Node ${version}, then run:\n${STEPS.map((s) => `  ${s}`).join("\n")}`);
}

/**
 * Asks for the new minimum version unless it was given, writes the values that
 * follow from it, and asks whether to run the steps.
 *
 * @param rows - The derived versions per release
 * @param dates - Release date per VS Code version
 * @param manifest - The parsed `package.json` and its line endings
 * @param requested - The new minimum VS Code version, or undefined to ask
 * @param dir - The folder with `package.json` and `.nvmrc`
 * @returns The written values and whether to run the steps
 * @throws {Error} If the version is not a release in the table
 */
async function apply(
  rows: DerivedVersions[],
  dates: Record<string, string>,
  manifest: Manifest,
  requested: string | undefined,
  dir: string,
): Promise<{ values: ExpectedValues; run: boolean }> {
  const current = parseVersion(manifest.pkg.engines.vscode).join(".");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const vscode = requested ?? (await choose(rows, dates, current, rl));
    const derived = rows.find((r) => r.vscode === vscode);
    if (!derived) {
      throw new Error(`VS Code ${vscode} is not a release x.y.0 of microsoft/vscode`);
    }
    const values = expectedValues(derived);
    writeValues(manifest, values, dir);
    console.log(`Set engines.vscode ${values.engines}, @types/vscode ${values.typesVscode}, ` +
      `@types/node ${values.typesNode} and .nvmrc ${values.nvmrc}.`);
    return { values, run: await confirmSteps(rl, values.nvmrc) };
  } finally {
    rl.close();
  }
}

/**
 * Updates the minimum VS Code version and the versions derived from it.
 *
 * @param requested - The new minimum VS Code version, or undefined to ask
 * @param dir - The folder with `package.json` and `.nvmrc`
 * @returns The exit code
 * @throws {Error} If no version is given and there is no terminal to ask
 */
export async function update(requested: string | undefined, dir = "."): Promise<number> {
  if (!requested && !process.stdin.isTTY) {
    throw new Error("Not running in a terminal: give the VS Code version, for example `update 1.125.0`.");
  }
  const { pkg, crlf, actual } = readCurrent(dir);
  const currentMinor = parseVersion(actual.engines)[1];
  const fromMinor = Math.min(currentMinor, requested ? parseVersion(requested)[1] : Infinity);
  const [shared, releases] = await Promise.all([loadSharedData(), listReleases(fromMinor)]);
  const electrons = await Promise.all(releases.map((r) => electronOf(r.version)));
  const rows = releases.map((r, i) => deriveVersions(r.version, { ...shared, electron: electrons[i] }));
  const dates = Object.fromEntries(releases.map((r) => [r.version, r.date]));
  const { values, run } = await apply(rows, dates, { pkg, crlf }, requested, dir);
  if (!run) {
    printSteps(values.nvmrc);
    return 0;
  }
  return runSteps(values.nvmrc);
}

/**
 * Runs the command given on the command line.
 *
 * @param args - The command line arguments after the script name
 * @returns The exit code
 */
export async function main(args: string[]): Promise<number> {
  const [command, version] = args;
  if (command === "check") {
    return check();
  }
  if (command === "update") {
    return update(version);
  }
  console.error("Usage: node scripts/vscode-version.ts check | update [version]");
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error: Error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
