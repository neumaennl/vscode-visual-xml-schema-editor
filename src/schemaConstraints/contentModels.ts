/**
 * The complex types of a schema, named and anonymous, and the element particles of their content
 * models, as the constraints of XML Schema see them.
 */

import type { formChoice, localComplexType, schema, topLevelComplexType } from "../../shared/types.js";
import { findComponentInTargetNamespace, forEachReferencedComponent, type SchemaNames } from "./schemaNames.js";

/** A named or anonymous complex type. */
export type ComplexTypeDefinition = topLevelComplexType | localComplexType;

/** An element declaration or reference, as far as the constraints look at it. */
export interface ElementParticle {
  name?: string;
  ref?: string;
  type_?: string;
  form?: formChoice;
  substitutionGroup?: string;
  simpleType?: object;
  complexType?: localComplexType;
}

/**
 * A node that can hold element particles: a complex type, the extension or restriction of its content, a
 * compositor or a group definition. A complex type holds one compositor or group reference; a compositor
 * holds several.
 */
interface ParticleHolder {
  element?: ElementParticle[];
  group?: { ref?: string } | Array<{ ref?: string }>;
  all?: ParticleHolder | ParticleHolder[];
  choice?: ParticleHolder | ParticleHolder[];
  sequence?: ParticleHolder | ParticleHolder[];
}

/** The compositors that a particle holder can contain. */
const COMPOSITORS = ["all", "choice", "sequence"] as const;

/**
 * Returns a value that is one item or a list as a list.
 *
 * @param value - The value
 * @returns The items
 */
function asList<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Returns the node that holds the particles of a complex type: the extension or restriction of its
 * complex content, or the complex type itself. Simple content has no particles.
 *
 * @param complexType - The complex type
 * @returns The node that holds the particles
 */
function particleHolderOf(complexType: ComplexTypeDefinition): ParticleHolder {
  const content = complexType.complexContent;
  return content?.extension ?? content?.restriction ?? complexType;
}

/**
 * Calls a function for each element particle that a node holds itself, in its compositors and nested
 * compositors, but not in the groups that it references.
 *
 * @param holder - The node
 * @param visit - Called for each element particle
 */
function forEachDescendantElement(holder: ParticleHolder, visit: (element: ElementParticle) => void): void {
  asList(holder.element).forEach(visit);
  for (const compositor of COMPOSITORS) {
    for (const nested of asList(holder[compositor])) {
      forEachDescendantElement(nested, visit);
    }
  }
}

/**
 * Calls a function for each element particle of a content model: those of the node, of its compositors
 * and of the group definitions that it references, recursively. A group definition is visited once.
 *
 * @param holder - The node
 * @param names - The names of the schema
 * @param visit - Called for each element particle
 * @param visitedGroups - The group definitions that were already visited
 */
function forEachElementOfModel(
  holder: ParticleHolder,
  names: SchemaNames,
  visit: (element: ElementParticle) => void,
  visitedGroups: Set<object>
): void {
  asList(holder.element).forEach(visit);
  forEachReferencedComponent(asList(holder.group), names.schemaObj.group, names, visitedGroups, (group) => {
    forEachElementOfModel(group, names, visit, visitedGroups);
  });
  for (const compositor of COMPOSITORS) {
    for (const nested of asList(holder[compositor])) {
      forEachElementOfModel(nested, names, visit, visitedGroups);
    }
  }
}

/**
 * Returns a complex type and the complex types of the schema that it extends, directly or indirectly,
 * starting with the first base type. A restriction ends the chain, because it does not take the content of
 * its base type.
 *
 * @param complexType - The complex type
 * @param names - The names of the schema
 * @returns The chain of types, the given one last
 */
function extensionChain(complexType: ComplexTypeDefinition, names: SchemaNames): ComplexTypeDefinition[] {
  const chain: ComplexTypeDefinition[] = [];
  let current: ComplexTypeDefinition | undefined = complexType;
  while (current && !chain.includes(current)) {
    chain.unshift(current);
    const base: string | undefined = current.complexContent?.extension?.base;
    current = base ? findComponentInTargetNamespace(base, names.schemaObj.complexType, names) : undefined;
  }
  return chain;
}

/**
 * Calls a function for each element particle of the content model of a complex type, in the order of the
 * content model: if it extends a complex type of the schema, first those of the base type, recursively;
 * then its own particles and those of the groups that it references.
 *
 * @param complexType - The complex type
 * @param names - The names of the schema
 * @param visit - Called for each element particle
 */
export function forEachElementOfComplexType(
  complexType: ComplexTypeDefinition,
  names: SchemaNames,
  visit: (element: ElementParticle) => void
): void {
  const visitedGroups = new Set<object>();
  for (const type of extensionChain(complexType, names)) {
    forEachElementOfModel(particleHolderOf(type), names, visit, visitedGroups);
  }
}

/**
 * Calls a function for each complex type of a schema: the named ones, and the anonymous ones of elements
 * anywhere in the schema, including those in group definitions and in other anonymous types.
 *
 * @param schemaObj - The schema
 * @param visit - Called with each complex type and a description of it for messages, such as
 * `complex type 'T'` or `the complex type of element 'c'`
 */
export function forEachComplexType(
  schemaObj: schema,
  visit: (complexType: ComplexTypeDefinition, description: string) => void
): void {
  const visitAnonymous = (element: ElementParticle): void => {
    if (element.complexType) {
      visitComplexType(element.complexType, `the complex type of element '${element.name ?? element.ref ?? ""}'`);
    }
  };
  const visitComplexType = (complexType: ComplexTypeDefinition, description: string): void => {
    visit(complexType, description);
    forEachDescendantElement(particleHolderOf(complexType), visitAnonymous);
  };

  for (const complexType of schemaObj.complexType ?? []) {
    visitComplexType(complexType, `complex type '${complexType.name}'`);
  }
  (schemaObj.element ?? []).forEach(visitAnonymous);
  for (const group of schemaObj.group ?? []) {
    forEachDescendantElement(group, visitAnonymous);
  }
}
