/**
 * The commands for drops on types: on named simple and complex types and on the anonymous types of
 * elements, including the facets of a restriction, and what the drop target tells about its type.
 */

import type { RestrictionFacets, SchemaCommand } from "../../shared/types";
import { anonymousTypeId } from "../../shared/schemaUtils";
import type { DiagramItem } from "../diagram";
import { DiagramItemType, parseDerivationBaseType } from "../diagram";
import { type FacetSchemaConstruct, DraggableSchemaConstruct } from "./DraggableSchemaConstruct";

/**
 * Returns whether the item represents a named simpleType.
 *
 * @param item - The diagram item
 * @returns True if the item is a named simpleType
 */
export function isSimpleTypeNode(item: DiagramItem): boolean {
  return item.itemType === DiagramItemType.type && item.type.startsWith("simpleType");
}

/**
 * Returns whether the item represents a named complexType.
 *
 * @param item - The diagram item
 * @returns True if the item is a named complexType
 */
export function isComplexTypeNode(item: DiagramItem): boolean {
  return item.itemType === DiagramItemType.type && item.type.startsWith("complexType");
}

/**
 * Resolves a displayed restriction base type, falling back to the appropriate XSD base.
 *
 * @param item - The diagram item
 * @returns The displayed base type, or `xs:anyType` for complex types and `xs:string` otherwise
 */
export function getRestrictionBaseType(item: DiagramItem): string {
  const baseType = extractDisplayedBaseType(item.type);
  if (baseType) {
    return baseType;
  }
  return isComplexTypeNode(item) || item.hasAnonymousComplexType ? "xs:anyType" : "xs:string";
}

/**
 * Resolves a displayed extension base type, defaulting to `xs:anyType`.
 *
 * @param item - The diagram item
 * @returns The displayed base type, or `xs:anyType`
 */
export function getExtensionBaseType(item: DiagramItem): string {
  return extractDisplayedBaseType(item.type) ?? "xs:anyType";
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
  const existingFacets = item.restrictions ?? {};
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
 * Tells whether the item is a simple type, or an element with simple content, that is a restriction
 * and can therefore take facets.
 *
 * @param item - The diagram item
 * @returns True if facets can be dropped on the item
 */
function isRestrictionSimpleType(item: DiagramItem): boolean {
  return (
    (isSimpleTypeNode(item) || (item.itemType === DiagramItemType.element && item.isSimpleContent)) &&
    item.simpleTypeDerivationKind !== "list" &&
    item.simpleTypeDerivationKind !== "union" &&
    item.type.includes("restricts")
  );
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

/**
 * Reads the base type from the type text that the diagram shows.
 *
 * @param typeText - The type text of a diagram item, such as `simpleType (restricts xs:string)`
 * @returns The base type of the derivation, or the text itself if it names a type, or null for labels
 * such as `complexType` that name no type
 */
function extractDisplayedBaseType(typeText: string): string | null {
  const baseType = parseDerivationBaseType(typeText);
  if (baseType) {
    return baseType;
  }
  const trimmed = typeText.trim();
  return trimmed && !isPseudoTypeLabel(trimmed) ? trimmed : null;
}

/**
 * Tells whether the type text is a label of the diagram instead of the name of a type.
 *
 * @param typeText - The trimmed type text
 * @returns True for labels such as `complexType`, `simpleType with …` or `<anonymous …>`
 */
function isPseudoTypeLabel(typeText: string): boolean {
  return (
    typeText === "complexType" ||
    typeText === "simpleType" ||
    typeText.startsWith("complexType with ") ||
    typeText.startsWith("simpleType with ") ||
    typeText.startsWith("<anonymous ")
  );
}
