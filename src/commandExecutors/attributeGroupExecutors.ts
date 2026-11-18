/**
 * Executors for attributeGroup commands.
 * Implements add, remove, and modify operations for named attribute group
 * definitions and attribute group references (`xs:attributeGroup ref="..."`).
 */

import type {
  schema,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "../../shared/types.js";
import { namedAttributeGroup, attributeGroupRef } from "../../shared/types.js";
import { parseSchemaId, SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy.js";
import { assumeValidated, locateValidated } from "./assumeValidated.js";
import { createAnnotation, setDocumentation } from "./annotationUtils.js";
import { renameOwnReferences } from "../schemaReferences/referenceRewrites.js";
import type { AttributeContainer } from "../../shared/schemaUtils.js";
import { getAttributeContainer } from "../../shared/schemaUtils.js";
import { findAttributeGroupRef } from "../commandUtils.js";
import { appendTo, removeFrom } from "./nodeProperties.js";

// ===== Helper functions =====

/**
 * Locates the attribute group reference that an ID of the form
 * `/complexType:X/attributeGroupRef:Name[0]` identifies. In a complex type with complex or simple
 * content, the references are those of its extension or restriction.
 *
 * @param schemaObj - The schema
 * @param groupId - The ID of the reference
 * @returns The node that holds the references, and the reference if it exists
 */
function locateAttrGroupRef(
  schemaObj: schema,
  groupId: string
): { holder: AttributeContainer; target: attributeGroupRef | undefined } {
  const parsed = parseSchemaId(groupId);
  const location = locateValidated(schemaObj, assumeValidated(parsed.parentId, `Parent of ${groupId}`));
  const holder = getAttributeContainer(location.parent);
  return { holder, target: findAttributeGroupRef(holder.attributeGroup ?? [], parsed.name, parsed.position) };
}

// ===== Attribute Group Executors =====

/**
 * Executes an `addAttributeGroup` command.
 *
 * Two modes depending on whether `payload.ref` is set:
 * - **Definition mode** (`groupName`): creates a top-level named attribute group.
 * - **Reference mode** (`ref` + `parentId`): creates `xs:attributeGroup ref="..."`
 *   inside the complexType or `namedAttributeGroup` identified by `parentId`.
 *
 * @param command - The `addAttributeGroup` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the parent node is not found (reference mode) or unsupported
 */
export function executeAddAttributeGroup(command: AddAttributeGroupCommand, schemaObj: schema): void {
  const { groupName, documentation, ref, parentId } = command.payload;

  if (ref !== undefined) {
    // Reference mode: add xs:attributeGroup ref="..." to a complexType or namedAttributeGroup
    const location = locateValidated(schemaObj, parentId ?? SCHEMA_ROOT_ID);
    const agRef = new attributeGroupRef();
    agRef.ref = ref;
    if (documentation) {
      agRef.annotation = createAnnotation(documentation);
    }
    // In a complex type with complex or simple content, the reference goes to its extension or restriction
    appendTo(getAttributeContainer(location.parent), "attributeGroup", agRef);
    return;
  }

  // Definition mode: add a top-level named attribute group
  const attrGroup = new namedAttributeGroup();
  attrGroup.name = assumeValidated(groupName, "Attribute group name");
  if (documentation) {
    attrGroup.annotation = createAnnotation(documentation);
  }
  appendTo(schemaObj, "attributeGroup", attrGroup);
}

/**
 * Executes a `removeAttributeGroup` command.
 *
 * The `groupId` is used for both:
 * - `/attributeGroup:Name` — removes the top-level named attribute group definition.
 * - `/complexType:X/attributeGroupRef:Name[0]` — removes the attribute group reference.
 *
 * @param command - The `removeAttributeGroup` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the attribute group or its parent is not found
 */
export function executeRemoveAttributeGroup(command: RemoveAttributeGroupCommand, schemaObj: schema): void {
  const { groupId } = command.payload;
  const parsed = parseSchemaId(groupId);

  if (parsed.nodeType === SchemaNodeType.AttributeGroupRef) {
    // Reference mode: remove xs:attributeGroup ref="..." from its parent
    const { holder, target } = locateAttrGroupRef(schemaObj, groupId);
    removeFrom(holder, "attributeGroup", (r) => r === target, `Attribute group reference ${groupId}`);
    return;
  }

  // Definition mode: remove top-level named attribute group
  removeFrom(schemaObj, "attributeGroup", (g) => g.name === parsed.name, `Attribute group ${groupId}`);
}

/**
 * Executes a `modifyAttributeGroup` command.
 *
 * The `groupId` is used for both:
 * - `/attributeGroup:Name` — modifies the top-level named attribute group definition.
 * - `/complexType:X/attributeGroupRef:Name[0]` — modifies the attribute group reference.
 *
 * @param command - The `modifyAttributeGroup` command to execute
 * @param schemaObj - The schema object to modify
 * @throws An {@link Error} if the attribute group or its parent is not found
 */
export function executeModifyAttributeGroup(command: ModifyAttributeGroupCommand, schemaObj: schema): void {
  const { groupId, groupName, documentation, ref } = command.payload;
  const parsed = parseSchemaId(groupId);

  if (parsed.nodeType === SchemaNodeType.AttributeGroupRef) {
    // Reference mode: modify xs:attributeGroup ref="..." in its parent
    const target = assumeValidated(
      locateAttrGroupRef(schemaObj, groupId).target,
      `Attribute group reference ${groupId}`
    );
    if (ref !== undefined) {
      target.ref = ref;
    }
    if (documentation !== undefined) {
      setDocumentation(target, documentation);
    }
    return;
  }

  // Definition mode: modify top-level named attribute group
  const attrGroup = assumeValidated(
    (schemaObj.attributeGroup ?? []).find((g) => g.name === parsed.name),
    `Attribute group ${groupId}`
  );
  if (groupName !== undefined) {
    renameOwnReferences("attributeGroup", attrGroup.name, groupName, schemaObj);
    attrGroup.name = groupName;
  }
  if (documentation !== undefined) {
    setDocumentation(attrGroup, documentation);
  }
}
