/**
 * Property-panel helpers for rendering and editing type-related fields.
 * Keeps complex inline/replacement/base-type logic out of the main panel class.
 */

import { SchemaCommand } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem } from "../diagram";
import { createEditableField } from "./propertyPanelDom";
import {
  createComplexBaseTypeCommand,
  createTypeCommand,
  extractBaseType,
  getNodeType,
  normalizeTypeReferenceForCurrentSchema,
} from "./propertyPanelCommands";
import {
  getDerivationRelation,
  getReadOnlyTypeValue,
  getTypeEditHint,
  hasInlineAnonymousElementType,
  isInlineComplexTypeElement,
  isInlineSimpleTypeElement,
} from "./propertyPanelTypeHelpers";

/**
 * Renders the type/base-type editing controls for the selected node.
 *
 * @param root - Container to append controls to
 * @param node - Diagram node being edited
 * @param typeSuggestions - Suggested type names for the editable fields
 * @param dispatchCommand - Callback used to emit schema commands
 * @param addPropertyToContainer - Helper used for read-only property rows
 */
export function renderTypeProperty(
  root: HTMLElement,
  node: DiagramItem,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void,
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void
): void {
  if (!node.type) {
    return;
  }

  const nodeType = getNodeType(node);
  const baseType = extractBaseType(node.type);
  const hasInlineSimpleType = isInlineSimpleTypeElement(node, nodeType);
  const hasInlineComplexType = isInlineComplexTypeElement(node, nodeType);

  if (shouldRenderSimpleBaseTypeEditor(nodeType, hasInlineSimpleType, baseType)) {
    renderSimpleBaseTypeEditor(
      root,
      node,
      baseType as string,
      hasInlineSimpleType,
      typeSuggestions,
      dispatchCommand,
      addPropertyToContainer
    );
    return;
  }

  if (shouldRenderComplexBaseTypeEditor(nodeType, hasInlineComplexType, baseType)) {
    renderComplexBaseTypeEditor(
      root,
      node,
      baseType,
      hasInlineComplexType,
      typeSuggestions,
      dispatchCommand,
      addPropertyToContainer
    );
    return;
  }

  if (nodeType === SchemaNodeType.SimpleType || nodeType === SchemaNodeType.AnonymousSimpleType) {
    addPropertyToContainer(root, "Base Type", getReadOnlyTypeValue(node, baseType));
    const typeHint = getTypeEditHint(node, nodeType, baseType);
    if (typeHint) {
      addPropertyToContainer(root, "Type editing", typeHint);
    }
    return;
  }

  if (nodeType === SchemaNodeType.Element && hasInlineAnonymousElementType(node, nodeType)) {
    const replacementHint = getTypeEditHint(node, nodeType, baseType);
    renderInlineAnonymousTypeReplacement(
      root,
      node,
      baseType,
      typeSuggestions,
      dispatchCommand,
      addPropertyToContainer,
      replacementHint
    );
    return;
  }

  const typeCommand = createTypeCommand(node, node.type);
  if (typeCommand) {
    root.appendChild(
      createEditableField("Type", node.type, (next) => {
        const command = createTypeCommand(node, next);
        if (command) {
          node.type = normalizeTypeReferenceForCurrentSchema(node, next);
          dispatchCommand(command);
        }
      }, typeSuggestions)
    );
    return;
  }

  addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));

  const typeHint = getTypeEditHint(node, nodeType, baseType);
  if (typeHint) {
    addPropertyToContainer(root, "Type editing", typeHint);
  }
}

function shouldRenderSimpleBaseTypeEditor(
  nodeType: SchemaNodeType | null,
  hasInlineSimpleType: boolean,
  baseType: string | undefined
): boolean {
  return (
    (nodeType === SchemaNodeType.SimpleType ||
      nodeType === SchemaNodeType.AnonymousSimpleType ||
      hasInlineSimpleType) &&
    !!baseType
  );
}

function shouldRenderComplexBaseTypeEditor(
  nodeType: SchemaNodeType | null,
  hasInlineComplexType: boolean,
  baseType: string | undefined
): boolean {
  return (
    (nodeType === SchemaNodeType.ComplexType ||
      nodeType === SchemaNodeType.AnonymousComplexType ||
      hasInlineComplexType) &&
    (!!baseType || hasInlineComplexType)
  );
}

function renderSimpleBaseTypeEditor(
  root: HTMLElement,
  node: DiagramItem,
  baseType: string,
  hasInlineSimpleType: boolean,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void,
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void
): void {
  if (hasInlineSimpleType) {
    addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));
  }
  root.appendChild(
    createEditableField(
      "Base Type",
      baseType,
      (next) => {
        const command = createTypeCommand(node, next);
        if (!command) {
          return;
        }
        const trimmed = normalizeTypeReferenceForCurrentSchema(node, next);
        node.type = hasInlineSimpleType
          ? `<anonymous simpleType> (restricts ${trimmed})`
          : `simpleType (restricts ${trimmed})`;
        dispatchCommand(command);
      },
      typeSuggestions
    )
  );
  if (hasInlineSimpleType) {
    renderInlineSimpleTypeReplacement(root, node, baseType, typeSuggestions, dispatchCommand);
  }
}

function renderInlineSimpleTypeReplacement(
  root: HTMLElement,
  node: DiagramItem,
  baseType: string,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void
): void {
  root.appendChild(
    createEditableField(
      "Replacement Type",
      baseType,
      (next) => {
        const trimmed = normalizeTypeReferenceForCurrentSchema(node, next);
        if (!trimmed) {
          return;
        }
        node.type = trimmed;
        node.hasAnonymousComplexType = false;
        node.isSimpleContent = false;
        dispatchCommand({
          type: "modifyElement",
          payload: {
            elementId: node.id,
            elementType: trimmed,
          },
        });
      },
      typeSuggestions
    )
  );
}

function renderComplexBaseTypeEditor(
  root: HTMLElement,
  node: DiagramItem,
  baseType: string | undefined,
  hasInlineComplexType: boolean,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void,
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void
): void {
  addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));
  root.appendChild(
    createEditableField(
      "Base Type",
      baseType ?? "",
      (next) => {
        const command = createComplexBaseTypeCommand(node, next);
        if (!command) {
          return;
        }
        const trimmed = normalizeTypeReferenceForCurrentSchema(node, next);
        const prefix = hasInlineComplexType ? "<anonymous complexType>" : "complexType";
        const derivationKind = node.complexDerivationKind ?? "extension";
        const relation = getDerivationRelation(derivationKind);
        node.type = trimmed ? `${prefix} (${relation} ${trimmed})` : prefix;
        dispatchCommand(command);
      },
      typeSuggestions
    )
  );
  if (hasInlineComplexType) {
    renderComplexReplacementType(root, node, baseType, typeSuggestions, dispatchCommand);
  }
}

function renderComplexReplacementType(
  root: HTMLElement,
  node: DiagramItem,
  baseType: string | undefined,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void
): void {
  root.appendChild(
    createEditableField(
      "Replacement Type",
      baseType ?? "",
      (next) => {
        const trimmed = normalizeTypeReferenceForCurrentSchema(node, next);
        if (!trimmed) {
          return;
        }
        const command = createTypeCommand(node, trimmed);
        if (!command) {
          return;
        }
        node.type = trimmed;
        node.hasAnonymousComplexType = false;
        node.isSimpleContent = false;
        node.complexDerivationKind = undefined;
        dispatchCommand(command);
      },
      typeSuggestions
    )
  );
}

function renderInlineAnonymousTypeReplacement(
  root: HTMLElement,
  node: DiagramItem,
  baseType: string | undefined,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void,
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void,
  replacementHint: string | null
): void {
  addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));
  root.appendChild(
    createEditableField(
      "Replacement Type",
      baseType ?? "",
      (next) => {
        const command = createTypeCommand(node, next);
        if (!command) {
          return;
        }
        node.type = normalizeTypeReferenceForCurrentSchema(node, next);
        node.hasAnonymousComplexType = false;
        node.isSimpleContent = false;
        node.complexDerivationKind = undefined;
        dispatchCommand(command);
      },
      typeSuggestions
    )
  );
  if (replacementHint) {
    addPropertyToContainer(root, "Type editing", replacementHint);
  }
}
