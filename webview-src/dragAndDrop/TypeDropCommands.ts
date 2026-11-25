/**
 * The commands for drops on types: on named simple and complex types and on the anonymous types of
 * elements, including the facets of a restriction, and what the drop target tells about its type.
 */

import { xsdQName } from "../../shared/builtInTypes";
import type { RestrictionFacets, SchemaCommand } from "../../shared/types";
import { anonymousTypeId } from "../../shared/schemaUtils";
import type { DiagramItem } from "../diagram";
import {
  DiagramItemType,
  getFacets,
  getBaseType,
  getNamespacePrefixes,
  getSimpleDerivation,
  getTypeName,
  hasInlineComplexType,
  isNamedComplexType,
} from "../diagram";
import { type FacetSchemaConstruct, DraggableSchemaConstruct } from "./DraggableSchemaConstruct";

/**
 * Writes a built-in type as the schema of an item writes it, such as `xs:string` (see `xsdQName()`).
 *
 * @param item - An item of the schema
 * @param localName - The name of the built-in type, such as `string`
 * @returns The reference to the type
 */
export function builtInType(item: DiagramItem, localName: string): string {
  return xsdQName(localName, getNamespacePrefixes(item.diagram));
}

/**
 * Returns the base type that a dropped restriction restricts: the base type of the target's derivation,
 * or the `type` of an element, falling back to the appropriate XSD base.
 *
 * @param item - The diagram item
 * @returns The base type, or `xs:anyType` for complex types and `xs:string` otherwise
 */
export function getRestrictionBaseType(item: DiagramItem): string {
  const baseType = getBaseType(item) ?? getTypeName(item);
  if (baseType) {
    return baseType;
  }
  return builtInType(item, isNamedComplexType(item) || hasInlineComplexType(item) ? "anyType" : "string");
}

/**
 * Returns the base type that a dropped extension extends: the base type of the target's derivation, or
 * the `type` of an element, defaulting to `xs:anyType`.
 *
 * @param item - The diagram item
 * @returns The base type, or `xs:anyType`
 */
export function getExtensionBaseType(item: DiagramItem): string {
  return getBaseType(item) ?? getTypeName(item) ?? builtInType(item, "anyType");
}

/**
 * Creates a facet modification command when the drop target is a restriction simpleType.
 *
 * @param item - The drop target
 * @param schemaConstruct - The dropped facet
 * @returns The command, or null if the target is not a restriction simpleType
 */
export function createFacetNodeDropCommand(
  item: DiagramItem,
  schemaConstruct: FacetSchemaConstruct
): SchemaCommand | null {
  if (!isRestrictionSimpleType(item)) {
    return null;
  }
  const existingFacets = getFacets(item) ?? {};
  const facet = createDefaultFacet(schemaConstruct, existingFacets);
  if (!facet) {
    return null;
  }
  return {
    type: "modifySimpleType",
    payload: {
      typeId: item.itemType === DiagramItemType.element ? anonymousTypeId(item.id, "simpleType") : item.id,
      baseType: getRestrictionBaseType(item),
      restrictions: { ...existingFacets, ...facet },
    },
  };
}

/**
 * Tells whether the item is a simple type, or an element with an inline simple type, that restricts a named
 * base type and can therefore take facets.
 *
 * @param item - The diagram item
 * @returns True if facets can be dropped on the item
 */
function isRestrictionSimpleType(item: DiagramItem): boolean {
  const derivation = getSimpleDerivation(item);
  return derivation?.kind === "restriction" && derivation.base !== undefined;
}

/** The pattern of the first dropped pattern facet; it accepts every value without line breaks. */
const FIRST_PATTERN = ".*";

/**
 * The pattern appended by a pattern drop to a restriction that already has patterns. Patterns of one
 * restriction are alternatives, so it only adds values without letters, digits and whitespace.
 */
const ADDITIONAL_PATTERN = "[^a-zA-Z0-9\\s]*";

/**
 * Creates the default value of a dropped facet. An enumeration or a pattern is appended to the existing
 * values instead of replacing them; every other facet overwrites the existing one.
 *
 * @param schemaConstruct - The facet dropped from the palette.
 * @param existingFacets - The facets the drop target already has.
 * @returns The facet to merge into the existing facets, or `null` if the schema construct is no facet.
 */
function createDefaultFacet(
  schemaConstruct: FacetSchemaConstruct,
  existingFacets: RestrictionFacets
): RestrictionFacets | null {
  switch (schemaConstruct) {
    case DraggableSchemaConstruct.Enumeration: {
      const existingValues = existingFacets.enumeration ?? [];
      return { enumeration: [...existingValues, createUniqueEnumerationValue(existingValues)] };
    }
    case DraggableSchemaConstruct.Pattern: {
      const existingPatterns = existingFacets.pattern ?? [];
      const pattern = existingPatterns.length > 0 ? ADDITIONAL_PATTERN : FIRST_PATTERN;
      return { pattern: [...existingPatterns, pattern] };
    }
    case DraggableSchemaConstruct.Length:
    case DraggableSchemaConstruct.MinLength:
    case DraggableSchemaConstruct.MaxLength:
    case DraggableSchemaConstruct.TotalDigits:
    case DraggableSchemaConstruct.FractionDigits:
      return { [schemaConstruct]: 1 };
    case DraggableSchemaConstruct.MinExclusive:
    case DraggableSchemaConstruct.MinInclusive:
    case DraggableSchemaConstruct.MaxExclusive:
    case DraggableSchemaConstruct.MaxInclusive:
      return { [schemaConstruct]: "0" };
    case DraggableSchemaConstruct.WhiteSpace:
      return { whiteSpace: "preserve" };
  }
}

/**
 * Creates an enumeration value that the restriction does not contain yet.
 *
 * @param existingValues - The enumeration values the restriction already has.
 * @returns `value`, or `value2`, `value3`, … with the lowest number that is not in use yet.
 */
function createUniqueEnumerationValue(existingValues: readonly string[]): string {
  const usedValues = new Set(existingValues);
  if (!usedValues.has("value")) {
    return "value";
  }
  let suffix = 2;
  while (usedValues.has(`value${suffix}`)) {
    suffix++;
  }
  return `value${suffix}`;
}
