// Checks the rule "Named types" of docs/development-guidelines.md: the production code must not write the
// same anonymous type in several places, but name it once and use the name. Anonymous types are object
// types, unions, tuples and function types written where a type is expected; the definition of a named type
// (`type X = …`) is no anonymous type. Trivial types, which a name would not explain, are not counted:
// `X | undefined`, unions of primitive types such as `number | string`, and functions without parameters
// that return a keyword type, such as `() => void`.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/** The folders of the production code. */
const PRODUCTION_ROOTS = ["shared", "src", "webview-src"];

/** Folders that hold no production code: generated classes, tests and their helpers, and mocks. */
const SKIPPED_FOLDERS = new Set(["generated", "__tests__", "__mocks__", "node_modules"]);

/** A source file: its path and its text. */
export interface SourceText {
  /** The path, as messages show it */
  path: string;
  /** The text */
  text: string;
}

/** An anonymous type that occurs more than once, and where. */
export interface RepeatedType {
  /** The type, with whitespace and comments normalized */
  type: string;
  /** The places, as `path:line` */
  places: string[];
}

/** The keyword types, which a union of them or a function returning one does not need a name for. */
const KEYWORD_TYPES = new Set([
  ts.SyntaxKind.StringKeyword,
  ts.SyntaxKind.NumberKeyword,
  ts.SyntaxKind.BooleanKeyword,
  ts.SyntaxKind.VoidKeyword,
  ts.SyntaxKind.UndefinedKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.UnknownKeyword,
  ts.SyntaxKind.NeverKeyword,
]);

/**
 * Tells whether a type is a keyword type, such as `string` or `null`.
 *
 * @param type - The type
 * @returns True for a keyword type
 */
function isKeywordType(type: ts.TypeNode): boolean {
  return (
    KEYWORD_TYPES.has(type.kind) || (ts.isLiteralTypeNode(type) && type.literal.kind === ts.SyntaxKind.NullKeyword)
  );
}

/**
 * Tells whether a union type is trivial: `X | undefined`, `X | null` or a union of keyword types.
 *
 * @param union - The union type
 * @returns True if the union needs no name
 */
function isTrivialUnion(union: ts.UnionTypeNode): boolean {
  const members = union.types.filter(
    (member) =>
      member.kind !== ts.SyntaxKind.UndefinedKeyword &&
      !(ts.isLiteralTypeNode(member) && member.literal.kind === ts.SyntaxKind.NullKeyword)
  );
  return members.length < 2 || members.every(isKeywordType);
}

/**
 * Normalizes the text of a type, so that types that only differ in whitespace, comments or the order of the
 * members of a union are the same. The names of parameters count: `(next: string) => void` and
 * `(message: string) => void` stand for different things.
 *
 * @param type - The type
 * @returns The normalized text
 */
function normalize(type: ts.TypeNode): string {
  if (ts.isUnionTypeNode(type)) {
    return type.types
      .map(normalize)
      .sort((a, b) => a.localeCompare(b))
      .join(" | ");
  }
  if (ts.isFunctionTypeNode(type)) {
    const parameters = type.parameters.map((parameter) => {
      const rest = parameter.dotDotDotToken ? "..." : "";
      const optional = parameter.questionToken ? "?" : "";
      return `${rest}${parameter.name.getText()}${optional}: ${parameter.type ? normalize(parameter.type) : "any"}`;
    });
    return `(${parameters.join(", ")}) => ${normalize(type.type)}`;
  }
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  return printer
    .printNode(ts.EmitHint.Unspecified, type, type.getSourceFile())
    .replace(/\s+/g, " ")
    .replace(/;\s*}/g, " }")
    .replace(/\[ /g, "[")
    .replace(/ \]/g, "]");
}

/**
 * Tells whether a type is an anonymous type that the check counts.
 *
 * @param node - The node
 * @returns True for an object type, a union, a tuple or a function type that is not trivial and does not
 * define a named type
 */
function isCountedType(node: ts.Node): node is ts.TypeNode {
  if (ts.isTypeAliasDeclaration(node.parent)) {
    return false;
  }
  if (ts.isTypeLiteralNode(node)) {
    return node.members.length > 0;
  }
  if (ts.isUnionTypeNode(node)) {
    return !isTrivialUnion(node);
  }
  if (ts.isFunctionTypeNode(node)) {
    return node.parameters.length > 0 || !isKeywordType(node.type);
  }
  return ts.isTupleTypeNode(node);
}

/**
 * Finds the anonymous types that occur more than once in the given files.
 *
 * @param files - The source files
 * @returns The repeated types, in the order in which they first occur
 */
export function findRepeatedTypes(files: readonly SourceText[]): RepeatedType[] {
  const places = new Map<string, string[]>();
  for (const file of files) {
    const source = ts.createSourceFile(file.path, file.text, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (isCountedType(node)) {
        const key = normalize(node);
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        places.set(key, [...(places.get(key) ?? []), `${file.path}:${line + 1}`]);
      }
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(source, visit);
  }
  return [...places].filter(([, found]) => found.length > 1).map(([type, found]) => ({ type, places: found }));
}

/**
 * Lists the TypeScript files of the production code below a folder.
 *
 * @param dir - The folder
 * @returns The paths of the files
 */
function productionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_FOLDERS.has(entry.name) ? [] : productionFiles(path);
    }
    return entry.name.endsWith(".ts") && !/\.test(-d)?\.ts$/.test(entry.name) ? [path] : [];
  });
}

// Runs the check only when Node was started with this file (`process.argv[1]` is its absolute path), not
// when a module imports it, such as the tests, which only need `findRepeatedTypes()`. ES modules have no
// `require.main === module`, so the start path, as a file URL, is compared with the URL of this module.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = PRODUCTION_ROOTS.flatMap(productionFiles).map((path) => ({
    path: relative(".", path),
    text: readFileSync(path, "utf8"),
  }));
  const repeated = findRepeatedTypes(files);
  for (const { type, places } of repeated) {
    console.error(`✗ ${type} occurs ${places.length} times: ${places.join(", ")}`);
  }
  if (repeated.length > 0) {
    console.error(`Name these types once and use the names (see "Named types" in docs/development-guidelines.md).`);
    process.exitCode = 1;
  } else {
    console.log(`✓ No anonymous type occurs twice in ${files.length} files`);
  }
}
