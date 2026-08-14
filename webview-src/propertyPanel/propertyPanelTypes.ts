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
  getNodeType,
  normalizeTypeReferenceForCurrentSchema,
} from "./propertyPanelCommands";
import { extractBaseType } from "./propertyPanelSimpleTypeCommands";
import {
  getDerivationRelation,
  getReadOnlyTypeValue,
  getTypeEditHint,
  hasInlineAnonymousElementType,
  isInlineComplexTypeElement,
  isInlineSimpleTypeElement,
} from "./propertyPanelTypeHelpers";
import {
  getSimpleTypeDerivationKind,
  isSimpleTypeNode,
  renderSimpleTypeKindSelector,
  renderSimpleTypeListEditor,
  renderSimpleTypeUnionEditor,
} from "./propertyPanelSimpleTypeEditors";

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
  const simpleTypeDerivationKind = getSimpleTypeDerivationKind(node);

  if (isSimpleTypeNode(nodeType, hasInlineSimpleType)) {
    renderSimpleTypeKindSelector(root, node, hasInlineSimpleType, dispatchCommand);
  }

  if (
    isSimpleTypeNode(nodeType, hasInlineSimpleType) &&
    simpleTypeDerivationKind === "list"
  ) {
    renderSimpleTypeListEditor(
      root,
      node,
      hasInlineSimpleType,
      typeSuggestions,
      dispatchCommand,
      addPropertyToContainer
    );
    return;
  }

  if (
    isSimpleTypeNode(nodeType, hasInlineSimpleType) &&
    simpleTypeDerivationKind === "union"
  ) {
    renderSimpleTypeUnionEditor(
      root,
      node,
      hasInlineSimpleType,
      typeSuggestions,
      dispatchCommand,
      addPropertyToContainer
    );
    return;
  }

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
        const normalizedNext = normalizeTypeReferenceForCurrentSchema(node, next);
        const normalizedCurrent = normalizeTypeReferenceForCurrentSchema(node, node.type ?? "");
        if (normalizedNext === normalizedCurrent) {
          return;
        }
        const command = createTypeCommand(node, next);
        if (command) {
          node.type = normalizedNext;
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
        const normalizedNext = normalizeTypeReferenceForCurrentSchema(node, next);
        const normalizedCurrent = normalizeTypeReferenceForCurrentSchema(node, baseType);
        if (normalizedNext === normalizedCurrent) {
          return;
        }
        const command = createTypeCommand(node, next);
        if (!command) {
          return;
        }
        node.type = hasInlineSimpleType
          ? `<anonymous simpleType> (restricts ${normalizedNext})`
          : `simpleType (restricts ${normalizedNext})`;
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
        const normalizedNext = normalizeTypeReferenceForCurrentSchema(node, next);
        const normalizedCurrent = normalizeTypeReferenceForCurrentSchema(node, baseType);
        if (!normalizedNext || normalizedNext === normalizedCurrent) {
          return;
        }
        const command: SchemaCommand = {
          type: "modifyElement",
          payload: {
            elementId: node.id,
            elementType: normalizedNext,
          },
        };
        node.type = normalizedNext;
        node.hasAnonymousComplexType = false;
        node.isSimpleContent = false;
        dispatchCommand(command);
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
        const normalizedNext = normalizeTypeReferenceForCurrentSchema(node, next);
        const normalizedCurrent = normalizeTypeReferenceForCurrentSchema(node, baseType ?? "");
        if (normalizedNext === normalizedCurrent) {
          return;
        }
        const command = createComplexBaseTypeCommand(node, next);
        if (!command) {
          return;
        }
        const prefix = hasInlineComplexType ? "<anonymous complexType>" : "complexType";
        const derivationKind = node.complexDerivationKind ?? "extension";
        const relation = getDerivationRelation(derivationKind);
        node.type = normalizedNext ? `${prefix} (${relation} ${normalizedNext})` : prefix;
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
        const normalizedNext = normalizeTypeReferenceForCurrentSchema(node, next);
        const normalizedCurrent = normalizeTypeReferenceForCurrentSchema(node, baseType ?? "");
        if (!normalizedNext || normalizedNext === normalizedCurrent) {
          return;
        }
        const command = createTypeCommand(node, normalizedNext);
        if (!command) {
          return;
        }
        node.type = normalizedNext;
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
        const normalizedNext = normalizeTypeReferenceForCurrentSchema(node, next);
        const normalizedCurrent = normalizeTypeReferenceForCurrentSchema(node, baseType ?? "");
        if (normalizedNext === normalizedCurrent) {
          return;
        }
        const command = createTypeCommand(node, next);
        if (!command) {
          return;
        }
        node.type = normalizedNext;
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
