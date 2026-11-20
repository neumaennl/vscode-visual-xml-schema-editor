/**
 * Names, QNames and namespaces: checking XML names, prefixes and namespace URIs, splitting a QName, the
 * reserved prefixes, and the functions on a map of namespace declarations (prefix → namespace URI, the empty prefix for the default namespace). They work
 * on strings and maps, not on schema objects (see ADR 006).
 */

import type { NamespacePrefixes } from "./commands/schema.js";
import type { ValidationResult } from "./validation.js";

/** A QName split into its parts. */
export interface SplitQName {
  /** The prefix, or undefined if the QName has none */
  prefix: string | undefined;
  /** The local name */
  localName: string;
}

/**
 * Splits a QName such as `tns:Address` into its prefix and its local name. A colon at the start does not
 * separate a prefix, since a prefix is never empty.
 *
 * @param qName - The QName
 * @returns The prefix and the local name
 */
export function splitQName(qName: string): SplitQName {
  const colon = qName.indexOf(":");
  return colon > 0
    ? { prefix: qName.slice(0, colon), localName: qName.slice(colon + 1) }
    : { prefix: undefined, localName: qName };
}

/**
 * Returns the local name of a QName that refers to a component of the schema itself: a QName without a
 * prefix, or with one of the prefixes of the schema's target namespace. A QName without a prefix counts
 * as the schema's own whatever the default namespace is, as the editor has always treated it.
 *
 * @param qName - The QName, such as `tns:Address`
 * @param ownPrefixes - The prefixes of the schema's target namespace
 * @returns The local name, or undefined if the QName has another prefix
 */
export function ownComponentName(qName: string, ownPrefixes: readonly string[]): string | undefined {
  const { prefix, localName } = splitQName(qName);
  return prefix === undefined || ownPrefixes.includes(prefix) ? localName : undefined;
}

/** The prefixes that XML reserves and that cannot be declared. */
const RESERVED_PREFIXES: ReadonlySet<string> = new Set(["xml", "xmlns"]);

/**
 * Tells whether a prefix is reserved by XML.
 *
 * @param prefix - The prefix
 * @returns True for `xml` and `xmlns`
 */
export function isReservedPrefix(prefix: string): boolean {
  return RESERVED_PREFIXES.has(prefix);
}

/**
 * Returns the prefixes that declare a namespace, in the order of the declarations.
 *
 * @param namespacePrefixes - The namespace declarations
 * @param namespaceUri - The namespace
 * @returns The prefixes, including the empty prefix if the namespace is the default namespace
 */
export function prefixesForNamespace(namespacePrefixes: Readonly<NamespacePrefixes>, namespaceUri: string): string[] {
  return Object.entries(namespacePrefixes)
    .filter(([, uri]) => uri === namespaceUri)
    .map(([prefix]) => prefix);
}

/**
 * Returns the first prefix `ns0`, `ns1`, … that is not declared yet.
 *
 * @param namespacePrefixes - The namespace declarations
 * @returns The prefix
 */
export function firstFreePrefix(namespacePrefixes: Readonly<NamespacePrefixes>): string {
  let index = 0;
  while (Object.hasOwn(namespacePrefixes, `ns${index}`)) {
    index++;
  }
  return `ns${index}`;
}

/**
 * Trims the prefixes and namespace URIs of namespace declarations and leaves out those without a URI.
 *
 * @param namespacePrefixes - The declarations
 * @returns The trimmed declarations
 */
export function normalizeNamespacePrefixes(namespacePrefixes: Readonly<NamespacePrefixes>): NamespacePrefixes {
  const normalized: NamespacePrefixes = {};
  for (const [prefix, namespaceUri] of Object.entries(namespacePrefixes)) {
    const trimmedUri = namespaceUri.trim();
    if (trimmedUri) {
      normalized[prefix.trim()] = trimmedUri;
    }
  }
  return normalized;
}

/**
 * Validates if a string is a valid XML name.
 * XML names must start with a letter or underscore, and contain only
 * letters, digits, hyphens, underscores, and periods.
 *
 * @param name - The name to validate
 * @returns true if valid XML name, false otherwise
 *
 * The pattern is ASCII-only (see "Name validation is ASCII-only" in `docs/known-issues.md`).
 */
export function isValidXmlName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }
  // XML name pattern: starts with letter or underscore,
  // followed by letters, digits, hyphens, underscores, or periods
  const xmlNamePattern = /^[a-zA-Z_][\w.-]*$/;
  return xmlNamePattern.test(name);
}

/**
 * Returns true if `value` looks like a valid absolute URI.
 * Accepts common schemes (http, https, urn, ftp, file) as well as any other
 * scheme following the pattern `"<letters>:..."` to stay flexible.
 *
 * @param value - The value to check
 * @returns True if the value is an absolute URI
 */
export function isAbsoluteUri(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+\-.]*:[^\s]+$/.test(value);
}

/**
 * Validates a namespace prefix: no surrounding whitespace, not reserved, and a valid XML name. The empty
 * prefix stands for the default namespace; the callers decide whether they allow it.
 *
 * @param prefix - The prefix
 * @returns The validation result
 */
export function validatePrefix(prefix: string): ValidationResult {
  if (prefix !== prefix.trim()) {
    return { valid: false, error: `Prefix '${prefix}' must not contain leading or trailing whitespace` };
  }
  if (isReservedPrefix(prefix)) {
    return { valid: false, error: `Prefix '${prefix}' is reserved and cannot be used` };
  }
  if (prefix && !isValidXmlName(prefix)) {
    return { valid: false, error: `Prefix '${prefix}' is not a valid XML name` };
  }
  return { valid: true };
}
