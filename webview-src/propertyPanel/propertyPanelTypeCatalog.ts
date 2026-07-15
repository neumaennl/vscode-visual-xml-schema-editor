/**
 * Shared catalog of built-in XML Schema primitive types used by property-panel type editing.
 */
/** Built-in XML Schema primitive local names without namespace prefixes. */
export const BUILT_IN_XSD_TYPE_LOCAL_NAMES = Object.freeze([
  "string",
  "boolean",
  "decimal",
  "float",
  "double",
  "duration",
  "dateTime",
  "time",
  "date",
  "hexBinary",
  "base64Binary",
  "anyURI",
  "QName",
  "NOTATION",
  "normalizedString",
  "token",
  "language",
  "NMTOKEN",
  "Name",
  "NCName",
  "integer",
  "nonNegativeInteger",
  "positiveInteger",
  "int",
  "long",
  "short",
  "byte",
]);

/** Set form of built-in XML Schema primitive local names for efficient lookups. */
export const BUILT_IN_XSD_TYPE_LOCAL_NAME_SET: ReadonlySet<string> = new Set(
  BUILT_IN_XSD_TYPE_LOCAL_NAMES
);

/** Built-in XML Schema primitive suggestions as `xs:`-prefixed QNames. */
export const BUILTIN_TYPE_SUGGESTIONS = Object.freeze(
  BUILT_IN_XSD_TYPE_LOCAL_NAMES.map((localName) => `xs:${localName}`)
);
