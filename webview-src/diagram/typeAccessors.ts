/**
 * Reads the types of the schema objects that diagram items stand for: the type of an element, its inline
 * types, the derivation of complex and simple types, whether a complex type has mixed content, the facets of
 * restrictions and the attributes of complex types and of the schema. Like `schemaAccessors`, this module knows the
 * shape of the generated schema classes, so that the renderer, the properties panel and the drop rules
 * do not (see ADR 007).
 */

import type { attribute, ComplexTypeDerivationKind, RestrictionFacets } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import { isWhiteSpaceValue, LIST_FACETS, SINGLE_VALUE_FACETS } from "../../shared/facets";
import type { DiagramItem } from "./DiagramItem";
import type { DiagramAttribute } from "./DiagramTypes";
import type { ComplexTypeObject, ElementObject, SimpleTypeObject } from "./schemaAccessors";
import { getAttributeContainer, type AttributeContainer } from "../../shared/schemaUtils";

/** The derivation of a complex type from a base type. */
export interface ComplexDerivation {
  /** Whether the complex type extends or restricts its base type */
  kind: ComplexTypeDerivationKind;
  /** The base type, if the derivation names one */
  base?: string;
  /** Whether the derivation is the content of `xs:simpleContent` or of `xs:complexContent` */
  content: "simple" | "complex";
}

/** The body of a simple type: a restriction of a base type, a list or a union. */
export type SimpleDerivation =
  | { kind: "restriction"; base?: string }
  | { kind: "list"; itemType?: string }
  | { kind: "union"; memberTypes: string[] };

/**
 * Returns the schema object of an element item as an element.
 *
 * @param item - The diagram item
 * @returns The element, or `undefined` if the item is no element
 */
function elementOf(item: DiagramItem): ElementObject | undefined {
  return item.nodeType === SchemaNodeType.Element ? (item.schemaObject as ElementObject) : undefined;
}

/**
 * Returns the complex type that an item shows: a named complex type or the inline complex type of an
 * element.
 *
 * @param item - The diagram item
 * @returns The complex type, or `undefined` if the item shows none
 */
function complexTypeOf(item: DiagramItem): ComplexTypeObject | undefined {
  return isNamedComplexType(item) ? (item.schemaObject as ComplexTypeObject) : elementOf(item)?.complexType;
}

/**
 * Returns the simple type that an item shows: a named simple type or the inline simple type of an element.
 *
 * @param item - The diagram item
 * @returns The simple type, or `undefined` if the item shows none
 */
function simpleTypeOf(item: DiagramItem): SimpleTypeObject | undefined {
  return isNamedSimpleType(item) ? (item.schemaObject as SimpleTypeObject) : elementOf(item)?.simpleType;
}

/**
 * Returns whether an item is a named simple type.
 *
 * @param item - The diagram item
 * @returns Whether the item is a top-level `xs:simpleType`
 */
export function isNamedSimpleType(item: DiagramItem): boolean {
  return item.nodeType === SchemaNodeType.SimpleType;
}

/**
 * Returns whether an item is a named complex type.
 *
 * @param item - The diagram item
 * @returns Whether the item is a top-level `xs:complexType`
 */
export function isNamedComplexType(item: DiagramItem): boolean {
  return item.nodeType === SchemaNodeType.ComplexType;
}

/**
 * Returns the `type` attribute of an element.
 *
 * @param item - The diagram item
 * @returns The QName of the type, or `undefined` if the item is no element or has no `type`
 */
export function getTypeName(item: DiagramItem): string | undefined {
  return elementOf(item)?.type_;
}

/**
 * Returns whether an element has an inline complex type.
 *
 * @param item - The diagram item
 * @returns Whether the item is an element with an anonymous `xs:complexType`
 */
export function hasInlineComplexType(item: DiagramItem): boolean {
  return elementOf(item)?.complexType !== undefined;
}

/**
 * Returns whether an element has an inline simple type.
 *
 * @param item - The diagram item
 * @returns Whether the item is an element with an anonymous `xs:simpleType`
 */
export function hasInlineSimpleType(item: DiagramItem): boolean {
  return elementOf(item)?.simpleType !== undefined;
}

/**
 * Returns whether the complex type that an item shows has simple content: text of a simple type with
 * attributes.
 *
 * @param item - The diagram item
 * @returns Whether the named or inline complex type has `xs:simpleContent`
 */
export function hasSimpleContent(item: DiagramItem): boolean {
  return complexTypeOf(item)?.simpleContent !== undefined;
}

/**
 * Returns whether a complex type, or the anonymous complex type of an element, has mixed content.
 *
 * @param item - The diagram item
 * @returns Whether `mixed` is true
 */
export function isMixed(item: DiagramItem): boolean {
  return complexTypeOf(item)?.mixed === true;
}

/**
 * Returns the schema object that holds the attributes that an item shows (see
 * {@link getAttributeContainer}): the schema, or the complex type, or the extension or restriction of its
 * content.
 *
 * @param item - The diagram item
 * @returns The holder, or `undefined` if the item shows neither the schema nor a complex type
 */
function attributeHolderOf(item: DiagramItem): AttributeContainer | undefined {
  const holder = item.nodeType === SchemaNodeType.Schema ? item.schemaObject : complexTypeOf(item);
  return holder ? getAttributeContainer(holder) : undefined;
}

/**
 * Returns the named attributes that an item shows: those of the schema, or of the complex type that the
 * item shows, which live in the extension or restriction of its content if it has one. Attribute
 * references and attribute groups are not included.
 *
 * @param item - The diagram item
 * @returns The attributes, empty if the item has none
 */
export function getAttributes(item: DiagramItem): DiagramAttribute[] {
  const attributes = attributeHolderOf(item)?.attribute ?? [];
  return attributes
    .filter((attribute): attribute is attribute & { name: string } => !!attribute.name)
    .map((attribute) => ({
      name: attribute.name,
      type: attribute.type_,
      use: attribute.use,
      defaultValue: attribute.default_,
      fixedValue: attribute.fixed,
    }));
}

/**
 * Returns the derivation of the complex type that an item shows.
 *
 * @param item - The diagram item
 * @returns The derivation, or `undefined` if the item shows no complex type or it derives from no base type
 */
export function getComplexDerivation(item: DiagramItem): ComplexDerivation | undefined {
  const complexType = complexTypeOf(item);
  const holder = complexType?.complexContent ?? complexType?.simpleContent;
  if (!holder) {
    return undefined;
  }
  const content = complexType?.complexContent ? "complex" : "simple";
  if (holder.extension) {
    return { kind: "extension", base: holder.extension.base, content };
  }
  return holder.restriction ? { kind: "restriction", base: holder.restriction.base, content } : undefined;
}

/**
 * Returns the body of the simple type that an item shows. The item type of a list with an inline simple
 * type is the base type of that type's restriction.
 *
 * @param item - The diagram item
 * @returns The body, or `undefined` if the item shows no simple type or it has no body
 */
export function getSimpleDerivation(item: DiagramItem): SimpleDerivation | undefined {
  const simpleType = simpleTypeOf(item);
  if (simpleType?.restriction) {
    return { kind: "restriction", base: simpleType.restriction.base };
  }
  if (simpleType?.list) {
    return { kind: "list", itemType: simpleType.list.itemType ?? simpleType.list.simpleType?.restriction?.base };
  }
  if (simpleType?.union) {
    const memberTypes = (simpleType.union.memberTypes ?? "").split(/\s+/).filter((memberType) => memberType);
    return { kind: "union", memberTypes };
  }
  return undefined;
}

/**
 * Returns the base type of the derivation of the type that an item shows: of a complex type, or of a
 * simple type that is a restriction.
 *
 * @param item - The diagram item
 * @returns The base type, or `undefined` if the type derives from no named base type
 */
export function getBaseType(item: DiagramItem): string | undefined {
  const simpleDerivation = getSimpleDerivation(item);
  return (
    getComplexDerivation(item)?.base ?? (simpleDerivation?.kind === "restriction" ? simpleDerivation.base : undefined)
  );
}

/**
 * Tells whether XML Schema allows the value of a single-value facet. Only `whiteSpace` has a fixed set of
 * values: `preserve`, `replace` and `collapse`.
 *
 * @param key - The facet
 * @param value - Its value
 * @returns Whether the value is allowed
 */
function isAllowedFacetValue(key: (typeof SINGLE_VALUE_FACETS)[number], value: string | number): boolean {
  return key !== "whiteSpace" || isWhiteSpaceValue(String(value));
}

/**
 * Returns the facets of the restriction of the simple type that an item shows. The values keep the types
 * of the generated facet classes: numbers for the lengths and digits. A value that XML Schema does not
 * allow is left out (see {@link isAllowedFacetValue}).
 *
 * @param item - The diagram item
 * @returns The facets, or `undefined` if the item shows no restriction of a simple type or it has no facets
 */
export function getFacets(item: DiagramItem): RestrictionFacets | undefined {
  const holder = simpleTypeOf(item)?.restriction;
  if (!holder) {
    return undefined;
  }
  const facets: Record<string, string | number | string[]> = {};
  for (const key of LIST_FACETS) {
    const values = (holder[key] ?? []).map((facet) => facet.value);
    if (values.length > 0) {
      facets[key] = values;
    }
  }
  for (const key of SINGLE_VALUE_FACETS) {
    const value = holder[key]?.[0]?.value;
    if (value !== undefined && isAllowedFacetValue(key, value)) {
      facets[key] = value;
    }
  }
  return Object.keys(facets).length > 0 ? facets : undefined;
}

/**
 * Describes a complex derivation for the type text.
 *
 * @param complexType - The complex type
 * @param derivation - Its derivation
 * @returns The description, such as ` with complexContent (extends Base)`
 */
function describeComplexDerivation(complexType: ComplexTypeObject, derivation: ComplexDerivation | undefined): string {
  let content = "";
  if (complexType.complexContent) {
    content = " with complexContent";
  } else if (complexType.simpleContent) {
    content = " with simpleContent";
  }
  if (!derivation?.base) {
    return content;
  }
  return `${content} (${derivation.kind === "restriction" ? "restricts" : "extends"} ${derivation.base})`;
}

/**
 * Describes the body of a simple type for the type text.
 *
 * @param derivation - The body
 * @returns The description, such as ` (restricts xs:string)`
 */
function describeSimpleDerivation(derivation: SimpleDerivation | undefined): string {
  switch (derivation?.kind) {
    case "restriction":
      return derivation.base ? ` (restricts ${derivation.base})` : "";
    case "list":
      return derivation.itemType ? ` (list of ${derivation.itemType})` : " (list)";
    case "union":
      return derivation.memberTypes.length > 0 ? ` (union of ${derivation.memberTypes.join(", ")})` : " (union)";
    default:
      return "";
  }
}

/**
 * Returns the text that describes the type of an item, which the diagram shows with its label when
 * `showType` is set: the `type` of an element, or the kind of a named or inline type with its derivation,
 * such as `simpleType (restricts xs:string)` or `<anonymous complexType> with complexContent (extends Base)`.
 *
 * @param item - The diagram item
 * @returns The text, or the empty string for items without a type, such as groups
 */
export function getTypeText(item: DiagramItem): string {
  const complexType = complexTypeOf(item);
  if (complexType) {
    const start = getTypeName(item) ?? (isNamedComplexType(item) ? "complexType" : "<anonymous complexType>");
    return start + describeComplexDerivation(complexType, getComplexDerivation(item));
  }
  const simpleType = simpleTypeOf(item);
  if (simpleType) {
    const start = getTypeName(item) ?? (isNamedSimpleType(item) ? "simpleType" : "<anonymous simpleType>");
    return start + describeSimpleDerivation(getSimpleDerivation(item));
  }
  return getTypeName(item) ?? "";
}
