/**
 * QNames and namespace prefixes: splitting a QName, the reserved prefixes, and the functions on a map of
 * namespace declarations (prefix → namespace URI, the empty prefix for the default namespace). They work
 * on strings and maps, not on schema objects (see ADR 006).
 */

import type { NamespacePrefixes } from "./commands/schema.js";

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
