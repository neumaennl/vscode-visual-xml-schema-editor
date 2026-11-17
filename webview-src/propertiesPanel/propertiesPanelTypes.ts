/**
 * Properties-panel helpers for rendering and editing type-related fields.
 * Keeps complex inline/replacement/base-type logic out of the main panel class.
 */

import type { SchemaCommand } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import type { DiagramItem } from "../diagram";
import { createEditableField } from "./propertiesPanelDom";
import { createComplexBaseTypeCommand, createTypeCommand, getNodeType, onTypeChange } from "./propertiesPanelCommands";
import { extractBaseType } from "./propertiesPanelSimpleTypeCommands";
import {
  getDerivationRelation,
  getReadOnlyTypeValue,
  getTypeEditHint,
  hasInlineAnonymousElementType,
  isInlineComplexTypeElement,
  isInlineSimpleTypeElement,
} from "./propertiesPanelTypeHelpers";
import {
  getSimpleTypeDerivationKind,
  isSimpleTypeNode,
  renderSimpleTypeKindSelector,
  renderSimpleTypeListEditor,
  renderSimpleTypeUnionEditor,
  renderInlineSimpleTypeReplacement,
} from "./propertiesPanelSimpleTypeEditors";

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

  if (isSimpleTypeNode(nodeType, hasInlineSimpleType) && simpleTypeDerivationKind === "list") {
    renderSimpleTypeListEditor({
      root,
      node,
      hasInlineSimpleType,
      typeSuggestions,
      dispatchCommand,
      addPropertyToContainer,
    });
    return;
  }

  if (isSimpleTypeNode(nodeType, hasInlineSimpleType) && simpleTypeDerivationKind === "union") {
    renderSimpleTypeUnionEditor({
      root,
      node,
      hasInlineSimpleType,
      typeSuggestions,
      dispatchCommand,
      addPropertyToContainer,
    });
    return;
  }

  if (baseType && shouldRenderSimpleBaseTypeEditor(nodeType, hasInlineSimpleType)) {
    renderSimpleBaseTypeEditor(
      root,
      node,
      baseType,
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
    root.appendChild(createTypeField(node, node.type, typeSuggestions, dispatchCommand));
    return;
  }

  addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));

  const typeHint = getTypeEditHint(node, nodeType, baseType);
  if (typeHint) {
    addPropertyToContainer(root, "Type editing", typeHint);
  }
}

/**
 * Creates the editable Type field of a node whose type can be changed by a command.
 *
 * @param node - Diagram node being edited; its `type` is updated when a change is sent
 * @param type - Current type of the node
 * @param typeSuggestions - Suggested type names for the field
 * @param dispatchCommand - Callback used to emit schema commands
 * @returns The field
 */
function createTypeField(
  node: DiagramItem,
  type: string,
  typeSuggestions: string[],
  dispatchCommand: (command: SchemaCommand) => void
): HTMLElement {
  const onChange = onTypeChange(
    node,
    type,
    (normalizedNext, next) => {
      const command = createTypeCommand(node, next);
      if (command) {
        node.type = normalizedNext;
        dispatchCommand(command);
      }
    },
    true
  );
  return createEditableField("Type", type, onChange, typeSuggestions);
}

/**
 * Tells whether the node gets an editable Base Type field for a simple type, if it restricts a single
 * named base type: a simple type, or an element with an inline simple type.
 *
 * @param nodeType - The schema node type of the node
 * @param hasInlineSimpleType - Whether the node is an element with an inline simple type
 * @returns True when the field is shown for a restriction of a named base type
 */
function shouldRenderSimpleBaseTypeEditor(nodeType: SchemaNodeType | null, hasInlineSimpleType: boolean): boolean {
  return (
    nodeType === SchemaNodeType.SimpleType || nodeType === SchemaNodeType.AnonymousSimpleType || hasInlineSimpleType
  );
}

/**
 * Tells whether the node gets an editable Base Type field for a complex type: a derived complex type,
 * or an element with an inline complex type, which may get a base type.
 *
 * @param nodeType - The schema node type of the node
 * @param hasInlineComplexType - Whether the node is an element with an inline complex type
 * @param baseType - The base type of the derivation, if it has one
 * @returns True when the field is shown
 */
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

/**
 * Renders the Base Type field of a restriction, which sends the new base type and shows it on the
 * draft node. An element with an inline simple type also gets its type as a read-only row and a
 * Replacement Type field.
 *
 * @param root - Container to append the fields to
 * @param node - The simple type, or the element with the inline simple type
 * @param baseType - The base type of the restriction
 * @param hasInlineSimpleType - Whether the node is an element with an inline simple type
 * @param typeSuggestions - Suggested type names for the fields
 * @param dispatchCommand - Callback used to emit schema commands
 * @param addPropertyToContainer - Helper used for read-only property rows
 */
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
      onTypeChange(
        node,
        baseType,
        (normalizedNext, next) => {
          const command = createTypeCommand(node, next);
          if (!command) {
            return;
          }
          node.type = hasInlineSimpleType
            ? `<anonymous simpleType> (restricts ${normalizedNext})`
            : `simpleType (restricts ${normalizedNext})`;
          dispatchCommand(command);
        },
        true
      ),
      typeSuggestions
    )
  );
  if (hasInlineSimpleType) {
    renderInlineSimpleTypeReplacement(root, node, baseType, typeSuggestions, dispatchCommand);
  }
}

/**
 * Renders the type of a complex type as a read-only row and its Base Type field, which sends the new
 * base type with the current derivation kind; an empty base type removes the derivation. An element
 * with an inline complex type also gets a Replacement Type field.
 *
 * @param root - Container to append the fields to
 * @param node - The complex type, or the element with the inline complex type
 * @param baseType - The base type of the derivation, if it has one
 * @param hasInlineComplexType - Whether the node is an element with an inline complex type
 * @param typeSuggestions - Suggested type names for the fields
 * @param dispatchCommand - Callback used to emit schema commands
 * @param addPropertyToContainer - Helper used for read-only property rows
 */
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
      onTypeChange(
        node,
        baseType ?? "",
        (normalizedNext, next) => {
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
        true
      ),
      typeSuggestions
    )
  );
  if (hasInlineComplexType) {
    renderComplexReplacementType(root, node, baseType, typeSuggestions, dispatchCommand);
  }
}

/**
 * Renders the Replacement Type field of an element with an inline complex type, which replaces the
 * inline type with a reference to the entered type.
 *
 * @param root - Container to append the field to
 * @param node - The element
 * @param baseType - The base type of the inline type, if it has one, which the field starts with
 * @param typeSuggestions - Suggested type names for the field
 * @param dispatchCommand - Callback used to emit schema commands
 */
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
      onTypeChange(node, baseType ?? "", (normalizedNext) => {
        const command = createTypeCommand(node, normalizedNext);
        if (!command) {
          return;
        }
        node.type = normalizedNext;
        node.hasAnonymousComplexType = false;
        node.isSimpleContent = false;
        node.complexDerivationKind = undefined;
        dispatchCommand(command);
      }),
      typeSuggestions
    )
  );
}

/**
 * Renders the type of an element with an inline type that has no single base type as a read-only
 * row, a Replacement Type field and the hint that a replacement removes the inline type.
 *
 * @param root - Container to append the fields to
 * @param node - The element
 * @param baseType - The base type of the inline type, if it has one, which the field starts with
 * @param typeSuggestions - Suggested type names for the field
 * @param dispatchCommand - Callback used to emit schema commands
 * @param addPropertyToContainer - Helper used for read-only property rows
 * @param replacementHint - The hint shown below the field, if any
 */
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
      onTypeChange(
        node,
        baseType ?? "",
        (normalizedNext, next) => {
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
        true
      ),
      typeSuggestions
    )
  );
  if (replacementHint) {
    addPropertyToContainer(root, "Type editing", replacementHint);
  }
}
