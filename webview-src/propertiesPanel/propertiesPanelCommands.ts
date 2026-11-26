/**
 * The commands that the properties panel sends: it translates edited values of a diagram item into
 * schema commands.
 */

import type { SchemaCommand } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import { getComplexDerivation, hasInlineSimpleType, type DiagramItem } from "../diagram";
import { getNodeType } from "./propertiesPanelNodeKinds";
import { resolveComplexTypeId, resolveSimpleTypeId } from "./propertiesPanelTargets";
import { normalizeTypeReference } from "./propertiesPanelTypeReferences";

/** Sends a schema command, which the properties panel built from an edit, to the extension host. */
export type CommandDispatcher = (command: SchemaCommand) => void;

/**
 * Builds a rename command for the selected node.
 *
 * @param node - Diagram item being renamed
 * @param newName - Proposed new name from the UI
 * @returns A schema command or null when the node/name is not editable
 */
export function createRenameNodeCommand(node: DiagramItem, newName: string): SchemaCommand | null {
  const name = newName.trim();
  if (!name) {
    return null;
  }
  const nodeType = getNodeType(node);
  switch (nodeType) {
    case SchemaNodeType.Element:
      return { type: "modifyElement", payload: { elementId: node.id, elementName: name } };
    case SchemaNodeType.SimpleType:
      return { type: "modifySimpleType", payload: { typeId: node.id, typeName: name } };
    case SchemaNodeType.ComplexType:
      return { type: "modifyComplexType", payload: { typeId: node.id, typeName: name } };
    case SchemaNodeType.Group:
      return { type: "modifyGroup", payload: { groupId: node.id, groupName: name } };
    default:
      return null;
  }
}

/**
 * Builds a remove command for the selected node.
 *
 * @param node - Diagram item being removed
 * @returns A schema remove command or null when the node is not deletable
 */
export function createDeleteNodeCommand(node: DiagramItem): SchemaCommand | null {
  const nodeType = getNodeType(node);
  switch (nodeType) {
    case SchemaNodeType.Element:
      return { type: "removeElement", payload: { elementId: node.id } };
    case SchemaNodeType.SimpleType:
      return { type: "removeSimpleType", payload: { typeId: node.id } };
    case SchemaNodeType.ComplexType:
      return { type: "removeComplexType", payload: { typeId: node.id } };
    case SchemaNodeType.Group:
    case SchemaNodeType.GroupRef:
      return { type: "removeGroup", payload: { groupId: node.id } };
    case SchemaNodeType.Sequence:
    case SchemaNodeType.Choice:
    case SchemaNodeType.All:
      return { type: "removeCompositor", payload: { compositorId: node.id } };
    default:
      return null;
  }
}

/**
 * Builds a type/base-type update command for the selected node.
 *
 * @param node - Diagram item being edited
 * @param nextType - Proposed new type text from the UI
 * @returns A schema command or null when the node/type is not editable
 */
export function createTypeCommand(node: DiagramItem, nextType: string): SchemaCommand | null {
  const typeName = normalizeTypeReference(node, nextType);
  if (!typeName) {
    return null;
  }
  const nodeType = getNodeType(node);
  switch (nodeType) {
    case SchemaNodeType.Element:
      if (hasInlineSimpleType(node)) {
        return {
          type: "modifySimpleType",
          payload: {
            typeId: resolveSimpleTypeId(node) ?? node.id,
            baseType: typeName,
          },
        };
      }
      return { type: "modifyElement", payload: { elementId: node.id, elementType: typeName } };
    case SchemaNodeType.SimpleType:
      return { type: "modifySimpleType", payload: { typeId: node.id, baseType: typeName } };
    default:
      return null;
  }
}

/**
 * Builds a complex-type base-type update command for the selected node.
 *
 * @param node - Diagram item being edited
 * @param nextBaseType - Proposed new base type from the UI
 * @returns A schema command or null when the node/base type is not editable
 */
export function createComplexBaseTypeCommand(node: DiagramItem, nextBaseType: string): SchemaCommand | null {
  const baseType = normalizeTypeReference(node, nextBaseType);
  const complexTypeId = resolveComplexTypeId(node);
  if (!complexTypeId) {
    return null;
  }
  return {
    type: "modifyComplexType",
    payload: {
      typeId: complexTypeId,
      baseType,
      derivationKind: getComplexDerivation(node)?.kind ?? "extension",
    },
  };
}
