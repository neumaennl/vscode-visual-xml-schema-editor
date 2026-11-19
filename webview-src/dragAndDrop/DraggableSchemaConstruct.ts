/**
 * The XML Schema constructs that can be dragged from the palette onto the diagram.
 */

import { isFacetName } from "../../shared/facets";

/** An XML Schema construct that can be dragged from the palette onto the diagram. */
export enum DraggableSchemaConstruct {
  Element = "element",
  Attribute = "attribute",
  Group = "group",
  Any = "any",
  Sequence = "sequence",
  Choice = "choice",
  All = "all",
  SimpleType = "simpleType",
  ComplexType = "complexType",
  Extension = "extension",
  Restriction = "restriction",
  MinExclusive = "minExclusive",
  MinInclusive = "minInclusive",
  MaxExclusive = "maxExclusive",
  MaxInclusive = "maxInclusive",
  TotalDigits = "totalDigits",
  FractionDigits = "fractionDigits",
  Length = "length",
  MinLength = "minLength",
  MaxLength = "maxLength",
  Enumeration = "enumeration",
  WhiteSpace = "whiteSpace",
  Pattern = "pattern",
}

/** The schema constructs that are facets; each is named like its facet. */
export type FacetSchemaConstruct =
  | DraggableSchemaConstruct.MinExclusive
  | DraggableSchemaConstruct.MinInclusive
  | DraggableSchemaConstruct.MaxExclusive
  | DraggableSchemaConstruct.MaxInclusive
  | DraggableSchemaConstruct.TotalDigits
  | DraggableSchemaConstruct.FractionDigits
  | DraggableSchemaConstruct.Length
  | DraggableSchemaConstruct.MinLength
  | DraggableSchemaConstruct.MaxLength
  | DraggableSchemaConstruct.Enumeration
  | DraggableSchemaConstruct.WhiteSpace
  | DraggableSchemaConstruct.Pattern;

/**
 * Checks whether a schema construct is a facet.
 *
 * @param schemaConstruct - The schema construct
 * @returns True for the schema constructs that are named like a facet
 */
export function isFacetSchemaConstruct(
  schemaConstruct: DraggableSchemaConstruct
): schemaConstruct is FacetSchemaConstruct {
  return isFacetName(schemaConstruct);
}
