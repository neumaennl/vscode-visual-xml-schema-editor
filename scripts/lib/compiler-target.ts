// Looks up the ECMAScript edition for a Node major version in the @tsconfig/bases
// configurations, and finds and replaces the edition in the TypeScript and ESLint
// configurations of the project. Used by vscode-version.ts.
//
// The edition is only the `target` of the base (for example `es2024` for Node 24);
// its `ESNext.*` libraries are left out, because their content changes with every
// TypeScript release. The configurations name the edition in `target`, in the
// `ESxxxx` entries of `lib` (other entries such as `DOM` stay) and, in
// `eslint.config.mjs`, in `ecmaVersion`.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** A place in a configuration that names the ECMAScript edition. */
export interface EditionUse {
  file: string;
  setting: string;
  /** The edition, for example `ES2024`. */
  value: string;
}

/** How a kind of configuration file names the edition. */
interface EditionRule {
  /** Whether the rule applies to a file name. */
  applies: (file: string) => boolean;
  /** Lists the settings and editions in the text of a file. */
  find: (text: string) => { setting: string; value: string }[];
  /** Replaces every edition in the text of a file. */
  replace: (text: string, edition: string) => string;
}

const TSCONFIG = /^tsconfig.*\.json$/;
const ESLINT_CONFIG = "eslint.config.mjs";
const TARGET = /("target"\s*:\s*")(es\d{4})(")/gi;
const LIB = /("lib"\s*:\s*\[)([^\]]*)(\])/gi;
const LIB_ENTRY = /(")(es\d{4})(")/gi;
const ECMA_VERSION = /(ecmaVersion\s*:\s*)(\d{4})(\b)/g;

/**
 * Returns all matches of a global regular expression in a text.
 *
 * @param regex - The regular expression, with the flag `g`
 * @param text - The text
 * @returns The matches
 */
function matches(regex: RegExp, text: string): RegExpExecArray[] {
  return [...text.matchAll(regex)];
}

/**
 * Replaces the second group of every match, keeping the groups before and after it.
 *
 * @param text - The text
 * @param regex - A regular expression with three groups, with the flag `g`
 * @param value - Returns the replacement of the second group from its old content
 * @returns The changed text
 */
function replaceMiddle(text: string, regex: RegExp, value: (old: string) => string): string {
  return text.replace(regex, (_match, before: string, old: string, after: string) => `${before}${value(old)}${after}`);
}

const RULES: EditionRule[] = [
  {
    applies: (file) => TSCONFIG.test(file),
    find: (text) => [
      ...matches(TARGET, text).map((m) => ({ setting: "target", value: m[2].toUpperCase() })),
      ...matches(LIB, text).flatMap((lib) => matches(LIB_ENTRY, lib[2]).map((m) => ({ setting: "lib", value: m[2].toUpperCase() }))),
    ],
    replace: (text, edition) =>
      replaceMiddle(
        replaceMiddle(text, TARGET, () => edition),
        LIB,
        (entries) => replaceMiddle(entries, LIB_ENTRY, () => edition),
      ),
  },
  {
    applies: (file) => file === ESLINT_CONFIG,
    find: (text) => matches(ECMA_VERSION, text).map((m) => ({ setting: "ecmaVersion", value: `ES${m[2]}` })),
    replace: (text, edition) => replaceMiddle(text, ECMA_VERSION, () => edition.slice(2)),
  },
];

/**
 * Returns the URL of the @tsconfig/bases configuration for a Node major version.
 *
 * @param major - The major version of Node
 * @returns The URL
 */
export function baseUrl(major: number): string {
  return `https://raw.githubusercontent.com/tsconfig/bases/main/bases/node${major}.json`;
}

/**
 * Takes the ECMAScript edition from the `target` of a @tsconfig/bases configuration.
 *
 * @param text - The configuration
 * @param url - Where it comes from, for messages
 * @returns The edition in upper case, for example `ES2024`
 * @throws {Error} If the text is not JSON or its target is not an edition `ESxxxx`
 */
export function parseBaseEdition(text: string, url: string): string {
  let config: { compilerOptions?: { target?: unknown } };
  try {
    config = JSON.parse(text) as typeof config;
  } catch {
    throw new Error(`${url}: not valid JSON.`);
  }
  const target = config.compilerOptions?.target;
  if (typeof target !== "string" || !/^es\d{4}$/i.test(target)) {
    throw new Error(`${url}: expected a target ESxxxx, found ${JSON.stringify(target)}.`);
  }
  return target.toUpperCase();
}

/**
 * Downloads the ECMAScript edition of the @tsconfig/bases configuration for a Node major version.
 *
 * @param major - The major version of Node
 * @returns The edition, or undefined if there is no configuration for the version
 * @throws {Error} If the request fails for another reason or the configuration has no edition
 */
export async function loadEdition(major: number): Promise<string | undefined> {
  const url = baseUrl(major);
  const response = await fetch(url);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return parseBaseEdition(await response.text(), url);
}

/**
 * Downloads the ECMAScript editions for several Node major versions.
 *
 * @param majors - The major versions of Node
 * @returns The edition per major version, undefined for those without a configuration
 */
export async function loadEditions(majors: number[]): Promise<Map<number, string | undefined>> {
  const unique = [...new Set(majors)];
  const editions = await Promise.all(unique.map(loadEdition));
  return new Map(unique.map((major, i) => [major, editions[i]]));
}

/**
 * Lists the configuration files of the project that name the edition, with their rule.
 *
 * @param dir - The root folder of the project
 * @returns The file names and their rules, sorted by name
 */
function configFiles(dir: string): { file: string; rule: EditionRule }[] {
  return readdirSync(dir)
    .sort().flatMap((file) => RULES.filter((rule) => rule.applies(file)).map((rule) => ({ file, rule })));
}

/**
 * Finds every place in the configurations that names the ECMAScript edition.
 *
 * @param dir - The root folder of the project
 * @returns The places, in the order of the files and within a file
 */
export function findEditions(dir: string): EditionUse[] {
  return configFiles(dir).flatMap(({ file, rule }) => rule.find(readFileSync(join(dir, file), "utf8")).map((use) => ({ file, ...use })));
}

/**
 * Reads the ECMAScript edition in the `target` of a TypeScript configuration.
 *
 * @param path - The path of the configuration
 * @returns The edition, for example `ES2024`
 * @throws {Error} If the configuration has no target `ESxxxx`
 */
export function readTarget(path: string): string {
  const target = matches(TARGET, readFileSync(path, "utf8"))[0]?.[2];
  if (!target) {
    throw new Error(`${path}: expected a target ESxxxx.`);
  }
  return target.toUpperCase();
}

/**
 * Checks the configurations against the ECMAScript edition of a Node major version.
 *
 * @param dir - The root folder of the project
 * @param major - The major version of Node
 * @param edition - Its edition from @tsconfig/bases, or undefined if there is none
 * @returns One message per problem, empty if all places name the edition
 */
export function editionProblems(dir: string, major: number, edition: string | undefined): string[] {
  if (!edition) {
    return [`There is no @tsconfig/bases configuration for Node ${major}.`];
  }
  return findEditions(dir)
    .filter((use) => use.value !== edition)
    .map((use) => `${use.file}: ${use.setting} is ${use.value}, expected ${edition}`);
}

/**
 * Replaces the ECMAScript edition in all configurations. Only the editions are
 * changed; the rest of each file, including its line endings, stays as it is.
 *
 * @param dir - The root folder of the project
 * @param edition - The edition, for example `ES2024`
 * @returns The names of the files that changed
 */
export function writeEdition(dir: string, edition: string): string[] {
  const changed = new Set<string>();
  for (const { file, rule } of configFiles(dir)) {
    const path = join(dir, file);
    const text = readFileSync(path, "utf8");
    const replaced = rule.replace(text, edition);
    if (replaced !== text) {
      writeFileSync(path, replaced);
      changed.add(file);
    }
  }
  return [...changed];
}
