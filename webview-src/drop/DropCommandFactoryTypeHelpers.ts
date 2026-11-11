import { RestrictionFacets, SchemaCommand } from "../../shared/types";
import { generateSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem, DiagramItemType } from "../diagram";
import type { FacetPaletteConstruct } from "../palette/FacetIconStyles";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";

/** Returns whether the item represents a named simpleType. */
export function isSimpleTypeNode(item: DiagramItem): boolean {
  return item.itemType === DiagramItemType.type && item.type.startsWith("simpleType");
}

/** Returns whether the item represents a named complexType. */
export function isComplexTypeNode(item: DiagramItem): boolean {
  return item.itemType === DiagramItemType.type && item.type.startsWith("complexType");
}

/** Resolves the anonymous simpleType ID associated with an element. */
export function getAnonymousSimpleTypeId(item: DiagramItem): string {
  return generateSchemaId({
    nodeType: SchemaNodeType.AnonymousSimpleType,
    parentId: item.id,
    position: 0,
  });
}

/** Resolves the anonymous complexType ID associated with an element. */
export function getAnonymousComplexTypeId(item: DiagramItem): string {
  return generateSchemaId({
    nodeType: SchemaNodeType.AnonymousComplexType,
    parentId: item.id,
    position: 0,
  });
}

/** Resolves a displayed restriction base type, falling back to the appropriate XSD base. */
export function getRestrictionBaseType(item: DiagramItem): string {
  const baseType = extractDisplayedBaseType(item.type);
  if (baseType) {
    return baseType;
  }
  return isComplexTypeNode(item) || item.hasAnonymousComplexType ? "xs:anyType" : "xs:string";
}

/** Resolves a displayed extension base type, defaulting to xs:anyType. */
export function getExtensionBaseType(item: DiagramItem): string {
  return extractDisplayedBaseType(item.type) ?? "xs:anyType";
}

/** Creates a facet modification command when the drop target is a restriction simpleType. */
export function createFacetNodeDropCommand(
  item: DiagramItem,
  construct: FacetPaletteConstruct
): SchemaCommand | null {
  if (!isRestrictionSimpleType(item)) {
    return null;
  }
  const existingFacets = getRestrictionFacets(item);
  const facet = createDefaultFacet(construct, existingFacets);
  if (!facet) {
    return null;
  }
  return {
    type: "modifySimpleType",
    payload: {
      typeId: item.itemType === DiagramItemType.element ? getAnonymousSimpleTypeId(item) : item.id,
      baseType: getRestrictionBaseType(item),
      restrictions: { ...existingFacets, ...facet },
    },
  };
}

function isRestrictionSimpleType(item: DiagramItem): boolean {
  return (
    (isSimpleTypeNode(item) || (item.itemType === DiagramItemType.element && item.isSimpleContent)) &&
    item.simpleTypeDerivationKind !== "list" &&
    item.simpleTypeDerivationKind !== "union" &&
    item.type.includes("restricts")
  );
}

function getRestrictionFacets(item: DiagramItem): RestrictionFacets {
  return {
    enumeration: item.restrictions?.enumeration,
    pattern: item.restrictions?.pattern,
    length: item.restrictions?.length,
    minLength: item.restrictions?.minLength,
    maxLength: item.restrictions?.maxLength,
    minInclusive: item.restrictions?.minInclusive,
    maxInclusive: item.restrictions?.maxInclusive,
    minExclusive: item.restrictions?.minExclusive,
    maxExclusive: item.restrictions?.maxExclusive,
    totalDigits: item.restrictions?.totalDigits,
    fractionDigits: item.restrictions?.fractionDigits,
    whiteSpace: item.restrictions?.whiteSpace as RestrictionFacets["whiteSpace"],
  };
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
 * @param construct - The facet dropped from the palette.
 * @param existingFacets - The facets the drop target already has.
 * @returns The facet to merge into the existing facets, or `null` if the construct is no facet.
 */
function createDefaultFacet(
  construct: FacetPaletteConstruct,
  existingFacets: RestrictionFacets
): RestrictionFacets | null {
  switch (construct) {
    case PaletteSchemaConstruct.Enumeration: {
      const existingValues = existingFacets.enumeration ?? [];
      return { enumeration: [...existingValues, createUniqueEnumerationValue(existingValues)] };
    }
    case PaletteSchemaConstruct.Pattern: {
      const existingPatterns = existingFacets.pattern ?? [];
      const pattern = existingPatterns.length > 0 ? ADDITIONAL_PATTERN : FIRST_PATTERN;
      return { pattern: [...existingPatterns, pattern] };
    }
    case PaletteSchemaConstruct.Length:
    case PaletteSchemaConstruct.MinLength:
    case PaletteSchemaConstruct.MaxLength:
    case PaletteSchemaConstruct.TotalDigits:
    case PaletteSchemaConstruct.FractionDigits:
      return { [construct]: 1 };
    case PaletteSchemaConstruct.MinExclusive:
    case PaletteSchemaConstruct.MinInclusive:
    case PaletteSchemaConstruct.MaxExclusive:
    case PaletteSchemaConstruct.MaxInclusive:
      return { [construct]: "0" };
    case PaletteSchemaConstruct.WhiteSpace:
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

function extractDisplayedBaseType(typeText: string): string | null {
  const restricted = typeText.match(/\(restricts ([^)]+)\)/);
  if (restricted?.[1]) {
    return restricted[1].trim();
  }
  const extended = typeText.match(/\(extends ([^)]+)\)/);
  if (extended?.[1]) {
    return extended[1].trim();
  }
  const trimmed = typeText.trim();
  return trimmed && !isPseudoTypeLabel(trimmed) ? trimmed : null;
}

function isPseudoTypeLabel(typeText: string): boolean {
  return (
    typeText === "complexType" ||
    typeText === "simpleType" ||
    typeText.startsWith("complexType with ") ||
    typeText.startsWith("simpleType with ") ||
    typeText.startsWith("<anonymous ")
  );
}