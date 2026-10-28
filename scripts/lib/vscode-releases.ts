// Looks up VS Code releases, the Electron and Node versions they ship, and the
// matching @types/vscode and @types/node versions. Used by vscode-version.ts.

/** A parsed version: major, minor and patch. */
export type Version = [number, number, number];

/** The versions that belong to a VS Code release. */
export interface DerivedVersions {
  vscode: string;
  electron: string;
  node: string;
  typesVscode?: string;
  typesNode?: string;
  nodeEnd?: string;
}

/** The lookup data that does not depend on the VS Code release. */
export interface SharedData {
  electronNode: Record<string, string>;
  typesVscode: string[];
  typesNode: string[];
  nodeSchedule: Record<string, { end: string }>;
}

/** The values of `package.json` and `.nvmrc` that follow from a VS Code release. */
export interface ExpectedValues {
  engines: string;
  typesVscode: string;
  typesNode: string;
  nvmrc: string;
}

/** A VS Code release with its release date. */
export interface Release {
  version: string;
  date: string;
}

interface ElectronRelease {
  version: string;
  node: string;
}

interface NpmDocument {
  versions: Record<string, object>;
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
}

const SOURCES = {
  vscodeReleases: "https://api.github.com/repos/microsoft/vscode/releases",
  vscodeFile: (tag: string, file: string): string => `https://raw.githubusercontent.com/microsoft/vscode/${tag}/${file}`,
  electronReleases: "https://releases.electronjs.org/releases.json",
  nodeSchedule: "https://raw.githubusercontent.com/nodejs/Release/main/schedule.json",
  npmPackage: (name: string): string => `https://registry.npmjs.org/${name.replace("/", "%2f")}`,
};

/**
 * Parses a version like `1.125.0`, optionally prefixed with `^`, `~` or `v`.
 *
 * @param text - The version or version range
 * @returns Major, minor and patch
 * @throws {Error} If the text is not a version
 */
export function parseVersion(text: string): Version {
  const match = /^[\^~v]?(\d+)\.(\d+)\.(\d+)$/.exec(text.trim());
  if (!match) {
    throw new Error(`Not a version: "${text}"`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Compares two parsed versions.
 *
 * @param a - The first version
 * @param b - The second version
 * @returns A negative number, zero or a positive number if `a` is lower, equal or higher
 */
function compareVersions(a: Version, b: Version): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * Finds the highest release with the given major version and a minor version that
 * is not higher than the given one. Pre-releases are ignored.
 *
 * @param versions - The published versions of a package
 * @param major - The required major version
 * @param maxMinor - The highest allowed minor version
 * @returns The highest matching version, if any
 * @example
 * highestAtOrBelow(["24.12.2", "24.13.1", "24.19.1"], 24, 15); // "24.13.1"
 */
export function highestAtOrBelow(versions: string[], major: number, maxMinor: number): string | undefined {
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
 * @param npmrc - The content of the `.npmrc`
 * @returns The Electron version, if the file has a target
 */
export function parseElectronTarget(npmrc: string): string | undefined {
  return /^target\s*=\s*"?([\d.]+)"?\s*$/m.exec(npmrc)?.[1];
}

/**
 * Derives the versions that belong to a VS Code release.
 *
 * @param vscode - The VS Code version, for example `1.125.0`
 * @param data - The lookup data and the Electron version of the release
 * @returns The derived versions
 * @throws {Error} If the Node version of the Electron release is unknown
 */
export function deriveVersions(vscode: string, data: SharedData & { electron: string }): DerivedVersions {
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
 * @param derived - The derived versions
 * @returns The expected values
 * @throws {Error} If no matching `@types` package exists
 */
export function expectedValues(derived: DerivedVersions): ExpectedValues {
  if (!derived.typesVscode || !derived.typesNode) {
    throw new Error(`No matching @types/vscode or @types/node for VS Code ${derived.vscode}`);
  }
  const tilde = (version: string): string => `~${parseVersion(version).slice(0, 2).join(".")}.0`;
  return {
    engines: `^${derived.vscode}`,
    typesVscode: tilde(derived.typesVscode),
    typesNode: tilde(derived.typesNode),
    nvmrc: derived.node,
  };
}

/**
 * Fetches a URL.
 *
 * @param url - The URL
 * @param headers - Additional request headers
 * @returns The response
 * @throws {Error} If the request fails
 */
async function request(url: string, headers: Record<string, string> = {}): Promise<Response> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return response;
}

/**
 * Fetches a URL and parses its body as JSON.
 *
 * @param url - The URL
 * @param headers - Additional request headers
 * @returns The parsed body
 * @throws {Error} If the request fails
 */
async function downloadJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  return (await (await request(url, headers)).json()) as T;
}

/**
 * Fetches a URL and returns its body as text.
 *
 * @param url - The URL
 * @returns The body
 * @throws {Error} If the request fails
 */
async function downloadText(url: string): Promise<string> {
  return (await request(url)).text();
}

/**
 * Returns the published versions of an npm package.
 *
 * @param name - The package name
 * @returns The versions
 */
async function npmVersions(name: string): Promise<string[]> {
  const accept = { Accept: "application/vnd.npm.install-v1+json" };
  const doc = await downloadJson<NpmDocument>(SOURCES.npmPackage(name), accept);
  return Object.keys(doc.versions);
}

/**
 * Downloads the data that does not depend on the VS Code release.
 *
 * @returns The lookup data
 */
export async function loadSharedData(): Promise<SharedData> {
  const [electron, typesVscode, typesNode, nodeSchedule] = await Promise.all([
    downloadJson<ElectronRelease[]>(SOURCES.electronReleases),
    npmVersions("@types/vscode"),
    npmVersions("@types/node"),
    downloadJson<SharedData["nodeSchedule"]>(SOURCES.nodeSchedule),
  ]);
  const electronNode = Object.fromEntries(electron.map((r) => [r.version, r.node]));
  return { electronNode, typesVscode, typesNode, nodeSchedule };
}

/**
 * Looks up the Electron version of a VS Code release.
 *
 * @param vscode - The VS Code version (a tag in `microsoft/vscode`)
 * @returns The Electron version
 * @throws {Error} If the tag has no `.npmrc` with a target
 */
export async function electronOf(vscode: string): Promise<string> {
  const electron = parseElectronTarget(await downloadText(SOURCES.vscodeFile(vscode, ".npmrc")));
  if (!electron) {
    throw new Error(`No Electron target in the .npmrc of VS Code ${vscode}`);
  }
  return electron;
}

/**
 * Lists the VS Code releases `x.y.0` from the given minor version on, with their
 * release dates, newest last. Uses `GITHUB_TOKEN` or `GH_TOKEN` if set.
 *
 * @param fromMinor - The lowest minor version to list
 * @returns The releases
 */
export async function listReleases(fromMinor: number): Promise<Release[]> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const releases: Release[] = [];
  for (let page = 1; ; page++) {
    const batch = await downloadJson<GitHubRelease[]>(`${SOURCES.vscodeReleases}?per_page=100&page=${page}`, headers);
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
