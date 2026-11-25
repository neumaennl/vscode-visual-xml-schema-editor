/**
 * The constraint "Element Declarations Consistent" of XML Schema: within the content model of a complex
 * type, elements with the same name must have the same type.
 */

import { XSD_NAMESPACE } from "../../shared/builtInTypes.js";
import type { schema, topLevelElement } from "../../shared/types.js";
import { forEachComplexType, forEachElementOfComplexType } from "./contentModels.js";
import type { ConstraintViolation } from "./constraintViolation.js";
import {
  findComponentInTargetNamespace,
  localDeclarationName,
  localNameOf,
  expandedNameOf,
  schemaNamesOf,
  topLevelName,
  type SchemaNames,
} from "./schemaNames.js";
import type { ElementObject, LocalElementObject } from "../../shared/schemaObjects.js";

/**
 * The type of an element declaration: a key that is equal for the same type, the resolved name of a
 * named type or the object of an anonymous type, and how messages show it.
 */
interface ElementType {
  key: unknown;
  label: string;
}

/** How messages show an anonymous type. */
const ANONYMOUS_LABEL = "an anonymous type";

/** The type of a declaration without a type, `xs:anyType`. */
const ANY_TYPE: ElementType = { key: `{${XSD_NAMESPACE}}anyType`, label: "no type" };

/**
 * Returns the type of an element declaration: its named type, its anonymous type, the type of the head
 * of its substitution group, or `xs:anyType`.
 *
 * @param declaration - The declaration
 * @param names - The names of the schema
 * @param visited - The declarations whose substitution group was already followed
 * @returns The type, or `undefined` if it is the type of a declaration in another schema
 */
function typeOfDeclaration(
  declaration: ElementObject,
  names: SchemaNames,
  visited = new Set<object>()
): ElementType | undefined {
  if (declaration.type_) {
    return { key: expandedNameOf(declaration.type_, names), label: declaration.type_ };
  }
  const anonymousType = declaration.complexType ?? declaration.simpleType;
  if (anonymousType) {
    return { key: anonymousType, label: ANONYMOUS_LABEL };
  }
  // Only a top-level element can be a member of a substitution group
  if ("substitutionGroup" in declaration && declaration.substitutionGroup) {
    const head = findComponentInTargetNamespace(declaration.substitutionGroup, names.schemaObj.element, names);
    if (!head || visited.has(head)) {
      return undefined;
    }
    visited.add(head);
    return typeOfDeclaration(head, names, visited);
  }
  return ANY_TYPE;
}

/**
 * Returns the expanded name and the type of an element particle. A reference has the name and the type
 * of the top-level element it refers to.
 *
 * @param element - The element declaration or reference
 * @param names - The names of the schema
 * @returns The name, and the type unless it is unknown because the declaration is in another schema
 */
function nameAndType(element: LocalElementObject, names: SchemaNames): { name: string; type?: ElementType } {
  if (element.ref) {
    const target: topLevelElement | undefined = findComponentInTargetNamespace(
      element.ref,
      names.schemaObj.element,
      names
    );
    return target
      ? { name: topLevelName(target.name, names), type: typeOfDeclaration(target, names) }
      : { name: expandedNameOf(element.ref, names) };
  }
  const name = localDeclarationName(element.name ?? "", element.form, names.schemaObj.elementFormDefault, names);
  return { name, type: typeOfDeclaration(element, names) };
}

/**
 * Describes different types for a message, such as `xs:string and xs:int`, or
 * `xs:string and different anonymous types`.
 *
 * @param labels - The labels of the types
 * @returns The description
 */
function describeTypes(labels: string[]): string {
  const named = labels.filter((label) => label !== ANONYMOUS_LABEL);
  const anonymousCount = labels.length - named.length;
  if (anonymousCount > 0) {
    named.push(anonymousCount === 1 ? ANONYMOUS_LABEL : "different anonymous types");
  }
  return named.join(" and ");
}

/**
 * Finds the complex types in which elements with the same name have different types.
 *
 * @param schemaObj - The schema
 * @returns One violation for each complex type and name
 */
export function findInconsistentElementTypes(schemaObj: schema): ConstraintViolation[] {
  const names = schemaNamesOf(schemaObj);
  const violations: ConstraintViolation[] = [];
  forEachComplexType(schemaObj, (complexType, description) => {
    const typesByName = new Map<string, Map<unknown, string>>();
    forEachElementOfComplexType(complexType, names, (element) => {
      const { name, type } = nameAndType(element, names);
      const types = typesByName.get(name) ?? new Map<unknown, string>();
      typesByName.set(name, types);
      if (type) {
        types.set(type.key, type.label);
      }
    });
    for (const [name, types] of typesByName) {
      if (types.size > 1) {
        violations.push({
          rule: "elementTypes",
          container: complexType,
          name,
          message: `Elements named '${localNameOf(name)}' in ${description} must have the same type, but have ${describeTypes([...types.values()])}`,
        });
      }
    }
  });
  return violations;
}
