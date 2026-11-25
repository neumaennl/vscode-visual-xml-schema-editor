/**
 * The names that the constraints of XML Schema compare: expanded names such as `{urn:t}Address`, made of
 * a namespace and a local name, and the lookup of the schema's own top-level components by a QName.
 */

import { localNameIfInTargetNamespace, resolveQName } from "../../shared/qNames.js";
import { formChoice } from "../../shared/types.js";
import type { NamespacePrefixes, schema } from "../../shared/types.js";
import type { NamedComponent, ReferenceHolder } from "../../shared/schemaObjects.js";

/** What resolving the names of a schema needs: the schema, its target namespace and its namespace declarations. */
export interface SchemaNames {
  /** The schema. */
  schemaObj: schema;
  /** The target namespace, or the empty string if the schema has none. */
  targetNamespace: string;
  /** The namespace declarations of the schema element. */
  prefixes: NamespacePrefixes;
}

/**
 * Collects what resolving the names of a schema needs.
 *
 * @param schemaObj - The schema
 * @returns The names of the schema
 */
export function schemaNamesOf(schemaObj: schema): SchemaNames {
  return {
    schemaObj,
    targetNamespace: schemaObj.targetNamespace?.toString() ?? "",
    prefixes: schemaObj._namespacePrefixes ?? {},
  };
}

/**
 * Returns an expanded name, `{namespace}localName`.
 *
 * @param namespace - The namespace, or the empty string for none
 * @param localName - The local name
 * @returns The expanded name
 */
function expandedName(namespace: string, localName: string): string {
  return `{${namespace}}${localName}`;
}

/**
 * Returns the local name of an expanded name, for messages. A QName with a prefix that is not declared,
 * which {@link expandedNameOf} keeps as written, is returned as it is.
 *
 * @param name - The expanded name, such as `{urn:t}a`
 * @returns The local name, such as `a`
 */
export function localNameOf(name: string): string {
  return name.startsWith("{") ? name.slice(name.indexOf("}") + 1) : name;
}

/**
 * Returns the expanded name of a QName, resolved with the namespace declarations of the schema (see
 * `resolveQName()`). A prefix that is not declared is kept as written, so that two such QNames are only
 * equal if they are written the same.
 *
 * @param qName - The QName, such as `xs:string`
 * @param names - The names of the schema
 * @returns The expanded name
 */
export function expandedNameOf(qName: string, names: SchemaNames): string {
  const resolved = resolveQName(qName, names.prefixes);
  return resolved ? expandedName(resolved.namespace, resolved.localName) : qName;
}

/**
 * Returns the expanded name of a top-level component of the schema.
 *
 * @param localName - The name of the component
 * @param names - The names of the schema
 * @returns The expanded name, in the target namespace
 */
export function topLevelName(localName: string, names: SchemaNames): string {
  return expandedName(names.targetNamespace, localName);
}

/**
 * Returns the expanded name of a local element or attribute declaration. It is in the target namespace
 * if it is qualified, by its `form` or else by the default of the schema; otherwise it is in no
 * namespace.
 *
 * @param localName - The name of the declaration
 * @param form - The `form` of the declaration, if it has one
 * @param formDefault - The `elementFormDefault` or `attributeFormDefault` of the schema
 * @param names - The names of the schema
 * @returns The expanded name
 */
export function localDeclarationName(
  localName: string,
  form: formChoice | undefined,
  formDefault: formChoice | undefined,
  names: SchemaNames
): string {
  const isQualified = (form ?? formDefault) === formChoice.qualified;
  return expandedName(isQualified ? names.targetNamespace : "", localName);
}

/**
 * Calls a function for each top-level component that references refer to, once: a component that was
 * already visited, through these or other references, is skipped, which also ends cycles.
 *
 * @param references - The references, such as group references
 * @param components - The top-level components that they can refer to
 * @param names - The names of the schema
 * @param visited - The components that were already visited; the visited ones are added
 * @param visit - Called for each component
 */
export function forEachReferencedComponent<T extends NamedComponent>(
  references: readonly ReferenceHolder[],
  components: readonly T[] | undefined,
  names: SchemaNames,
  visited: Set<object>,
  visit: (component: T) => void
): void {
  for (const reference of references) {
    const component = reference.ref ? findComponentInTargetNamespace(reference.ref, components, names) : undefined;
    if (component && !visited.has(component)) {
      visited.add(component);
      visit(component);
    }
  }
}

/**
 * Finds the top-level component of the schema that a QName refers to (see `localNameIfInTargetNamespace()`).
 *
 * @param qName - The QName, such as `tns:Address`
 * @param components - The top-level components of one kind
 * @param names - The names of the schema
 * @returns The component, or `undefined` if the QName refers to another schema or to no component
 */
export function findComponentInTargetNamespace<T extends NamedComponent>(
  qName: string,
  components: readonly T[] | undefined,
  names: SchemaNames
): T | undefined {
  const name = localNameIfInTargetNamespace(qName, names.prefixes, names.targetNamespace);
  return name === undefined ? undefined : components?.find((component) => component.name === name);
}
