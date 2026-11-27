/**
 * Removes a group or an attribute group: the ID of a remove command names either a top-level definition
 * or a reference to one.
 */

import type { schema } from "../../shared/types.js";
import { parseSchemaId, SchemaNodeType, type ParsedSchemaId } from "../../shared/idStrategy.js";
import { removeFrom } from "./nodeProperties.js";

/** The kinds of definitions that the schema holds and that other components can reference. */
type GroupKind = "group" | "attributeGroup";

/** What a kind of group is, for the error messages, and the node type of a reference to it. */
interface GroupKindInfo {
  label: string;
  referenceType: SchemaNodeType;
}

/** The information of each kind of group. */
const GROUP_KINDS: Readonly<Record<GroupKind, GroupKindInfo>> = {
  group: { label: "Group", referenceType: SchemaNodeType.GroupRef },
  attributeGroup: { label: "Attribute group", referenceType: SchemaNodeType.AttributeGroupRef },
};

/**
 * Removes the reference that an ID names, or otherwise the top-level definition.
 *
 * @param schemaObj - The schema object to modify
 * @param groupId - The ID of the definition or the reference
 * @param kind - The kind of group
 * @param removeReference - Removes the reference, given its parsed ID
 * @throws An {@link Error} if the definition is not found
 */
export function removeGroupDefinitionOrReference(
  schemaObj: schema,
  groupId: string,
  kind: GroupKind,
  removeReference: (parsed: ParsedSchemaId) => void
): void {
  const parsed = parseSchemaId(groupId);
  const { label, referenceType } = GROUP_KINDS[kind];
  if (parsed.nodeType === referenceType) {
    removeReference(parsed);
    return;
  }
  removeFrom(schemaObj, kind, (definition) => definition.name === parsed.name, `${label} ${groupId}`);
}
