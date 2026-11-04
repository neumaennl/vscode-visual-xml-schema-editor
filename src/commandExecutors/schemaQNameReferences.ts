/**
 * A walk over every QName-valued attribute of a schema: the references to types, elements,
 * attributes, groups, attribute groups and identity constraints, wherever they occur, and the
 * prefixed names in the XPath expressions of identity constraints.
 *
 * The walk is generic: it visits every object of the schema tree and recognizes the QNames by
 * the names of their properties, so it does not miss a place that a hand-written traversal
 * would have to list. Annotations are skipped, because their `appinfo` holds arbitrary XML.
 *
 * Exported functions:
 * - {@link forEachQNameReference} — calls a visitor for every QName, which may replace it.
 */

import { schema } from "../../shared/types.js";

/**
 * What a QName refers to, which decides the symbol space it is looked up in. `xpath` is a name in
 * the `xpath` of a `selector` or `field`, which names an element or attribute of the instance
 * document rather than a component of the schema.
 */
export type QNameKind = "type" | "element" | "attribute" | "group" | "attributeGroup" | "identityConstraint" | "xpath";

/** A QName in the schema, which a visitor can read and replace. */
export interface QNameReference {
  /** What the QName refers to */
  readonly kind: QNameKind;
  /** The QName, for example `tns:Address` */
  readonly value: string;
  /** Replaces the QName in the schema. */
  replace(newValue: string): void;
}

/** The properties that always hold a QName, and what it refers to. */
const QNAME_PROPERTIES = new Map<string, QNameKind>([
  ["type_", "type"],
  ["base", "type"],
  ["itemType", "type"],
  ["substitutionGroup", "element"],
  ["refer", "identityConstraint"],
]);

/**
 * The kinds that a `ref` can have. The property that holds an object with a `ref` is named after
 * what the `ref` refers to, for example `group` for a group reference.
 */
const REF_KINDS: readonly QNameKind[] = ["element", "attribute", "group", "attributeGroup"];

/** An object of the schema tree, which the walk sees only through its properties. */
type SchemaNode = object;

/**
 * Calls `visit` for every QName-valued attribute of the schema. A space-separated
 * `memberTypes` list and the prefixed names of an `xpath` are visited one QName at a time.
 *
 * @param schemaObj - The schema to walk
 * @param visit - Called with every QName; it may replace the QName
 */
export function forEachQNameReference(schemaObj: schema, visit: (reference: QNameReference) => void): void {
  walk(schemaObj, undefined, visit);
}

/**
 * Visits the QNames of a node and walks its children.
 *
 * @param node - The node
 * @param holderKey - The property of the parent that holds the node, which decides what a `ref` refers to
 * @param visit - The visitor
 */
function walk(node: SchemaNode, holderKey: string | undefined, visit: (reference: QNameReference) => void): void {
  for (const [key, value] of Object.entries(node)) {
    // Properties that start with `_` are what xmlbind-ts adds besides the schema's own content, such
    // as foreign attributes and wildcard content (see isNode()); annotations hold arbitrary XML
    if (key.startsWith("_") || key === "annotation") {
      continue;
    }
    if (typeof value === "string") {
      visitProperty(node, key, holderKey, value, visit);
    } else if (Array.isArray(value)) {
      for (const child of value) {
        if (isNode(child)) walk(child, key, visit);
      }
    } else if (isNode(value)) {
      walk(value, key, visit);
    }
  }
}

/**
 * Visits a string property of a node if it holds a QName.
 *
 * @param node - The node
 * @param key - The name of the property
 * @param holderKey - The property of the parent that holds the node
 * @param value - The value of the property
 * @param visit - The visitor
 */
function visitProperty(
  node: SchemaNode,
  key: string,
  holderKey: string | undefined,
  value: string,
  visit: (reference: QNameReference) => void
): void {
  if (key === "memberTypes") {
    visitMemberTypes(node, value, visit);
    return;
  }
  if (key === "xpath") {
    visitXPath(node, value, visit);
    return;
  }
  const kind = key === "ref" ? REF_KINDS.find((refKind) => refKind === holderKey) : QNAME_PROPERTIES.get(key);
  if (kind) {
    visit({ kind, value, replace: (newValue) => { Reflect.set(node, key, newValue); } });
  }
}

/**
 * Visits the QNames of a `memberTypes` list one at a time.
 *
 * @param node - The union that holds the list
 * @param value - The space-separated list
 * @param visit - The visitor
 */
function visitMemberTypes(node: SchemaNode, value: string, visit: (reference: QNameReference) => void): void {
  const members = value.split(/\s+/).filter((member) => member.length > 0);
  members.forEach((member, index) => {
    visit({
      kind: "type",
      value: member,
      replace: (newValue) => {
        members[index] = newValue;
        Reflect.set(node, "memberTypes", members.join(" "));
      },
    });
  });
}

/**
 * Visits the prefixed names of an XPath expression one at a time.
 *
 * @param node - The selector or field that holds the expression
 * @param value - The expression
 * @param visit - The visitor
 */
function visitXPath(node: SchemaNode, value: string, visit: (reference: QNameReference) => void): void {
  const parts = splitXPath(value);
  for (let index = 1; index < parts.length; index += 2) {
    visit({
      kind: "xpath",
      value: parts[index],
      replace: (newValue) => {
        parts[index] = newValue;
        Reflect.set(node, "xpath", parts.join(""));
      },
    });
  }
}

/**
 * Splits an XPath expression of a selector or field into its prefixed names, such as `tns:item` or
 * `tns:*`, and the text between them. A name followed by `::`, such as `child::`, is an axis, not
 * a prefix.
 *
 * @param xpath - The expression
 * @returns The parts in their order; the prefixed names are at the odd indexes
 *
 * @example
 * ```typescript
 * splitXPath(".//tns:item | child::tns:*"); // [".//", "tns:item", " | child::", "tns:*", ""]
 * ```
 */
function splitXPath(xpath: string): string[] {
  const parts = [""];
  let index = 0;
  while (index < xpath.length) {
    const nameEnd = endOfName(xpath, index);
    const localEnd = xpath.charAt(nameEnd) === ":" ? endOfLocalPart(xpath, nameEnd + 1) : undefined;
    if (nameEnd > index && localEnd !== undefined) {
      parts.push(xpath.slice(index, localEnd), "");
      index = localEnd;
    } else {
      // Not a prefixed name: copy the name, or a single other character, to the text in between
      const end = Math.max(nameEnd, index + 1);
      parts[parts.length - 1] += xpath.slice(index, end);
      index = end;
    }
  }
  return parts;
}

/**
 * Returns where the local part of a prefixed name ends: a name or `*`.
 *
 * @param xpath - The expression
 * @param start - The index after the colon
 * @returns The index after the local part, or `undefined` if there is none, for example after the
 *   first colon of `::`
 */
function endOfLocalPart(xpath: string, start: number): number | undefined {
  if (xpath.charAt(start) === "*") {
    return start + 1;
  }
  const end = endOfName(xpath, start);
  return end > start ? end : undefined;
}

/**
 * Returns where a name without a colon (an NCName) ends that starts at an index.
 *
 * @param xpath - The expression
 * @param start - The index where the name may start
 * @returns The index after the name, or `start` if no name starts there
 */
function endOfName(xpath: string, start: number): number {
  if (!isNameStartChar(xpath.charAt(start))) {
    return start;
  }
  let end = start + 1;
  while (isNameChar(xpath.charAt(end))) {
    end++;
  }
  return end;
}

/**
 * Returns whether a character can start a name: a letter or `_`.
 *
 * @param char - The character, or `""` after the end of the expression
 * @returns `true` if a name can start with the character
 */
function isNameStartChar(char: string): boolean {
  return char === "_" || /\p{L}/u.test(char);
}

/**
 * Returns whether a character can continue a name: a letter, a digit, `_`, `-` or `.`.
 *
 * @param char - The character, or `""` after the end of the expression
 * @returns `true` if the character can be part of a name
 */
function isNameChar(char: string): boolean {
  return isNameStartChar(char) || char === "-" || char === "." || /\p{N}/u.test(char);
}

/**
 * Returns whether a value is an object of the schema tree.
 *
 * This relies on how xmlbind-ts represents an unmarshalled schema, which is always the case here,
 * because `SchemaModelManager.cloneSchema()` marshals and unmarshals the schema:
 * - The objects are instances of the generated classes. Attribute values are strings, numbers or
 *   booleans; xmlbind-ts would create a `Date` for a date-typed field, but the XSD classes have none,
 *   and an object without own enumerable properties would add nothing to the walk anyway.
 * - Everything else that xmlbind-ts adds is in properties that start with `_`, which the walk skips:
 *   foreign attributes (`_anyAttributes`), namespace declarations (`_namespacePrefixes`), the order
 *   of the children (`_elementOrder`) and wildcard content (`_any`).
 * - Foreign attributes keep their prefix (`x:ref`), and the raw XML of wildcard content and
 *   `appinfo` has keys such as `@_ref`, so they would not match a QName property even if the walk
 *   did not skip them.
 * - The tree comes from XML, so it has no cycles.
 *
 * `schemaQNameReferences.test.ts` checks the outcome: the look-alikes in `appinfo` and in foreign
 * attributes are not visited, and in all test and example schemas, every visited value looks like
 * a QName.
 *
 * @param value - The value
 * @returns `true` for an object that is not an array
 */
function isNode(value: unknown): value is SchemaNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
