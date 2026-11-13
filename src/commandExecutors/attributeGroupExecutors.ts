/**
 * Executors for attributeGroup commands.
 * Implements add, remove, and modify operations for named attribute group
 * definitions and attribute group references (xs:attributeGroup ref="...").
 */

import {
  schema,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
  namedAttributeGroup,
  attributeGroupRef,
  annotationType,
  documentationType,
} from "../../shared/types.js";
import { parseSchemaId, SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy.js";
import { assumeRemoved, assumeValidated, locateValidated } from "./assumeValidated.js";
import { createAnnotation } from "./annotationUtils.js";
import { renameLocalAttributeGroupRefInSchema } from "./schemaLocalRenamer.js";
import { getAttributeContainer } from "../../shared/schemaUtils.js";

// ===== Helper functions =====

/**
 * Adds an attributeGroupRef to a parent node's `attributeGroup` array. In a complex type with
 * complex or simple content, the reference is added to its extension or restriction.
 */
function addAttrGroupRefToParent(
  parent: unknown,
  agRef: attributeGroupRef
): void {
  const holder = getAttributeContainer(parent);
  const refs = holder.attributeGroup ?? [];
  refs.push(agRef);
  holder.attributeGroup = refs;
}

/**
 * Finds an attributeGroupRef in a parent's array by ref name and optional position.
 */
function findAttrGroupRef(
  refs: attributeGroupRef[],
  name: string | undefined,
  position: number | undefined
): attributeGroupRef | undefined {
  if (name !== undefined && position !== undefined) {
    return refs.find((r, idx) => r.ref === name && idx === position);
  }
  if (name !== undefined) {
    return refs.find((r) => r.ref === name);
  }
  if (position !== undefined) {
    return refs[position];
  }
  return undefined;
}

/**
 * Returns a new array with the first matching attributeGroupRef removed.
 */
function filterAttrGroupRef(
  refs: attributeGroupRef[],
  name: string | undefined,
  position: number | undefined
): attributeGroupRef[] {
  if (name !== undefined && position !== undefined) {
    return refs.filter((r, idx) => !(r.ref === name && idx === position));
  }
  if (name !== undefined) {
    let removed = false;
    return refs.filter((r) => {
      if (!removed && r.ref === name) {
        removed = true;
        return false;
      }
      return true;
    });
  }
  if (position !== undefined) {
    return refs.filter((_, idx) => idx !== position);
  }
  return refs;
}

// ===== Attribute Group Executors =====

/**
 * Executes an addAttributeGroup command.
 *
 * Two modes depending on whether `payload.ref` is set:
 * - **Definition mode** (`groupName`): creates a top-level named attribute group.
 * - **Reference mode** (`ref` + `parentId`): creates `xs:attributeGroup ref="..."`
 *   inside the complexType or namedAttributeGroup identified by `parentId`.
 *
 * @param command - The addAttributeGroup command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the parent node is not found (reference mode) or unsupported
 */
export function executeAddAttributeGroup(
  command: AddAttributeGroupCommand,
  schemaObj: schema
): void {
  const { groupName, documentation, ref, parentId } = command.payload;

  if (ref !== undefined) {
    // Reference mode: add xs:attributeGroup ref="..." to a complexType or namedAttributeGroup
    const location = locateValidated(schemaObj, parentId ?? SCHEMA_ROOT_ID);
    const agRef = new attributeGroupRef();
    agRef.ref = ref;
    if (documentation) {
      agRef.annotation = createAnnotation(documentation);
    }
    addAttrGroupRefToParent(location.parent, agRef);
    return;
  }

  // Definition mode: add a top-level named attribute group
  const attrGroup = new namedAttributeGroup();
  attrGroup.name = assumeValidated(groupName, "Attribute group name");
  if (documentation) {
    attrGroup.annotation = createAnnotation(documentation);
  }
  const groups = schemaObj.attributeGroup ?? [];
  groups.push(attrGroup);
  schemaObj.attributeGroup = groups;
}

/**
 * Executes a removeAttributeGroup command.
 *
 * The `groupId` is used for both:
 * - `/attributeGroup:Name` — removes the top-level named attribute group definition.
 * - `/complexType:X/attributeGroupRef:Name[0]` — removes the attribute group reference.
 *
 * @param command - The removeAttributeGroup command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the attribute group or its parent is not found
 */
export function executeRemoveAttributeGroup(
  command: RemoveAttributeGroupCommand,
  schemaObj: schema
): void {
  const { groupId } = command.payload;
  const parsed = parseSchemaId(groupId);

  if (parsed.nodeType === SchemaNodeType.AttributeGroupRef) {
    // Reference mode: remove xs:attributeGroup ref="..." from its parent
    const location = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${groupId}`));
    const holder = getAttributeContainer(location.parent);
    const refs = holder.attributeGroup ?? [];
    const filtered = assumeRemoved(
      refs,
      filterAttrGroupRef(refs, parsed.name, parsed.position),
      `Attribute group reference ${groupId}`
    );
    holder.attributeGroup = filtered.length > 0 ? filtered : undefined;
    return;
  }

  // Definition mode: remove top-level named attribute group
  const groups = schemaObj.attributeGroup ?? [];
  const filtered = assumeRemoved(groups, groups.filter((g) => g.name !== parsed.name), `Attribute group ${groupId}`);
  schemaObj.attributeGroup = filtered.length > 0 ? filtered : undefined;
}

/**
 * Executes a modifyAttributeGroup command.
 *
 * The `groupId` is used for both:
 * - `/attributeGroup:Name` — modifies the top-level named attribute group definition.
 * - `/complexType:X/attributeGroupRef:Name[0]` — modifies the attribute group reference.
 *
 * @param command - The modifyAttributeGroup command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the attribute group or its parent is not found
 */
export function executeModifyAttributeGroup(
  command: ModifyAttributeGroupCommand,
  schemaObj: schema
): void {
  const { groupId, groupName, documentation, ref } = command.payload;
  const parsed = parseSchemaId(groupId);

  if (parsed.nodeType === SchemaNodeType.AttributeGroupRef) {
    // Reference mode: modify xs:attributeGroup ref="..." in its parent
    const location = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${groupId}`));
    const holder = getAttributeContainer(location.parent);
    const target = assumeValidated(
      findAttrGroupRef(holder.attributeGroup ?? [], parsed.name, parsed.position),
      `Attribute group reference ${groupId}`
    );
    if (ref !== undefined) {
      target.ref = ref;
    }
    if (documentation !== undefined) {
      if (!target.annotation) {
        target.annotation = new annotationType();
      }
      const doc = new documentationType();
      doc.value = documentation;
      target.annotation.documentation = [doc];
    }
    return;
  }

  // Definition mode: modify top-level named attribute group
  const attrGroup = assumeValidated(
    (schemaObj.attributeGroup ?? []).find((g) => g.name === parsed.name),
    `Attribute group ${groupId}`
  );
  if (groupName !== undefined) {
    renameLocalAttributeGroupRefInSchema(attrGroup.name, groupName, schemaObj);
    attrGroup.name = groupName;
  }
  if (documentation !== undefined) {
    if (!attrGroup.annotation) {
      attrGroup.annotation = new annotationType();
    }
    const doc = new documentationType();
    doc.value = documentation;
    attrGroup.annotation.documentation = [doc];
  }
}
