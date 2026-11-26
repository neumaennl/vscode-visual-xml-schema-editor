/**
 * The constraint of XML Schema 1.0 on references to a group definition whose compositor is an `all`: such
 * a reference must be the whole content of a complex type, not a particle in a sequence or a choice, and
 * may occur at most once (`minOccurs` 0 or 1, `maxOccurs` 1).
 */

import type { groupRef, schema } from "../../shared/types.js";
import { forEachComplexType, forEachGroupReferenceInCompositors, particleHolderOf } from "./contentModels.js";
import type { ConstraintViolation } from "./constraintViolation.js";
import { expandedNameOf, findComponentInTargetNamespace, schemaNamesOf, type SchemaNames } from "./schemaNames.js";

/**
 * Tells whether a group reference refers to a group definition of the schema whose compositor is an `all`.
 *
 * @param reference - The group reference
 * @param names - The names of the schema
 * @returns True for a reference to such a group definition
 */
function refersToAllGroup(reference: groupRef, names: SchemaNames): boolean {
  return findComponentInTargetNamespace(reference.ref, names.schemaObj.group, names)?.all !== undefined;
}

/**
 * Finds the references to group definitions with an `all` that XML Schema 1.0 does not allow: those in a
 * sequence or a choice, and those that are the content of a complex type but may occur more than once.
 *
 * @param schemaObj - The schema
 * @returns The violations
 */
export function findInvalidAllGroupReferences(schemaObj: schema): ConstraintViolation[] {
  const names = schemaNamesOf(schemaObj);
  const violations: ConstraintViolation[] = [];
  // The container is the complex type or group definition, which stays the same when a compositor in it is
  // replaced, so that a violation that the schema already had is not counted as new
  const checkCompositors = (holder: object, container: object): void => {
    forEachGroupReferenceInCompositors(holder, (reference) => {
      if (refersToAllGroup(reference, names)) {
        violations.push({
          rule: "allGroupReferences",
          container,
          name: expandedNameOf(reference.ref, names),
          message: `Group '${reference.ref}' has an all, so it can only be referenced as the whole content of a complex type, not in a sequence or a choice`,
        });
      }
    });
  };

  forEachComplexType(schemaObj, (complexType, description) => {
    const holder = particleHolderOf(complexType);
    const reference = Array.isArray(holder.group) ? undefined : holder.group;
    const { minOccurs = 1, maxOccurs = 1 } = reference ?? {};
    if (reference && refersToAllGroup(reference, names) && (minOccurs > 1 || maxOccurs !== 1)) {
      violations.push({
        rule: "allGroupReferences",
        container: complexType,
        name: expandedNameOf(reference.ref, names),
        message: `Group '${reference.ref}' has an all, so its reference in ${description} must have minOccurs 0 or 1 and maxOccurs 1`,
      });
    }
    checkCompositors(holder, complexType);
  });
  for (const group of schemaObj.group ?? []) {
    checkCompositors(group, group);
  }
  return violations;
}
