/**
 * The CONSTRAINTS section of the General tab of the `PropertiesPanel`: the nillable, abstract and mixed
 * content toggles of elements and complex types.
 */

import type { DiagramItem } from "../diagram";
import type { SchemaCommand } from "../../shared/types";
import { SchemaNodeType, generateSchemaId } from "../../shared/idStrategy";
import { getNodeType, isTopLevelElement } from "./propertiesPanelCommands";
import { createSection, createToggleRow } from "./propertiesPanelDom";

/**
 * Renders the CONSTRAINTS section: the nillable, abstract and mixed content toggles that apply to
 * the element or complex type.
 *
 * @param node - The draft node, which is changed with the toggles
 * @param dispatchCommand - Callback used to emit schema-edit commands
 * @returns The section
 */
export function renderConstraintsSection(node: DiagramItem, dispatchCommand: (command: SchemaCommand) => void): HTMLElement {
  const section = createSection("lock", "CONSTRAINTS");

  const nodeType = getNodeType(node);
  if (nodeType === SchemaNodeType.Element) {
    // Nillable toggle (all elements)
    section.appendChild(
      createToggleRow("Nillable", node.isNillable, (next) => {
        node.isNillable = next;
        dispatchCommand({
          type: "modifyElement",
          payload: { elementId: node.id, nillable: next },
        });
      })
    );

    // Abstract toggle (top-level elements only)
    if (isTopLevelElement(node)) {
      section.appendChild(
        createToggleRow("Abstract", node.isAbstract, (next) => {
          node.isAbstract = next;
          dispatchCommand({
            type: "modifyElement",
            payload: { elementId: node.id, abstract: next },
          });
        })
      );
    }

    // Mixed content toggle (element with anonymous complex type)
    if (node.hasAnonymousComplexType) {
      const anonComplexTypeId = generateSchemaId({
        nodeType: SchemaNodeType.AnonymousComplexType,
        parentId: node.id,
        position: 0,
      });
      section.appendChild(
        createToggleRow("Mixed content", node.isMixed, (next) => {
          node.isMixed = next;
          dispatchCommand({
            type: "modifyComplexType",
            payload: { typeId: anonComplexTypeId, mixed: next },
          });
        })
      );
    }
  }

  if (nodeType === SchemaNodeType.ComplexType) {
    section.appendChild(
      createToggleRow("Abstract", node.isAbstract, (next) => {
        node.isAbstract = next;
        dispatchCommand({
          type: "modifyComplexType",
          payload: { typeId: node.id, abstract: next },
        });
      })
    );
  }

  if (nodeType === SchemaNodeType.ComplexType) {
    section.appendChild(
      createToggleRow("Mixed content", node.isMixed, (next) => {
        node.isMixed = next;
        dispatchCommand({
          type: "modifyComplexType",
          payload: { typeId: node.id, mixed: next },
        });
      })
    );
  }

  return section;
}

/**
 * Tells whether the node has constraints to edit, which elements and complex types have.
 *
 * @param node - The draft node
 * @returns True for elements and complex types
 */
export function canShowConstraintsSection(node: DiagramItem): boolean {
  const nodeType = getNodeType(node);
  return (
    nodeType === SchemaNodeType.Element ||
    nodeType === SchemaNodeType.ComplexType
  );
}
