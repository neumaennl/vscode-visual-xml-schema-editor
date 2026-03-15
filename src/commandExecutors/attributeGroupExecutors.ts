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
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { locateNodeById } from "../schemaNavigator";
import { createAnnotation } from "./annotationUtils";

// ===== Structural types =====

/** Any node that carries a direct array of attribute group references. */
type AttrGroupRefHolder = { attributeGroup?: attributeGroupRef[] };

// ===== Helper functions =====

/**
 * Returns true if `parentType` is a type that can hold attribute group refs directly.
 */
function isAttrGroupRefParent(parentType: string): boolean {
  return (
    parentType === "topLevelComplexType" ||
    parentType === "localComplexType" ||
    parentType === "namedAttributeGroup"
  );
}

/**
 * Adds an attributeGroupRef to a parent node's `attributeGroup` array.
 *
 * @throws Error if the parent type does not support attribute group refs
 */
function addAttrGroupRefToParent(
  parent: unknown,
  parentType: string,
  agRef: attributeGroupRef
): void {
  if (!isAttrGroupRefParent(parentType)) {
    throw new Error(
      `Cannot add attribute group reference to parent type: ${parentType}`
    );
  }
  const holder = parent as AttrGroupRefHolder;
  const refs = toArray(holder.attributeGroup);
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
    const location = locateNodeById(schemaObj, parentId ?? "schema");
    if (!location.found || !location.parent || !location.parentType) {
      throw new Error(`Parent node not found: ${parentId}`);
    }
    const agRef = new attributeGroupRef();
    agRef.ref = ref;
    if (documentation) {
      agRef.annotation = createAnnotation(documentation);
    }
    addAttrGroupRefToParent(location.parent, location.parentType, agRef);
    return;
  }

  // Definition mode: add a top-level named attribute group
  const attrGroup = new namedAttributeGroup();
  attrGroup.name = groupName as string;
  if (documentation) {
    attrGroup.annotation = createAnnotation(documentation);
  }
  const groups = toArray(schemaObj.attributeGroup);
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
    if (!parsed.parentId) {
      throw new Error(`Invalid attributeGroupRef ID: ${groupId}`);
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found || !location.parent || !location.parentType) {
      throw new Error(`Parent not found for attributeGroupRef: ${groupId}`);
    }
    const holder = location.parent as AttrGroupRefHolder;
    const refs = toArray(holder.attributeGroup);
    const filtered = filterAttrGroupRef(refs, parsed.name, parsed.position);
    if (filtered.length === refs.length) {
      throw new Error(`AttributeGroupRef not found: ${groupId}`);
    }
    holder.attributeGroup = filtered.length > 0 ? filtered : undefined;
    return;
  }

  // Definition mode: remove top-level named attribute group
  const groups = toArray(schemaObj.attributeGroup);
  const filtered = groups.filter((g) => g.name !== parsed.name);
  if (filtered.length === groups.length) {
    throw new Error(`AttributeGroup not found: ${parsed.name}`);
  }
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
    if (!parsed.parentId) {
      throw new Error(`Invalid attributeGroupRef ID: ${groupId}`);
    }
    const location = locateNodeById(schemaObj, parsed.parentId);
    if (!location.found || !location.parent || !location.parentType) {
      throw new Error(`Parent not found for attributeGroupRef: ${groupId}`);
    }
    const holder = location.parent as AttrGroupRefHolder;
    const target = findAttrGroupRef(
      toArray(holder.attributeGroup),
      parsed.name,
      parsed.position
    );
    if (!target) {
      throw new Error(`AttributeGroupRef not found: ${groupId}`);
    }
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
  const attrGroup = toArray(schemaObj.attributeGroup).find(
    (g) => g.name === parsed.name
  );
  if (!attrGroup) {
    throw new Error(`AttributeGroup not found: ${parsed.name}`);
  }
  if (groupName !== undefined) {
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
