// Keeps the lowest supported VS Code version (`engines.vscode`), `@types/vscode`,
// `@types/node` and `.nvmrc` in line. The extension host runs on the Node version
// of the Electron that VS Code ships, so these values are derived from it.
//
//   node scripts/vscode-version.mjs update [version]
//     Shows the VS Code releases since the current minimum with their Electron and
//     Node versions, asks for the new minimum (unless given), updates `package.json`
//     and `.nvmrc`, and then installs that Node version (with nvm, nvm-windows or
//     fnm) and runs npm install, lint, the tests and the packaging.
//   node scripts/vscode-version.mjs check
//     Fails if `@types/vscode`, `@types/node` or `.nvmrc` don't match `engines.vscode`.
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { installNode, runWith } from "./lib/node-setup.mjs";
import {
  deriveVersions,
  electronOf,
  expectedValues,
  listReleases,
  loadSharedData,
  parseVersion,
} from "./lib/vscode-releases.mjs";

const STEPS = ["npm install", "npm run lint", "npm test", "npm run package", "npm run package:verify"];

const LABELS = {
  engines: "engines.vscode",
  typesVscode: "@types/vscode",
  typesNode: "@types/node",
  nvmrc: ".nvmrc",
};

/**
 * Formats rows as a text table with aligned columns.
 *
 * @param {string[]} header - The column titles
 * @param {string[][]} rows - The cells
 * @returns {string} The table
 */
function formatTable(header, rows) {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}

/**
 * Reads `package.json` and `.nvmrc`.
 *
 * @returns {{pkg: any, crlf: boolean, actual: {engines: string, typesVscode: string, typesNode: string, nvmrc: string}}} The manifest, whether it uses CRLF line endings, and the current values
 */
function readCurrent() {
  const text = readFileSync("package.json", "utf8");
  const pkg = JSON.parse(text);
  const actual = {
    engines: pkg.engines.vscode,
    typesVscode: pkg.devDependencies["@types/vscode"],
    typesNode: pkg.devDependencies["@types/node"],
    nvmrc: readFileSync(".nvmrc", "utf8").trim(),
  };
  return { pkg, crlf: text.includes("\r\n"), actual };
}

/**
 * Checks that `@types/vscode`, `@types/node` and `.nvmrc` match `engines.vscode`.
 *
 * @returns {Promise<number>} The exit code: 0 if everything matches, 1 otherwise
 */
async function check() {
  const { actual } = readCurrent();
  const vscode = parseVersion(actual.engines).join(".");
  const derived = deriveVersions(vscode, { ...(await loadSharedData()), electron: await electronOf(vscode) });
  const expected = expectedValues(derived);
  const drift = Object.keys(expected).filter((key) => expected[key] !== actual[key]);
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
 * @param {ReturnType<typeof deriveVersions>[]} rows - The derived versions per release
 * @param {Record<string, string>} dates - Release date per VS Code version
 * @param {string} current - The current minimum VS Code version
 * @param {import("node:readline/promises").Interface} rl - The terminal interface
 * @returns {Promise<string>} The chosen VS Code version
 */
async function choose(rows, dates, current, rl) {
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
 * @param {any} pkg - The parsed `package.json`
 * @param {boolean} crlf - Whether to write CRLF line endings
 * @param {ReturnType<typeof expectedValues>} values - The values to write
 * @returns {void}
 */
function writeValues(pkg, crlf, values) {
  const eol = crlf ? "\r\n" : "\n";
  pkg.engines.vscode = values.engines;
  pkg.devDependencies["@types/vscode"] = values.typesVscode;
  pkg.devDependencies["@types/node"] = values.typesNode;
  writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`.replace(/\n/g, eol));
  writeFileSync(".nvmrc", `${values.nvmrc}${eol}`);
}

/**
 * Asks whether to install the Node version and run the steps after the update.
 * Without a terminal, it does not ask.
 *
 * @param {import("node:readline/promises").Interface} rl - The terminal interface
 * @param {string} version - The Node version
 * @returns {Promise<boolean>} Whether to run the steps
 */
async function confirmSteps(rl, version) {
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
 * @param {string} version - The Node version
 * @returns {number} The exit code
 */
function runSteps(version) {
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
 * @param {string} version - The Node version
 * @returns {void}
 */
function printSteps(version) {
  console.log(`Install and use Node ${version}, then run:\n${STEPS.map((s) => `  ${s}`).join("\n")}`);
}

/**
 * Updates the minimum VS Code version and the versions derived from it.
 *
 * @param {string | undefined} requested - The new minimum VS Code version, or undefined to ask
 * @returns {Promise<number>} The exit code
 */
async function update(requested) {
  if (!requested && !process.stdin.isTTY) {
    throw new Error("Not running in a terminal: give the VS Code version, for example `update 1.125.0`.");
  }
  const { pkg, crlf, actual } = readCurrent();
  const current = parseVersion(actual.engines).join(".");
  const fromMinor = Math.min(parseVersion(current)[1], requested ? parseVersion(requested)[1] : Infinity);
  const [shared, releases] = await Promise.all([loadSharedData(), listReleases(fromMinor)]);
  const electrons = await Promise.all(releases.map((r) => electronOf(r.version)));
  const rows = releases.map((r, i) => deriveVersions(r.version, { ...shared, electron: electrons[i] }));
  const dates = Object.fromEntries(releases.map((r) => [r.version, r.date]));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let values;
  let run;
  try {
    const vscode = requested ?? (await choose(rows, dates, current, rl));
    const derived = rows.find((r) => r.vscode === vscode);
    if (!derived) {
      throw new Error(`VS Code ${vscode} is not a release x.y.0 of microsoft/vscode`);
    }
    values = expectedValues(derived);
    writeValues(pkg, crlf, values);
    console.log(`Set engines.vscode ${values.engines}, @types/vscode ${values.typesVscode}, ` +
      `@types/node ${values.typesNode} and .nvmrc ${values.nvmrc}.`);
    run = await confirmSteps(rl, values.nvmrc);
  } finally {
    rl.close();
  }
  if (!run) {
    printSteps(values.nvmrc);
    return 0;
  }
  return runSteps(values.nvmrc);
}

/**
 * Runs the command given on the command line.
 *
 * @param {string[]} args - The command line arguments after the script name
 * @returns {Promise<number>} The exit code
 */
async function main(args) {
  const [command, version] = args;
  if (command === "check") {
    return check();
  }
  if (command === "update") {
    return update(version);
  }
  console.error("Usage: node scripts/vscode-version.mjs check | update [version]");
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
