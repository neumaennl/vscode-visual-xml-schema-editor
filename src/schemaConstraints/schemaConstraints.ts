/**
 * The constraints of XML Schema that span the schema and that the pipeline checks after a command:
 * elements with the same name in a content model have the same type, a complex type or an attribute
 * group has each attribute only once, and a group definition with an `all` is only referenced as the
 * whole content of a complex type. Components of other schemas, which the editor does not read, are not
 * checked.
 */

import type { schema } from "../../shared/types.js";
import { findDuplicateAttributeUses } from "./attributeUses.js";
import type { ConstraintViolation } from "./constraintViolation.js";
import { findInconsistentElementTypes } from "./elementTypes.js";
import { findInvalidAllGroupReferences } from "./allGroupReferences.js";

/**
 * Finds the violations of the constraints that span the schema.
 *
 * @param schemaObj - The schema
 * @returns The violations
 */
export function findConstraintViolations(schemaObj: schema): ConstraintViolation[] {
  return [
    ...findInconsistentElementTypes(schemaObj),
    ...findDuplicateAttributeUses(schemaObj),
    ...findInvalidAllGroupReferences(schemaObj),
  ];
}
