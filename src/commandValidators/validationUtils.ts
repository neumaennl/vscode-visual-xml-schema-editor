/**
 * Shared validation utilities for command validators.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates if a string is a valid XML name.
 * XML names must start with a letter or underscore, and contain only
 * letters, digits, hyphens, underscores, and periods.
 *
 * @param name - The name to validate
 * @returns true if valid XML name, false otherwise
 *
 * TODO: This is a simplified pattern for Phase 1 that validates basic ASCII
 * XML names. It does not support namespace-prefixed names (e.g., xs:element)
 * or Unicode characters beyond ASCII. XSD element/type names typically don't
 * use prefixes in schema definitions.
 */
export function isValidXmlName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }
  // XML name pattern: starts with letter or underscore,
  // followed by letters, digits, hyphens, underscores, or periods
  const xmlNamePattern = /^[a-zA-Z_][\w.-]*$/;
  return xmlNamePattern.test(name);
}

/**
 * Validates minOccurs value.
 *
 * @param minOccurs - The minOccurs value to validate
 * @returns Validation result
 */
export function validateMinOccurs(
  minOccurs: number | undefined
): ValidationResult {
  if (minOccurs === undefined) {
    return { valid: true };
  }

  if (minOccurs < 0) {
    return {
      valid: false,
      error: "minOccurs must be a non-negative integer",
    };
  }

  if (!Number.isInteger(minOccurs)) {
    return { valid: false, error: "minOccurs must be an integer" };
  }

  return { valid: true };
}

/**
 * Validates maxOccurs value.
 *
 * @param maxOccurs - The maxOccurs value to validate
 * @returns Validation result
 */
export function validateMaxOccurs(
  maxOccurs: number | string | undefined
): ValidationResult {
  if (maxOccurs === undefined) {
    return { valid: true };
  }

  if (maxOccurs === "unbounded") {
    return { valid: true };
  }

  if (typeof maxOccurs === "number") {
    if (maxOccurs < 0) {
      return {
        valid: false,
        error: "maxOccurs must be a non-negative integer or 'unbounded'",
      };
    }
    if (!Number.isInteger(maxOccurs)) {
      return {
        valid: false,
        error: "maxOccurs must be an integer or 'unbounded'",
      };
    }
  }

  return { valid: true };
}

/**
 * Validates that minOccurs <= maxOccurs when both are provided.
 *
 * @param minOccurs - The minOccurs value
 * @param maxOccurs - The maxOccurs value
 * @returns Validation result
 */
export function validateOccurrenceConstraint(
  minOccurs: number | undefined,
  maxOccurs: number | string | undefined
): ValidationResult {
  if (
    minOccurs !== undefined &&
    typeof maxOccurs === "number" &&
    minOccurs > maxOccurs
  ) {
    return { valid: false, error: "minOccurs must be <= maxOccurs" };
  }

  return { valid: true };
}

/**
 * Validates all occurrence constraints (minOccurs, maxOccurs, and their relationship).
 *
 * @param minOccurs - The minOccurs value
 * @param maxOccurs - The maxOccurs value
 * @returns Validation result
 */
export function validateOccurrences(
  minOccurs: number | undefined,
  maxOccurs: number | string | undefined
): ValidationResult {
  // Validate minOccurs
  const minResult = validateMinOccurs(minOccurs);
  if (!minResult.valid) {
    return minResult;
  }

  // Validate maxOccurs
  const maxResult = validateMaxOccurs(maxOccurs);
  if (!maxResult.valid) {
    return maxResult;
  }

  // Validate constraint
  return validateOccurrenceConstraint(minOccurs, maxOccurs);
}

/**
 * List of built-in XSD types (with and without namespace prefix).
 * Includes both xs: prefixed and unprefixed versions.
 */
const BUILT_IN_XSD_TYPES = new Set([
  // String types
  "string", "xs:string",
  "normalizedString", "xs:normalizedString",
  "token", "xs:token",
  "language", "xs:language",
  "Name", "xs:Name",
  "NCName", "xs:NCName",
  "ID", "xs:ID",
  "IDREF", "xs:IDREF",
  "IDREFS", "xs:IDREFS",
  "ENTITY", "xs:ENTITY",
  "ENTITIES", "xs:ENTITIES",
  "NMTOKEN", "xs:NMTOKEN",
  "NMTOKENS", "xs:NMTOKENS",
  
  // Numeric types
  "decimal", "xs:decimal",
  "integer", "xs:integer",
  "int", "xs:int",
  "long", "xs:long",
  "short", "xs:short",
  "byte", "xs:byte",
  "nonNegativeInteger", "xs:nonNegativeInteger",
  "positiveInteger", "xs:positiveInteger",
  "nonPositiveInteger", "xs:nonPositiveInteger",
  "negativeInteger", "xs:negativeInteger",
  "unsignedLong", "xs:unsignedLong",
  "unsignedInt", "xs:unsignedInt",
  "unsignedShort", "xs:unsignedShort",
  "unsignedByte", "xs:unsignedByte",
  "float", "xs:float",
  "double", "xs:double",
  
  // Date and time types
  "date", "xs:date",
  "time", "xs:time",
  "dateTime", "xs:dateTime",
  "duration", "xs:duration",
  "gDay", "xs:gDay",
  "gMonth", "xs:gMonth",
  "gMonthDay", "xs:gMonthDay",
  "gYear", "xs:gYear",
  "gYearMonth", "xs:gYearMonth",
  
  // Other types
  "boolean", "xs:boolean",
  "base64Binary", "xs:base64Binary",
  "hexBinary", "xs:hexBinary",
  "anyURI", "xs:anyURI",
  "QName", "xs:QName",
  "NOTATION", "xs:NOTATION",
  "anyType", "xs:anyType",
  "anySimpleType", "xs:anySimpleType",
]);

/**
 * Validates if a type name is a valid built-in or user-defined type.
 *
 * @param typeName - The type name to validate
 * @param schemaObj - The schema object to check for user-defined types
 * @returns Validation result
 */
export function validateElementType(
  typeName: string,
  schemaObj: { simpleType?: Array<{ name?: string }>, complexType?: Array<{ name?: string }> }
): ValidationResult {
  if (!typeName || typeName.trim().length === 0) {
    return { valid: false, error: "Element type is required" };
  }

  const trimmedType = typeName.trim();

  // Check if it's a built-in XSD type
  if (BUILT_IN_XSD_TYPES.has(trimmedType)) {
    return { valid: true };
  }

  // Check if it's a user-defined simple type
  if (schemaObj.simpleType) {
    const simpleTypes = Array.isArray(schemaObj.simpleType) 
      ? schemaObj.simpleType 
      : [schemaObj.simpleType];
    
    if (simpleTypes.some(type => type.name === trimmedType)) {
      return { valid: true };
    }
  }

  // Check if it's a user-defined complex type
  if (schemaObj.complexType) {
    const complexTypes = Array.isArray(schemaObj.complexType)
      ? schemaObj.complexType
      : [schemaObj.complexType];
    
    if (complexTypes.some(type => type.name === trimmedType)) {
      return { valid: true };
    }
  }

  return { 
    valid: false, 
    error: `Invalid element type '${trimmedType}': must be a built-in XSD type or a user-defined type in the schema` 
  };
}
