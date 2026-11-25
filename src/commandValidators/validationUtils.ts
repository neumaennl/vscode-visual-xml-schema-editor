/**
 * Shared validation utilities for command validators.
 */

import { validateTypeReference } from "../../shared/typeReferences.js";
import type { schema } from "../../shared/types.js";
import type { ValidationResult } from "../../shared/validation.js";

/**
 * Checks a type reference against a schema (see {@link validateTypeReference}).
 *
 * @param typeName - The type reference
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateTypeInSchema(typeName: string, schemaObj: schema): ValidationResult {
  return validateTypeReference(typeName, {
    localTypeNames: [...(schemaObj.simpleType ?? []), ...(schemaObj.complexType ?? [])].map((type) => type.name),
    namespacePrefixes: schemaObj._namespacePrefixes ?? {},
    targetNamespace: schemaObj.targetNamespace,
    importedNamespaces: (schemaObj.import_ ?? []).flatMap((imp) =>
      imp.namespace === undefined ? [] : [imp.namespace]
    ),
    hasIncludes: (schemaObj.include ?? []).length > 0,
  });
}
