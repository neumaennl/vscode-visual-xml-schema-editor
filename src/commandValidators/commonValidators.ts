/**
 * Checks that the validators of several kinds of components share: references to top-level
 * components, the existence of top-level definitions, and the local elements and attributes that an
 * ID identifies.
 */

import type { schema } from "../../shared/types.js";
import type { ParsedSchemaId } from "../../shared/idStrategy.js";
import { parseSchemaId, SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy.js";
import { locateNodeById } from "../schemaNavigator.js";
import { ownComponentName, splitQName, isValidXmlName } from "../../shared/qNames.js";
import { getTargetNamespacePrefixes, type TypeKind } from "../../shared/schemaUtils.js";
import { findIdentifiedChild } from "../commandUtils.js";
import type { ValidationFailure, ValidationResult } from "../../shared/validation.js";

/** A top-level component, as far as the checks look at it. */
interface NamedComponent {
  name?: string;
}

/** The kinds of top-level components that a `ref` can refer to. */
export type ReferencedKind = "element" | "attribute" | "group" | "attributeGroup";

/** What a reference refers to, capitalized, for the error messages. */
const REFERENCED_KIND_LABELS: Record<ReferencedKind, string> = {
  element: "Element",
  attribute: "Attribute",
  group: "Group",
  attributeGroup: "Attribute group",
};

/**
 * Validates the `ref` of a reference: it must be a QName, and name one of the top-level components of
 * the schema that it can refer to, without a prefix or with a prefix of the schema's target namespace
 * (see {@link ownComponentName}).
 *
 * @param ref - The value of `ref`
 * @param kind - What the reference refers to
 * @param schemaObj - The schema
 * @param notFoundError - The error if the schema has no such component
 * @returns The validation result
 */
export function validateReference(
  ref: string,
  kind: ReferencedKind,
  schemaObj: schema,
  notFoundError: string
): ValidationResult {
  const { prefix, localName } = splitQName(ref);
  if (!isValidXmlName(localName) || (prefix !== undefined && !isValidXmlName(prefix))) {
    return { valid: false, error: `${REFERENCED_KIND_LABELS[kind]} ref must be a valid QName` };
  }
  const name = ownComponentName(ref, getTargetNamespacePrefixes(schemaObj));
  if (name === undefined) {
    return { valid: false, error: notFoundError };
  }
  return validateDefinitionExists(schemaObj[kind], name, notFoundError);
}

/**
 * Validates that a top-level component with the given name exists.
 *
 * @param components - The top-level components of one kind
 * @param name - The name to look for
 * @param notFoundError - The error if no component has the name
 * @returns The validation result
 */
function validateDefinitionExists(
  components: NamedComponent[] | undefined,
  name: string | undefined,
  notFoundError: string
): ValidationResult {
  if (!(components ?? []).some((component) => component.name === name)) {
    return { valid: false, error: notFoundError };
  }
  return { valid: true };
}

/** What the ID of a reference or a definition identifies: a reference, or a definition with its name. */
export type ReferenceOrDefinition = { target: "reference" } | { target: "definition"; name: string | undefined };

/**
 * Validates that the reference or the top-level definition that a parsed ID identifies exists.
 *
 * @param parsed - The parsed ID
 * @param referenceType - The node type of the references, such as `SchemaNodeType.GroupRef`
 * @param validateReferenceExists - Validates that the reference exists; called only for a reference
 * @param definitions - The top-level definitions of the kind
 * @param notFoundError - The error if no definition has the name
 * @returns What the ID identifies, or the validation failure
 */
export function locateReferenceOrDefinition(
  parsed: ParsedSchemaId,
  referenceType: SchemaNodeType,
  validateReferenceExists: () => ValidationResult,
  definitions: NamedComponent[] | undefined,
  notFoundError: string
): ValidationFailure | ({ valid: true } & ReferenceOrDefinition) {
  if (parsed.nodeType === referenceType) {
    const refResult = validateReferenceExists();
    return refResult.valid ? { valid: true, target: "reference" } : refResult;
  }
  const definitionResult = validateDefinitionExists(definitions, parsed.name, notFoundError);
  return definitionResult.valid ? { valid: true, target: "definition", name: parsed.name } : definitionResult;
}

/**
 * Parses the ID of the component that a remove or modify command changes, after checking that it is
 * not empty.
 *
 * @param id - The ID
 * @param label - What the ID identifies, capitalized, for the error message, such as `"Group"`
 * @returns The parsed ID, or the validation failure
 */
export function parseRequiredId(
  id: string,
  label: string
): ValidationFailure | { valid: true; parsed: ParsedSchemaId } {
  if (!id.trim()) {
    return { valid: false, error: `${label} ID cannot be empty` };
  }
  return { valid: true, parsed: parseSchemaId(id) };
}

/**
 * Validates the removal of a group or attribute group: what the ID identifies must exist, and a
 * definition must not be referenced any more.
 *
 * @param located - What the ID identifies, a definition with its name, or the validation failure
 * @param label - The kind of definition, capitalized, for the error message, such as `"Group"`
 * @param isReferenced - Returns true if a definition of this name is still referenced
 * @returns The validation result
 */
export function validateDefinitionRemoval(
  located: ValidationFailure | { valid: true; target: string; name?: string },
  label: string,
  isReferenced: (name: string) => boolean
): ValidationResult {
  if (!located.valid) {
    return located;
  }
  if (located.target === "definition" && located.name && isReferenced(located.name)) {
    return { valid: false, error: `${label} is still referenced and cannot be removed: ${located.name}` };
  }
  return { valid: true };
}

/** A local element or attribute, as far as the checks look at it. */
export interface NamedChild {
  name?: string;
  ref?: string;
}

/** Elements or attributes, for {@link locateChild}. */
export interface ChildKind {
  /** The name of the kind for error messages, capitalized, such as `"Element"`. */
  label: string;
  /** The types of the parents that can hold children of this kind. */
  validParents: readonly string[];
  /**
   * Returns the children of this kind of a parent.
   *
   * @param parent - The parent, of one of the types in `validParents`
   * @returns The children
   */
  getChildren(parent: unknown): NamedChild[];
}

/**
 * Validates the parent of the element or attribute that an add command creates: it exists and can
 * hold the kind, a reference is not added to the schema root, and a top-level name is not used yet (see
 * {@link validateUniqueTopLevelName}).
 *
 * @param schemaObj - The schema
 * @param parentId - The ID of the parent
 * @param kind - Elements or attributes
 * @param name - The name of the new element or attribute, if it is not a reference
 * @param ref - The ref of the new element or attribute, if it is a reference
 * @returns The validation result
 */
export function validateNewChild(
  schemaObj: schema,
  parentId: string,
  kind: ChildKind,
  name: string | undefined,
  ref: string | undefined
): ValidationResult {
  const label = kind.label.toLowerCase();
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return { valid: false, error: `Parent node not found: ${parentId}` };
  }
  const parentType = location.parentType;
  if (!kind.validParents.includes(parentType)) {
    return { valid: false, error: `Cannot add ${label} to parent of type: ${parentType}` };
  }
  if (ref !== undefined && parentType === "schema") {
    return { valid: false, error: `Top-level ${label}s cannot be references` };
  }
  return validateUniqueTopLevelName(schemaObj, kind, parentType, name, "add");
}

/**
 * Validates that no other top-level element or attribute has the name that a top-level one gets: the
 * top-level components of one kind need unique names. Local elements and attributes are not checked here;
 * whether they may share a name is decided by the constraints of XML Schema that the pipeline checks on the
 * result, such as that elements with the same name in a content model have the same type.
 *
 * @param schemaObj - The schema
 * @param kind - Elements or attributes
 * @param parentType - The type of the parent of the element or attribute; only `"schema"` is checked
 * @param name - The new name, if the element or attribute gets one
 * @param action - What the command does, for the message, such as `"add"`
 * @param changedChild - The element or attribute that is renamed, which may already have the name
 * @returns The validation result
 */
export function validateUniqueTopLevelName(
  schemaObj: schema,
  kind: ChildKind,
  parentType: string,
  name: string | undefined,
  action: string,
  changedChild?: NamedChild
): ValidationResult {
  const isUsed = (other: NamedChild): boolean => other !== changedChild && other.name === name;
  if (parentType !== "schema" || !name || !kind.getChildren(schemaObj).some(isUsed)) {
    return { valid: true };
  }
  const label = kind.label.toLowerCase();
  return { valid: false, error: `Cannot ${action} ${label}: duplicate ${label} name '${name}' in schema` };
}

/** An element or attribute that {@link locateChild} found, and the type of its parent. */
export interface LocatedChild {
  valid: true;
  /** The element or attribute. */
  child: NamedChild;
  /** The type of the parent, such as `"sequence"`. */
  parentType: string;
}

/**
 * Says which child of an ID was not found, for messages: `with name: a`, `at position: 2`, or
 * `with name: a at position: 0` if the ID has both, which also covers a child at the position that has
 * another name.
 *
 * @param name - The name from the ID, if it has one
 * @param position - The position from the ID, if it has one
 * @returns The description
 */
function describeMissingChild(name: string | undefined, position: number | undefined): string {
  const atPosition = position === undefined ? "" : `at position: ${position}`;
  if (name === undefined) {
    return atPosition || "with name: (none)";
  }
  return atPosition ? `with name: ${name} ${atPosition}` : `with name: ${name}`;
}

/**
 * Locates the local element or attribute that an ID identifies, by its position or else by its name
 * or ref. The ID must not be empty; a missing parent ID stands for the schema root.
 *
 * @param schemaObj - The schema
 * @param id - The ID of the element or attribute
 * @param kind - Elements or attributes
 * @param action - What the command does, for the error about a parent that cannot hold the kind,
 * such as `"remove element from"`
 * @returns The element or attribute, or the validation failure
 */
export function locateChild(
  schemaObj: schema,
  id: string,
  kind: ChildKind,
  action: string
): ValidationFailure | LocatedChild {
  const parsedId = parseRequiredId(id, kind.label);
  if (!parsedId.valid) {
    return parsedId;
  }
  const parsed = parsedId.parsed;
  const location = locateNodeById(schemaObj, parsed.parentId ?? SCHEMA_ROOT_ID);
  if (!location.found) {
    return { valid: false, error: `Parent node not found for ${kind.label.toLowerCase()}: ${id}` };
  }
  const parentType = location.parentType;
  if (!kind.validParents.includes(parentType)) {
    return { valid: false, error: `Cannot ${action} parent of type: ${parentType}` };
  }

  const children = kind.getChildren(location.parent);
  const child = findIdentifiedChild(children, parsed.name, parsed.position);
  if (!child) {
    return { valid: false, error: `${kind.label} not found ${describeMissingChild(parsed.name, parsed.position)}` };
  }
  return { valid: true, child, parentType };
}

/**
 * Validates the parent of the anonymous simpleType or complexType that an add command creates: it
 * exists, can hold such a type, is not a reference and has no anonymous type of this kind yet. Nodes
 * with a `ref` refer to existing declarations instead of declaring something of their own, so they
 * cannot get an inline type; nodes with a `type_` are still local declarations and may change from
 * the named type to an inline anonymous one.
 *
 * @param parentId - The ID of the parent
 * @param schemaObj - The schema
 * @param kind - The kind of the new type
 * @param validParentTypes - The types of the parents that can hold an anonymous type of this kind
 * @returns The validation result
 */
export function validateInlineTypeParent(
  parentId: string,
  schemaObj: schema,
  kind: TypeKind,
  validParentTypes: readonly string[]
): ValidationResult {
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return { valid: false, error: `Parent not found: ${parentId}` };
  }
  if (!validParentTypes.includes(location.parentType)) {
    return { valid: false, error: `Parent of type '${location.parentType}' cannot contain a ${kind}` };
  }
  const holder = location.parent as { ref?: string; simpleType?: object; complexType?: object };
  if (holder.ref) {
    return { valid: false, error: `'${parentId}' has a ref attribute and cannot carry an inline ${kind}` };
  }
  if (holder[kind]) {
    return { valid: false, error: `'${parentId}' already has an anonymous ${kind}` };
  }
  return { valid: true };
}

/** The result of {@link locateType}: the type and whether it is anonymous, or the validation failure. */
export type LocatedType<T> = ValidationFailure | { valid: true; type: T; anonymous: boolean };

/**
 * Locates the anonymous simpleType or complexType that an ID such as `/element:a/anonymousSimpleType[0]`
 * identifies, in the element or attribute that holds it.
 *
 * @param typeId - The ID of the type, for messages
 * @param parentId - The ID of the element or attribute that holds the type
 * @param schemaObj - The schema
 * @param kind - The kind of the type, which is also the property that holds it
 * @returns The located type, or the validation failure if the parent or its type does not exist
 */
function locateAnonymousType<T>(
  typeId: string,
  parentId: string | undefined,
  schemaObj: schema,
  kind: TypeKind
): LocatedType<T> {
  if (!parentId) {
    return { valid: false, error: `Invalid anonymous ${kind} ID: ${typeId}` };
  }
  const location = locateNodeById(schemaObj, parentId);
  if (!location.found) {
    return { valid: false, error: `Parent not found: ${parentId}` };
  }
  const type = (location.parent as Partial<Record<TypeKind, T>>)[kind];
  if (type === undefined) {
    return { valid: false, error: `No anonymous ${kind} found in parent: ${parentId}` };
  }
  return { valid: true, type, anonymous: true };
}

/**
 * Locates the simpleType or complexType that a remove or modify command changes: an anonymous type
 * in its parent, or a top-level type.
 *
 * @param typeId - The ID of the type
 * @param schemaObj - The schema
 * @param kind - The kind of the type
 * @param topLevelTypes - The top-level types of this kind
 * @returns The located type
 */
export function locateType<T>(
  typeId: string,
  schemaObj: schema,
  kind: TypeKind,
  topLevelTypes: Array<T & NamedComponent> | undefined
): LocatedType<T> {
  const parsedId = parseRequiredId(typeId, "Type");
  if (!parsedId.valid) {
    return parsedId;
  }
  const parsed = parsedId.parsed;
  const anonymousNodeType =
    kind === "simpleType" ? SchemaNodeType.AnonymousSimpleType : SchemaNodeType.AnonymousComplexType;
  if (parsed.nodeType === anonymousNodeType) {
    return locateAnonymousType<T>(typeId, parsed.parentId, schemaObj, kind);
  }
  const type = (topLevelTypes ?? []).find((t) => t.name === parsed.name);
  if (!type) {
    return { valid: false, error: `${TYPE_LABELS[kind]} '${parsed.name ?? "(none)"}' not found in schema` };
  }
  return { valid: true, type, anonymous: false };
}

/** The kinds of types, capitalized, for the error messages. */
const TYPE_LABELS: Record<TypeKind, string> = { simpleType: "Simple type", complexType: "Complex type" };

/**
 * Validates that no top-level type has the name yet. Simple and complex types share their names, so a
 * complex type cannot have the name of a simple type, and the other way round.
 *
 * @param typeName - The name
 * @param schemaObj - The schema
 * @param renamedType - The type that gets the name, which may already have it
 * @returns The validation result
 */
export function validateUnusedTypeName(typeName: string, schemaObj: schema, renamedType?: unknown): ValidationResult {
  for (const kind of ["simpleType", "complexType"] as const) {
    if ((schemaObj[kind] ?? []).some((type) => type !== renamedType && type.name === typeName)) {
      return { valid: false, error: `${TYPE_LABELS[kind]} '${typeName}' already exists in schema` };
    }
  }
  return { valid: true };
}

/**
 * Validates the new name that a modify command gives a type: an anonymous type cannot get one, and the
 * name of a top-level type must be a valid XML name that no other type has (see
 * {@link validateUnusedTypeName}).
 *
 * @param typeName - The new name, if the command changes it
 * @param located - The type that the command changes
 * @param kind - The kind of the type
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateNewTypeName(
  typeName: string | undefined,
  located: { anonymous: boolean; type: unknown },
  kind: TypeKind,
  schemaObj: schema
): ValidationResult {
  if (typeName === undefined) {
    return { valid: true };
  }
  if (located.anonymous) {
    return { valid: false, error: `Cannot provide 'typeName' when modifying an anonymous ${kind}` };
  }
  if (!isValidXmlName(typeName)) {
    return { valid: false, error: "Type name must be a valid XML name" };
  }
  return validateUnusedTypeName(typeName, schemaObj, located.type);
}
