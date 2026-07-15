/**
 * Palette entries that represent XML Schema constructs users can drag from the
 * webview palette onto the diagram.
 */
export enum PaletteSchemaConstruct {
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
  Enumeration = "enumeration",
  Pattern = "pattern",
  Length = "length",
  Range = "range",
}

/**
 * Checks whether a drag payload string maps to a known palette schema construct.
 *
 * @param value - Raw drag payload value
 * @returns True when the value is a supported palette schema construct
 */
export function isPaletteSchemaConstruct(
  value: string
): value is PaletteSchemaConstruct {
  return Object.values(PaletteSchemaConstruct).includes(value as PaletteSchemaConstruct);
}
