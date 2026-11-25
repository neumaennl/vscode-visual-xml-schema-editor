/**
 * Reads the values of the schema object that a diagram item stands for, and facts about the schema that a
 * diagram shows. Besides the diagram builder, this is the only module of the webview that knows the shape of
 * the generated schema classes (see ADR 007): the renderer, the properties panel and the drop rules read the
 * schema through these functions.
 */

import type {
  NamespacePrefixes,
  all,
  allType,
  explicitGroup,
  groupRef,
  localComplexType,
  localElement,
  localSimpleType,
  namedGroup,
  narrowMaxMin,
  schema,
  simpleExplicitGroup,
  topLevelComplexType,
  topLevelElement,
  topLevelSimpleType,
} from "../../shared/types";
import { parseMaxOccurs, UNBOUNDED, type MaxOccurs } from "../../shared/occurrences";
import type { DiagramItem } from "./DiagramItem";
import type { Diagram } from "./Diagram";

/**
 * The schema object that a diagram item stands for: the schema, an element (whose item also shows its
 * anonymous type), a named type, a group definition, a compositor or a group reference.
 */
export type DiagramSchemaObject =
  | schema
  | topLevelElement
  | localElement
  | narrowMaxMin
  | topLevelComplexType
  | topLevelSimpleType
  | namedGroup
  | explicitGroup
  | simpleExplicitGroup
  | all
  | allType
  | groupRef;

/** An element: top-level, local, or local in an `xs:all`. */
export type ElementObject = topLevelElement | localElement | narrowMaxMin;

/** A named complex type or the inline complex type of an element. */
export type ComplexTypeObject = topLevelComplexType | localComplexType;

/** A named simple type or the inline simple type of an element. */
export type SimpleTypeObject = topLevelSimpleType | localSimpleType;

/**
 * Returns the name of the schema component that an item stands for.
 *
 * @param item - The diagram item
 * @returns The name, or `undefined` if the component has none, such as a reference or a compositor
 */
export function getName(item: DiagramItem): string | undefined {
  return (item.schemaObject as { name?: string }).name;
}

/**
 * Returns the `ref` of an element or group reference.
 *
 * @param item - The diagram item
 * @returns The QName of the referenced component, or `undefined` if the item is no reference
 */
export function getReference(item: DiagramItem): string | undefined {
  return (item.schemaObject as { ref?: string }).ref;
}

/**
 * Returns whether an item is a reference to a top-level element or group.
 *
 * @param item - The diagram item
 * @returns Whether its schema object has a `ref`
 */
export function isReference(item: DiagramItem): boolean {
  return getReference(item) !== undefined;
}

/**
 * Returns whether an element is nillable.
 *
 * @param item - The diagram item
 * @returns Whether `nillable` is true
 */
export function isNillable(item: DiagramItem): boolean {
  return (item.schemaObject as ElementObject).nillable === true;
}

/**
 * Returns whether an element or complex type is abstract.
 *
 * @param item - The diagram item
 * @returns Whether `abstract` is true
 */
export function isAbstract(item: DiagramItem): boolean {
  return (item.schemaObject as topLevelElement | topLevelComplexType).abstract === true;
}

/**
 * Returns the default value of an element.
 *
 * @param item - The diagram item
 * @returns The value, or `undefined` if the element has none
 */
export function getDefaultValue(item: DiagramItem): string | undefined {
  return (item.schemaObject as ElementObject).default_;
}

/**
 * Returns the fixed value of an element.
 *
 * @param item - The diagram item
 * @returns The value, or `undefined` if the element has none
 */
export function getFixedValue(item: DiagramItem): string | undefined {
  return (item.schemaObject as ElementObject).fixed;
}

/**
 * The occurrence attributes of a particle. Most schema classes store them as numbers, `narrowMaxMin` and
 * `all` as strings.
 */
interface Occurrences {
  minOccurs?: number | string;
  maxOccurs?: number | string;
}

/**
 * Reads an occurrence attribute as a number.
 *
 * @param value - The value of the attribute
 * @returns The number, or 1, the default of both attributes, if the attribute is missing or no number
 */
function readOccurs(value: number | string | undefined): number {
  const parsed = Number(value ?? 1);
  return Number.isNaN(parsed) ? 1 : parsed;
}

/**
 * Returns the `minOccurs` of an element, compositor or group reference.
 *
 * @param item - The diagram item
 * @returns The value, 1 if the schema object does not set it
 */
export function getMinOccurs(item: DiagramItem): number {
  return readOccurs((item.schemaObject as Occurrences).minOccurs);
}

/**
 * Returns the `maxOccurs` of an element, compositor or group reference.
 *
 * @param item - The diagram item
 * @returns The value, 1 if the schema object does not set it or sets no valid value
 */
export function getMaxOccurs(item: DiagramItem): MaxOccurs {
  const maxOccurs = (item.schemaObject as Occurrences).maxOccurs;
  if (maxOccurs === undefined) {
    return 1;
  }
  return parseMaxOccurs(maxOccurs) ?? 1;
}

/**
 * Returns whether an item can occur more than once, which the diagram shows with a second outline.
 * `maxOccurs="0"`, with which a restriction removes an optional element of its base type, is not repeated.
 *
 * @param item - The diagram item
 * @returns Whether `maxOccurs` is greater than 1 or `unbounded`
 */
export function isRepeated(item: DiagramItem): boolean {
  const maxOccurs = getMaxOccurs(item);
  return maxOccurs === UNBOUNDED || maxOccurs > 1;
}

// ===== Facts about the schema that a diagram shows =====

/**
 * Returns the target namespace of the schema that a diagram shows.
 *
 * @param diagram - The diagram
 * @returns The target namespace, or the empty string if the schema has none
 */
export function getTargetNamespace(diagram: Diagram): string {
  return diagram.schema.targetNamespace ?? "";
}

/**
 * Returns the namespace declarations of the schema that a diagram shows.
 *
 * @param diagram - The diagram
 * @returns The prefixes and their namespace URIs; the default namespace has the prefix `""`
 */
export function getNamespacePrefixes(diagram: Diagram): Readonly<NamespacePrefixes> {
  return diagram.schema._namespacePrefixes ?? {};
}

/**
 * Returns the namespaces that the schema that a diagram shows imports.
 *
 * @param diagram - The diagram
 * @returns The namespaces of the imports that name one
 */
export function getImportedNamespaces(diagram: Diagram): string[] {
  return (diagram.schema.import_ ?? []).flatMap((imp) => (imp.namespace === undefined ? [] : [imp.namespace]));
}

/**
 * Returns whether the schema that a diagram shows includes other schemas.
 *
 * @param diagram - The diagram
 * @returns Whether it has an `xs:include`
 */
export function hasIncludes(diagram: Diagram): boolean {
  return (diagram.schema.include ?? []).length > 0;
}

/**
 * Returns the names of the named simple and complex types of the schema that a diagram shows.
 *
 * @param diagram - The diagram
 * @returns The names, without prefix
 */
export function getLocalTypeNames(diagram: Diagram): string[] {
  const types = [...(diagram.schema.simpleType ?? []), ...(diagram.schema.complexType ?? [])];
  return types.flatMap((type) => (type.name ? [type.name] : []));
}
