// Adds the `.js` extension to the relative imports in the TypeScript files of the
// given folders, as ES modules require. `./a` becomes `./a.js` if `a.ts` exists and
// `./a/index.js` if `a` is a folder with an `index.ts`. `xsd2ts` writes imports
// without extensions, so `npm run generate-classes-from-schema` runs this afterwards.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Relative module specifiers after `from`, a side-effect `import`, or `import(`. */
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.{1,2}(?:\/[^"']*)?)\2/g;

/**
 * Adds the extension to the relative imports in the source text of one file.
 *
 * @param source - The text of the file
 * @param file - The path of the file, to resolve the imports against
 * @returns The text with the extensions added
 */
export function addExtensions(source: string, file: string): string {
  return source.replace(SPECIFIER, (match, prefix: string, quote: string, specifier: string) => {
    if (/\.[cm]?[jt]s$|\.json$/.test(specifier)) {
      return match;
    }
    const target = resolve(dirname(file), specifier);
    if (existsSync(`${target}.ts`)) {
      return `${prefix}${quote}${specifier}.js${quote}`;
    }
    if (existsSync(join(target, "index.ts"))) {
      return `${prefix}${quote}${specifier.replace(/\/$/, "")}/index.js${quote}`;
    }
    return match;
  });
}

/**
 * Adds the extensions to the relative imports of all `.ts` files below a folder.
 *
 * @param dir - The folder
 */
export function addExtensionsInFolder(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      addExtensionsInFolder(path);
    } else if (path.endsWith(".ts")) {
      const source = readFileSync(path, "utf8");
      const updated = addExtensions(source, path);
      if (updated !== source) {
        writeFileSync(path, updated);
      }
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.argv.slice(2).forEach(addExtensionsInFolder);
}
