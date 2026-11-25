/**
 * The constraints of XML Schema on attribute uses: a complex type, and an attribute group, must not have
 * two attribute uses with the same name.
 */

import { getContentDerivation, type ComplexTypeObject, type AttributeContainer } from "../../shared/schemaObjects.js";
import type { attribute, schema } from "../../shared/types.js";
import { forEachComplexType } from "./contentModels.js";
import type { ConstraintViolation } from "./constraintViolation.js";
import {
  findComponentInTargetNamespace,
  forEachReferencedComponent,
  localDeclarationName,
  localNameOf,
  expandedNameOf,
  schemaNamesOf,
  topLevelName,
  type SchemaNames,
} from "./schemaNames.js";

/**
 * Adds the attribute uses of a node: its attributes, except prohibited ones, and the attribute uses of
 * the attribute groups that it references, recursively. Each `xs:attribute` is one use, also a reference;
 * an attribute group that is referenced twice adds the same uses again, which is no duplicate.
 *
 * @param holder - The node
 * @param names - The names of the schema
 * @param uses - The uses found so far
 * @param visitedGroups - The attribute groups that were already visited
 */
function addAttributeUses(
  holder: AttributeContainer,
  names: SchemaNames,
  uses: Set<attribute>,
  visitedGroups: Set<object>
): void {
  for (const use of holder.attribute ?? []) {
    if (use.use !== "prohibited") {
      uses.add(use);
    }
  }
  forEachReferencedComponent(
    holder.attributeGroup ?? [],
    names.schemaObj.attributeGroup,
    names,
    visitedGroups,
    (group) => {
      addAttributeUses(group, names, uses, visitedGroups);
    }
  );
}

/**
 * Returns the attribute uses of a complex type: its own and, if it extends a complex type of the schema,
 * those of the base type, recursively. A restriction does not add the uses of its base type, because its
 * attributes replace them.
 *
 * @param complexType - The complex type
 * @param names - The names of the schema
 * @returns The attribute uses
 */
function attributeUsesOfComplexType(complexType: ComplexTypeObject, names: SchemaNames): Set<attribute> {
  const uses = new Set<attribute>();
  const visitedTypes = new Set<object>();
  const visitedGroups = new Set<object>();
  let current: ComplexTypeObject | undefined = complexType;
  while (current && !visitedTypes.has(current)) {
    visitedTypes.add(current);
    addAttributeUses(getContentDerivation(current) ?? current, names, uses, visitedGroups);
    const base: string | undefined = (current.complexContent?.extension ?? current.simpleContent?.extension)?.base;
    current = base ? findComponentInTargetNamespace(base, names.schemaObj.complexType, names) : undefined;
  }
  return uses;
}

/**
 * Returns the expanded name of an attribute use. A reference has the name of the top-level attribute it
 * refers to.
 *
 * @param use - The attribute declaration or reference
 * @param names - The names of the schema
 * @returns The expanded name
 */
function nameOfUse(use: attribute, names: SchemaNames): string {
  if (use.ref) {
    const target = findComponentInTargetNamespace(use.ref, names.schemaObj.attribute, names);
    return target ? topLevelName(target.name, names) : expandedNameOf(use.ref, names);
  }
  return localDeclarationName(use.name ?? "", use.form, names.schemaObj.attributeFormDefault, names);
}

/**
 * Adds a violation for each name that more than one of the attribute uses of a component has.
 *
 * @param container - The complex type or attribute group
 * @param description - The component for the message, such as `Complex type 'T'`
 * @param uses - Its attribute uses
 * @param names - The names of the schema
 * @param violations - The violations found so far
 */
function addDuplicateUses(
  container: object,
  description: string,
  uses: Set<attribute>,
  names: SchemaNames,
  violations: ConstraintViolation[]
): void {
  const usesByName = new Map<string, attribute[]>();
  for (const use of uses) {
    const name = nameOfUse(use, names);
    usesByName.set(name, [...(usesByName.get(name) ?? []), use]);
  }
  for (const [name, sameName] of usesByName) {
    if (sameName.length > 1) {
      violations.push({
        rule: "attributeUses",
        container,
        name,
        message: `${description} has more than one attribute named '${localNameOf(name)}'`,
      });
    }
  }
}

/**
 * Finds the complex types and attribute groups that have more than one attribute use with the same name.
 *
 * @param schemaObj - The schema
 * @returns One violation for each component and name
 */
export function findDuplicateAttributeUses(schemaObj: schema): ConstraintViolation[] {
  const names = schemaNamesOf(schemaObj);
  const violations: ConstraintViolation[] = [];
  forEachComplexType(schemaObj, (complexType, description) => {
    const capitalized = description.charAt(0).toUpperCase() + description.slice(1);
    addDuplicateUses(complexType, capitalized, attributeUsesOfComplexType(complexType, names), names, violations);
  });
  for (const group of schemaObj.attributeGroup ?? []) {
    const uses = new Set<attribute>();
    addAttributeUses(group, names, uses, new Set([group]));
    addDuplicateUses(group, `Attribute group '${group.name}'`, uses, names, violations);
  }
  return violations;
}
