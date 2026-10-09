// Looks up VS Code releases, the Electron and Node versions they ship, and the
// matching @types/vscode and @types/node versions. Used by vscode-version.mjs.

const SOURCES = {
  vscodeReleases: "https://api.github.com/repos/microsoft/vscode/releases",
  vscodeFile: (tag, file) => `https://raw.githubusercontent.com/microsoft/vscode/${tag}/${file}`,
  electronReleases: "https://releases.electronjs.org/releases.json",
  nodeSchedule: "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json",
  npmPackage: (name) => `https://registry.npmjs.org/${name.replace("/", "%2f")}`,
};

/**
 * Parses a version like `1.125.0`, optionally prefixed with `^`, `~` or `v`.
 *
 * @param {string} text - The version or version range
 * @returns {number[]} Major, minor and patch
 * @throws {Error} If the text is not a version
 */
export function parseVersion(text) {
  const match = /^[\^~v]?(\d+)\.(\d+)\.(\d+)$/.exec(text.trim());
  if (!match) {
    throw new Error(`Not a version: "${text}"`);
  }
  return match.slice(1).map(Number);
}

/**
 * Compares two parsed versions.
 *
 * @param {number[]} a - The first version
 * @param {number[]} b - The second version
 * @returns {number} A negative number, zero or a positive number if `a` is lower, equal or higher
 */
function compareVersions(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * Finds the highest release with the given major version and a minor version that
 * is not higher than the given one. Pre-releases are ignored.
 *
 * @param {string[]} versions - The published versions of a package
 * @param {number} major - The required major version
 * @param {number} maxMinor - The highest allowed minor version
 * @returns {string | undefined} The highest matching version, if any
 * @example
 * highestAtOrBelow(["24.12.2", "24.13.1", "24.19.1"], 24, 15); // "24.13.1"
 */
export function highestAtOrBelow(versions, major, maxMinor) {
  return versions
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
    .map(parseVersion)
    .filter(([ma, mi]) => ma === major && mi <= maxMinor)
    .sort(compareVersions)
    .pop()
    ?.join(".");
}

/**
 * Reads the Electron version from the `.npmrc` of VS Code. The VS Code build
 * uses this `target`, not the `electron` entry in its `package.json`.
 *
 * @param {string} npmrc - The content of the `.npmrc`
 * @returns {string | undefined} The Electron version, if the file has a target
 */
export function parseElectronTarget(npmrc) {
  return /^target\s*=\s*"?([\d.]+)"?\s*$/m.exec(npmrc)?.[1];
}

/**
 * Derives the versions that belong to a VS Code release.
 *
 * @param {string} vscode - The VS Code version, for example `1.125.0`
 * @param {object} data - The lookup data
 * @param {string} data.electron - The Electron version of the release
 * @param {Record<string, string>} data.electronNode - Node version per Electron version
 * @param {string[]} data.typesVscode - The published versions of `@types/vscode`
 * @param {string[]} data.typesNode - The published versions of `@types/node`
 * @param {Record<string, {end: string}>} data.nodeSchedule - The Node release schedule
 * @returns {{vscode: string, electron: string, node: string, typesVscode?: string, typesNode?: string, nodeEnd?: string}} The derived versions
 * @throws {Error} If the Node version of the Electron release is unknown
 */
export function deriveVersions(vscode, data) {
  const node = data.electronNode[data.electron];
  if (!node) {
    throw new Error(`Unknown Node version for Electron ${data.electron}`);
  }
  const [, vsMinor] = parseVersion(vscode);
  const [nodeMajor, nodeMinor] = parseVersion(node);
  return {
    vscode,
    electron: data.electron,
    node,
    typesVscode: highestAtOrBelow(data.typesVscode, 1, vsMinor),
    typesNode: highestAtOrBelow(data.typesNode, nodeMajor, nodeMinor),
    nodeEnd: data.nodeSchedule[`v${nodeMajor}`]?.end,
  };
}

/**
 * Turns derived versions into the values for `package.json` and `.nvmrc`.
 *
 * @param {ReturnType<typeof deriveVersions>} derived - The derived versions
 * @returns {{engines: string, typesVscode: string, typesNode: string, nvmrc: string}} The expected values
 * @throws {Error} If no matching `@types` package exists
 */
export function expectedValues(derived) {
  if (!derived.typesVscode || !derived.typesNode) {
    throw new Error(`No matching @types/vscode or @types/node for VS Code ${derived.vscode}`);
  }
  const tilde = (version) => `~${parseVersion(version).slice(0, 2).join(".")}.0`;
  return {
    engines: `^${derived.vscode}`,
    typesVscode: tilde(derived.typesVscode),
    typesNode: tilde(derived.typesNode),
    nvmrc: derived.node,
  };
}

/**
 * Fetches a URL and returns its body.
 *
 * @param {string} url - The URL
 * @param {"json" | "text"} type - How to read the body
 * @param {Record<string, string>} [headers] - Additional request headers
 * @returns {Promise<any>} The parsed JSON or the text
 * @throws {Error} If the request fails
 */
async function download(url, type, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return type === "json" ? response.json() : response.text();
}

/**
 * Returns the published versions of an npm package.
 *
 * @param {string} name - The package name
 * @returns {Promise<string[]>} The versions
 */
async function npmVersions(name) {
  const accept = { Accept: "application/vnd.npm.install-v1+json" };
  const doc = await download(SOURCES.npmPackage(name), "json", accept);
  return Object.keys(doc.versions);
}

/**
 * Downloads the data that does not depend on the VS Code release.
 *
 * @returns {Promise<{electronNode: Record<string, string>, typesVscode: string[], typesNode: string[], nodeSchedule: Record<string, {end: string}>}>} The lookup data
 */
export async function loadSharedData() {
  const [electron, typesVscode, typesNode, nodeSchedule] = await Promise.all([
    download(SOURCES.electronReleases, "json"),
    npmVersions("@types/vscode"),
    npmVersions("@types/node"),
    download(SOURCES.nodeSchedule, "json"),
  ]);
  const electronNode = Object.fromEntries(electron.map((r) => [r.version, r.node]));
  return { electronNode, typesVscode, typesNode, nodeSchedule };
}

/**
 * Looks up the Electron version of a VS Code release.
 *
 * @param {string} vscode - The VS Code version (a tag in `microsoft/vscode`)
 * @returns {Promise<string>} The Electron version
 * @throws {Error} If the tag has no `.npmrc` with a target
 */
export async function electronOf(vscode) {
  const electron = parseElectronTarget(await download(SOURCES.vscodeFile(vscode, ".npmrc"), "text"));
  if (!electron) {
    throw new Error(`No Electron target in the .npmrc of VS Code ${vscode}`);
  }
  return electron;
}

/**
 * Lists the VS Code releases `x.y.0` from the given minor version on, with their
 * release dates, newest last. Uses `GITHUB_TOKEN` or `GH_TOKEN` if set.
 *
 * @param {number} fromMinor - The lowest minor version to list
 * @returns {Promise<{version: string, date: string}[]>} The releases
 */
export async function listReleases(fromMinor) {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const releases = [];
  for (let page = 1; ; page++) {
    const batch = await download(`${SOURCES.vscodeReleases}?per_page=100&page=${page}`, "json", headers);
    for (const r of batch) {
      const match = /^1\.(\d+)\.0$/.exec(r.tag_name);
      if (match && !r.draft && !r.prerelease && Number(match[1]) >= fromMinor) {
        releases.push({ version: r.tag_name, date: r.published_at.slice(0, 10) });
      }
    }
    const oldest = batch.at(-1)?.tag_name;
    if (batch.length < 100 || (oldest && parseVersion(oldest)[1] < fromMinor)) {
      break;
    }
  }
  return releases.sort((a, b) => compareVersions(parseVersion(a.version), parseVersion(b.version)));
}
