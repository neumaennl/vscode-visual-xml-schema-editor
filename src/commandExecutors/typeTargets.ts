/**
 * Helpers for the simpleTypes and complexTypes that the type commands change: anonymous types, which
 * elements and attributes hold inline, and top-level types in the schema.
 */

import type { schema } from "../../shared/types.js";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy.js";
import { isSchemaRoot } from "../../shared/schemaUtils.js";
import { assumeValidated, locateValidated } from "./assumeValidated.js";
import { appendTo, removeFrom } from "./nodeProperties.js";
import { renameLocalTypeInSchema } from "./schemaLocalRenamer.js";

/** The two kinds of types, named like the property that holds them in the schema or in their parent. */
export type TypeKind = "simpleType" | "complexType";

/** An element or attribute that can hold an anonymous type instead of a named one. */
interface TypeHolder { type_?: string; simpleType?: object; complexType?: object }

/** The top-level types of the schema, as far as these helpers use them. */
type TypesOfSchema = Record<TypeKind, Array<{ name: string }> | undefined>;

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
  const anonymousNodeType = kind === "simpleType" ? SchemaNodeType.AnonymousSimpleType : SchemaNodeType.AnonymousComplexType;
  if (parsed.nodeType !== anonymousNodeType) {
    return undefined;
  }
  const holder = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${typeId}`)).parent as TypeHolder;
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
  if (isSchemaRoot(parentId)) {
    appendTo(schemaObj as TypesOfSchema, kind, type as { name: string });
    return;
  }
  // isSchemaRoot() guarantees that parentId is a non-empty string here
  const holder = locateValidated(schemaObj, parentId as string).parent as TypeHolder;
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
  removeFrom(schemaObj as TypesOfSchema, kind, (type) => type.name === name, `${labelOf(kind)} ${typeId}`);
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
export function locateModifiedType<T>(
  schemaObj: schema,
  typeId: string,
  kind: TypeKind,
  typeName: string | undefined
): { type: T; topLevel: boolean } {
  const holder = locateAnonymousTypeHolder(schemaObj, typeId, kind);
  if (holder) {
    return { type: holder[kind] as T, topLevel: false };
  }
  const name = parseSchemaId(typeId).name;
  const type = assumeValidated(
    ((schemaObj as TypesOfSchema)[kind] ?? []).find((t) => t.name === name),
    `${labelOf(kind)} ${typeId}`
  );
  if (typeName !== undefined) {
    renameLocalTypeInSchema(type.name, typeName, schemaObj);
    type.name = typeName;
  }
  return { type: type as T, topLevel: true };
}
