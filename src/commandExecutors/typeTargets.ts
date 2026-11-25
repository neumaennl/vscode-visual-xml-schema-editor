/**
 * Helpers for the simpleTypes and complexTypes that the type commands change: anonymous types, which
 * elements and attributes hold inline, and top-level types in the schema.
 */

import type {
  localComplexType,
  localSimpleType,
  schema,
  topLevelComplexType,
  topLevelSimpleType,
} from "../../shared/types.js";
import { isSchemaRoot, parseSchemaId, SchemaNodeType, type TypeKind } from "../../shared/idStrategy.js";
import { assumeValidated, locateValidated } from "./assumeValidated.js";
import { appendTo, removeFrom } from "./nodeProperties.js";
import { renameReferencesInTargetNamespace } from "../schemaReferences/referenceRewrites.js";

/** The types of each kind, top-level or anonymous. */
interface TypesOfKind {
  simpleType: topLevelSimpleType | localSimpleType;
  complexType: topLevelComplexType | localComplexType;
}

/** An element or attribute that can hold an anonymous type instead of a named one. */
interface TypeHolder {
  type_?: string;
  simpleType?: object;
  complexType?: object;
}

/**
 * Returns the label of a kind of type for error messages.
 *
 * @param kind - The kind of type
 * @returns `Simple type` or `Complex type`
 */
function labelOf(kind: TypeKind): string {
  return kind === "simpleType" ? "Simple type" : "Complex type";
}

/**
 * Locates the element or attribute that holds the anonymous type that an ID of the form
 * `…/anonymousSimpleType[0]` or `…/anonymousComplexType[0]` identifies.
 *
 * @param schemaObj - The schema
 * @param typeId - The ID of the type
 * @param kind - The kind of the type
 * @returns The element or attribute, or `undefined` if the ID identifies a top-level type
 */
function locateAnonymousTypeHolder(schemaObj: schema, typeId: string, kind: TypeKind): TypeHolder | undefined {
  const parsed = parseSchemaId(typeId);
  const anonymousNodeType =
    kind === "simpleType" ? SchemaNodeType.AnonymousSimpleType : SchemaNodeType.AnonymousComplexType;
  if (parsed.nodeType !== anonymousNodeType) {
    return undefined;
  }
  const holder = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${typeId}`))
    .parent as TypeHolder;
  assumeValidated(holder[kind], `${labelOf(kind)} ${typeId}`);
  return holder;
}

/**
 * Places a new type: as the anonymous type of the element or attribute that `parentId` identifies,
 * where it replaces the named type and any other anonymous type, or as a top-level type in the schema.
 *
 * @param schemaObj - The schema
 * @param parentId - The ID of the element or attribute, or the schema root (or none) for a top-level type
 * @param kind - The kind of the type
 * @param type - The new type; a top-level type has its name already
 */
export function placeNewType(schemaObj: schema, parentId: string | undefined, kind: TypeKind, type: object): void {
  if (parentId === undefined || isSchemaRoot(parentId)) {
    appendTo(schemaObj, kind, type as topLevelSimpleType | topLevelComplexType);
    return;
  }
  const holder = locateValidated(schemaObj, parentId).parent as TypeHolder;
  holder.type_ = undefined;
  holder.simpleType = undefined;
  holder.complexType = undefined;
  holder[kind] = type;
}

/**
 * Removes the anonymous or top-level type that an ID identifies.
 *
 * @param schemaObj - The schema
 * @param typeId - The ID of the type
 * @param kind - The kind of the type
 */
export function removeType(schemaObj: schema, typeId: string, kind: TypeKind): void {
  const holder = locateAnonymousTypeHolder(schemaObj, typeId, kind);
  if (holder) {
    holder[kind] = undefined;
    return;
  }
  const name = parseSchemaId(typeId).name;
  removeFrom(schemaObj, kind, (type) => type.name === name, `${labelOf(kind)} ${typeId}`);
}

/**
 * Locates the anonymous or top-level type that a modify command changes. A new name renames a top-level
 * type together with the references to it; the validator allows no name for an anonymous type.
 *
 * @param schemaObj - The schema
 * @param typeId - The ID of the type
 * @param kind - The kind of the type
 * @param typeName - The new name, if the command changes it
 * @returns The type, and whether it is a top-level type
 */
export function locateModifiedType<K extends TypeKind>(
  schemaObj: schema,
  typeId: string,
  kind: K,
  typeName: string | undefined
): { type: TypesOfKind[K]; topLevel: boolean } {
  const holder = locateAnonymousTypeHolder(schemaObj, typeId, kind);
  if (holder) {
    return { type: holder[kind] as TypesOfKind[K], topLevel: false };
  }
  const name = parseSchemaId(typeId).name;
  const type = assumeValidated(
    (schemaObj[kind] ?? []).find((t: topLevelSimpleType | topLevelComplexType) => t.name === name),
    `${labelOf(kind)} ${typeId}`
  );
  if (typeName !== undefined) {
    renameReferencesInTargetNamespace("type", type.name, typeName, schemaObj);
    type.name = typeName;
  }
  return { type, topLevel: true };
}
