/**
 * Shared validation utilities for command validators.
 */

import { validateTypeReference } from "../../shared/typeReferences.js";
import type { NamespacePrefixes } from "../../shared/types.js";
import type { ValidationResult } from "../../shared/validation.js";

/**
 * Checks a type reference against a schema (see {@link validateTypeReference}).
 *
 * @param typeName - The type reference
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateTypeInSchema(
  typeName: string,
  schemaObj: {
    simpleType?: Array<{ name?: string }>;
    complexType?: Array<{ name?: string }>;
    import_?: Array<{ namespace?: string }>;
    include?: Array<{ schemaLocation?: string }>;
    _namespacePrefixes?: NamespacePrefixes;
    targetNamespace?: string;
  }
): ValidationResult {
  return validateTypeReference(typeName, {
    localTypeNames: [...(schemaObj.simpleType ?? []), ...(schemaObj.complexType ?? [])].flatMap((type) =>
      type.name === undefined ? [] : [type.name]
    ),
    namespacePrefixes: schemaObj._namespacePrefixes ?? {},
    targetNamespace: schemaObj.targetNamespace,
    importedNamespaces: (schemaObj.import_ ?? []).flatMap((imp) =>
      imp.namespace === undefined ? [] : [imp.namespace]
    ),
    hasIncludes: (schemaObj.include ?? []).length > 0,
  });
}
