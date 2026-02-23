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
 * List of built-in XSD type names (without namespace prefix).
 * The actual type reference can use any prefix (xs:, xsd:, etc.) or no prefix.
 */
const BUILT_IN_XSD_TYPE_NAMES = new Set([
  // String types
  "string",
  "normalizedString",
  "token",
  "language",
  "Name",
  "NCName",
  "ID",
  "IDREF",
  "IDREFS",
  "ENTITY",
  "ENTITIES",
  "NMTOKEN",
  "NMTOKENS",
  
  // Numeric types
  "decimal",
  "integer",
  "int",
  "long",
  "short",
  "byte",
  "nonNegativeInteger",
  "positiveInteger",
  "nonPositiveInteger",
  "negativeInteger",
  "unsignedLong",
  "unsignedInt",
  "unsignedShort",
  "unsignedByte",
  "float",
  "double",
  
  // Date and time types
  "date",
  "time",
  "dateTime",
  "duration",
  "gDay",
  "gMonth",
  "gMonthDay",
  "gYear",
  "gYearMonth",
  
  // Other types
  "boolean",
  "base64Binary",
  "hexBinary",
  "anyURI",
  "QName",
  "NOTATION",
  "anyType",
  "anySimpleType",
]);

/**
 * Extracts the local name from a potentially prefixed type name.
 * For example: "xs:string" -> "string", "string" -> "string"
 *
 * @param typeName - The type name (possibly with namespace prefix)
 * @returns The local name without prefix
 */
function getLocalTypeName(typeName: string): string {
  const colonIndex = typeName.indexOf(':');
  return colonIndex >= 0 ? typeName.substring(colonIndex + 1) : typeName;
}

/**
 * Extracts the prefix from a potentially prefixed type name.
 * For example: "xs:string" -> "xs", "string" -> undefined
 *
 * @param typeName - The type name (possibly with namespace prefix)
 * @returns The prefix without the colon, or undefined if no prefix
 */
function getTypePrefix(typeName: string): string | undefined {
  const colonIndex = typeName.indexOf(':');
  return colonIndex >= 0 ? typeName.substring(0, colonIndex) : undefined;
}

/**
 * Checks if a type name is a built-in XSD type.
 * Handles any namespace prefix (xs:, xsd:, etc.) or no prefix.
 *
 * @param typeName - The type name to check
 * @returns true if it's a built-in XSD type
 */
function isBuiltInXsdType(typeName: string): boolean {
  const localName = getLocalTypeName(typeName);
  return BUILT_IN_XSD_TYPE_NAMES.has(localName);
}

/**
 * Validates if a type name is a valid built-in or user-defined type.
 *
 * @param typeName - The type name to validate
 * @param schemaObj - The schema object to check for user-defined types
 * @returns Validation result
 */
export function validateElementType(
  typeName: string,
  schemaObj: { 
    simpleType?: Array<{ name?: string }>, 
    complexType?: Array<{ name?: string }>,
    import_?: Array<{ namespace?: string }>,
    include?: Array<{ schemaLocation?: string }>,
    _namespacePrefixes?: Record<string, string>
  }
): ValidationResult {
  if (!typeName || typeName.trim().length === 0) {
    return { valid: false, error: "Element type is required" };
  }

  const trimmedType = typeName.trim();

  // Check if it's a built-in XSD type (handles any prefix like xs:, xsd:, or no prefix)
  if (isBuiltInXsdType(trimmedType)) {
    return { valid: true };
  }

  // Extract local name (without prefix) for user-defined type comparison
  const localTypeName = getLocalTypeName(trimmedType);

  // Check if it's a user-defined simple type
  if (schemaObj.simpleType) {
    const simpleTypes = Array.isArray(schemaObj.simpleType) 
      ? schemaObj.simpleType 
      : [schemaObj.simpleType];
    
    if (simpleTypes.some(type => type.name === localTypeName)) {
      return { valid: true };
    }
  }

  // Check if it's a user-defined complex type
  if (schemaObj.complexType) {
    const complexTypes = Array.isArray(schemaObj.complexType)
      ? schemaObj.complexType
      : [schemaObj.complexType];
    
    if (complexTypes.some(type => type.name === localTypeName)) {
      return { valid: true };
    }
  }

  // If the type has a prefix, validate it against imports
  // Note: Types from includes are in the same namespace and don't need prefixes
  const typePrefix = getTypePrefix(trimmedType);
  if (typePrefix) {
    // Check if we have namespace prefix mappings
    if (schemaObj._namespacePrefixes) {
      // Look up the namespace URI for this prefix
      // _namespacePrefixes structure: { prefix: namespaceUri }
      const namespaceUri = schemaObj._namespacePrefixes[typePrefix];
      
      if (namespaceUri) {
        // Check if there's an import for this namespace
        if (schemaObj.import_) {
          const imports = Array.isArray(schemaObj.import_) 
            ? schemaObj.import_ 
            : [schemaObj.import_];
          
          const hasMatchingImport = imports.some(imp => imp.namespace === namespaceUri);
          if (hasMatchingImport) {
            // Type is from a valid import with matching namespace, allow it
            return { valid: true };
          }
        }
      }
    }
  }

  return { 
    valid: false, 
    error: `Invalid element type '${trimmedType}': must be a built-in XSD type, a user-defined type in the schema, or a type from a valid import with a matching namespace prefix` 
  };
}
