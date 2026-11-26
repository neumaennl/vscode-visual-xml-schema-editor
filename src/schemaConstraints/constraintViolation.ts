/**
 * A violation of a constraint of XML Schema, and which violations a change adds.
 */

/** The constraints of XML Schema that the editor checks across the schema. */
export type ConstraintRule = "elementTypes" | "attributeUses" | "allGroupReferences";

/** A violation of a constraint of XML Schema in one schema component. */
export interface ConstraintViolation {
  /** The constraint. */
  rule: ConstraintRule;
  /** The complex type, attribute group or group definition that violates the constraint. */
  container: object;
  /** The expanded name that the violation is about, such as `{urn:t}a`. */
  name: string;
  /** What is wrong, for the user. */
  message: string;
}

/**
 * Returns the violations that a change adds: those after the change that did not exist before it for the
 * same constraint, schema component and name. The message is not compared, because it names the
 * component, which a rename changes. A schema that already violates a constraint can still be changed
 * elsewhere.
 *
 * @param before - The violations before the change
 * @param after - The violations after the change
 * @returns The new violations
 */
export function findAddedViolations(
  before: readonly ConstraintViolation[],
  after: readonly ConstraintViolation[]
): ConstraintViolation[] {
  return after.filter(
    (violation) =>
      !before.some(
        (previous) =>
          previous.rule === violation.rule &&
          previous.container === violation.container &&
          previous.name === violation.name
      )
  );
}
