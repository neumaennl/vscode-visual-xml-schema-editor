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
  const facet = createDefaultFacet(construct);
  if (!facet) {
    return null;
  }
  return {
    type: "modifySimpleType",
    payload: {
      typeId: item.itemType === DiagramItemType.element ? getAnonymousSimpleTypeId(item) : item.id,
      baseType: getRestrictionBaseType(item),
      restrictions: { ...getRestrictionFacets(item), ...facet },
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
    pattern: item.restrictions?.pattern?.[0],
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

function createDefaultFacet(construct: FacetPaletteConstruct): RestrictionFacets | null {
  switch (construct) {
    case PaletteSchemaConstruct.Enumeration:
      return { enumeration: ["value"] };
    case PaletteSchemaConstruct.Pattern:
      return { pattern: ".*" };
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