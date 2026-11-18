/**
 * The built-in types of XML Schema 1.0: their namespace and their names.
 */

/** The namespace of XML Schema, which the built-in types belong to. */
export const XSD_NAMESPACE = "http://www.w3.org/2001/XMLSchema";

/**
 * The 44 built-in data types of XML Schema 1.0 (XML Schema Part 2, section 3), which can be the type of an
 * element or attribute and the base of a simple type.
 */
export const BUILT_IN_DATATYPES: readonly string[] = Object.freeze([
  // Primitive types
  "string",
  "boolean",
  "decimal",
  "float",
  "double",
  "duration",
  "dateTime",
  "time",
  "date",
  "gYearMonth",
  "gYear",
  "gMonthDay",
  "gDay",
  "gMonth",
  "hexBinary",
  "base64Binary",
  "anyURI",
  "QName",
  "NOTATION",
  // Types derived from string
  "normalizedString",
  "token",
  "language",
  "NMTOKEN",
  "NMTOKENS",
  "Name",
  "NCName",
  "ID",
  "IDREF",
  "IDREFS",
  "ENTITY",
  "ENTITIES",
  // Types derived from decimal
  "integer",
  "nonPositiveInteger",
  "negativeInteger",
  "long",
  "int",
  "short",
  "byte",
  "nonNegativeInteger",
  "unsignedLong",
  "unsignedInt",
  "unsignedShort",
  "unsignedByte",
  "positiveInteger",
]);

/** The local names of all built-in types: the data types, `anyType` and `anySimpleType`. */
const BUILT_IN_TYPE_NAMES: ReadonlySet<string> = new Set([...BUILT_IN_DATATYPES, "anyType", "anySimpleType"]);

/**
 * Tells whether a local name is the name of a built-in type of XML Schema.
 *
 * @param localName - The local name, without a prefix
 * @returns True for the 44 data types, `anyType` and `anySimpleType`
 */
export function isBuiltInTypeName(localName: string): boolean {
  return BUILT_IN_TYPE_NAMES.has(localName);
}
