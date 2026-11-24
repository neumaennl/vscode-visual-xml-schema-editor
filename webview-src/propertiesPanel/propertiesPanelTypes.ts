/**
 * Properties-panel helpers for rendering and editing type-related fields.
 * Keeps complex inline/replacement/base-type logic out of the main panel class.
 */

import type { SchemaCommand } from "../../shared/types";
import { SchemaNodeType } from "../../shared/idStrategy";
import {
  getBaseType,
  getSimpleDerivation,
  getTypeText,
  hasInlineComplexType,
  hasSimpleContent,
  type DiagramItem,
} from "../diagram";
import { createEditableField } from "./propertiesPanelFields";
import { createComplexBaseTypeCommand, createTypeCommand } from "./propertiesPanelCommands";
import { getNodeType } from "./propertiesPanelNodeKinds";
import { createTypeCommitHandler } from "./propertiesPanelTypeReferences";
import {
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

/** What the functions that render the type fields of a node need. */
interface TypeSection {
  /** Container to append the fields to */
  root: HTMLElement;
  /** Diagram node being edited */
  node: DiagramItem;
  /** The base type of the node's derivation, if it has one */
  baseType: string | undefined;
  /** Suggested type names for the editable fields */
  typeSuggestions: string[];
  /** Callback used to emit schema commands */
  dispatchCommand: (command: SchemaCommand) => void;
  /** Helper used for read-only property rows */
  addPropertyToContainer: (container: HTMLElement, name: string, value: string) => void;
}

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
  const typeText = getTypeText(node);
  if (!typeText) {
    return;
  }

  const nodeType = getNodeType(node);
  const baseType = getBaseType(node);
  const section: TypeSection = { root, node, baseType, typeSuggestions, dispatchCommand, addPropertyToContainer };
  const hasInlineSimpleType = isInlineSimpleTypeElement(node, nodeType);
  const hasInlineComplexType = isInlineComplexTypeElement(node, nodeType);
  const simpleTypeDerivationKind = getSimpleTypeDerivationKind(node);

  if (isSimpleTypeNode(nodeType, hasInlineSimpleType)) {
    renderSimpleTypeKindSelector(root, node, hasInlineSimpleType, dispatchCommand);
    if (simpleTypeDerivationKind === "list") {
      renderSimpleTypeListEditor({ ...section, hasInlineSimpleType });
      return;
    }
    if (simpleTypeDerivationKind === "union") {
      renderSimpleTypeUnionEditor({ ...section, hasInlineSimpleType });
      return;
    }
    if (baseType) {
      renderSimpleBaseTypeEditor(section, baseType, hasInlineSimpleType);
      return;
    }
  }

  if (hasSimpleContent(node)) {
    renderSimpleContentType(section);
    return;
  }

  if (shouldRenderComplexBaseTypeEditor(nodeType, hasInlineComplexType, baseType)) {
    renderComplexBaseTypeEditor(section, hasInlineComplexType);
    return;
  }

  if (nodeType === SchemaNodeType.SimpleType || nodeType === SchemaNodeType.AnonymousSimpleType) {
    // A restriction without a base attribute restricts an inline simple type
    const inlineBase = getSimpleDerivation(node)?.kind === "restriction" ? "Inline simpleType" : undefined;
    addPropertyToContainer(root, "Base Type", inlineBase ?? getReadOnlyTypeValue(node, baseType));
    addTypeEditHint(section, nodeType);
    return;
  }

  if (nodeType === SchemaNodeType.Element && hasInlineAnonymousElementType(node, nodeType)) {
    addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));
    renderReplacementType(section, true);
    addTypeEditHint(section, nodeType);
    return;
  }

  if (createTypeCommand(node, typeText)) {
    root.appendChild(createTypeCommandField(section, "Type", typeText, createTypeCommand, true));
    return;
  }

  addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));
  addTypeEditHint(section, nodeType);
}

/**
 * Adds the hint below the type fields, if the node has one (see {@link getTypeEditHint}).
 *
 * @param section - The type section
 * @param nodeType - The schema node type of the node
 */
function addTypeEditHint(section: TypeSection, nodeType: SchemaNodeType | null): void {
  const typeHint = getTypeEditHint(section.node, nodeType, section.baseType);
  if (typeHint) {
    section.addPropertyToContainer(section.root, "Type editing", typeHint);
  }
}

/**
 * Creates an editable type field that sends the command that is built from the entered type.
 *
 * @param section - The type section
 * @param label - The label of the field
 * @param current - The current value of the field
 * @param createCommand - Builds the command for the entered type, or returns null when there is none
 * @param allowEmpty - Whether an empty type is sent too, which removes the type
 * @returns The field
 */
function createTypeCommandField(
  section: TypeSection,
  label: string,
  current: string,
  createCommand: (node: DiagramItem, entered: string) => SchemaCommand | null,
  allowEmpty: boolean
): HTMLElement {
  const { node, typeSuggestions, dispatchCommand } = section;
  const onCommit = createTypeCommitHandler(
    node,
    current,
    (_normalizedNext, entered) => {
      const command = createCommand(node, entered);
      if (command) {
        dispatchCommand(command);
      }
    },
    allowEmpty
  );
  return createEditableField(label, current, onCommit, typeSuggestions);
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
 * Renders the Base Type field of a restriction, which sends the new base type. An element with an inline
 * simple type also gets its type as a read-only row and a Replacement Type field.
 *
 * @param section - The type section of the simple type, or of the element with the inline simple type
 * @param baseType - The base type of the restriction
 * @param hasInlineSimpleType - Whether the node is an element with an inline simple type
 */
function renderSimpleBaseTypeEditor(section: TypeSection, baseType: string, hasInlineSimpleType: boolean): void {
  const { root, node, typeSuggestions, dispatchCommand, addPropertyToContainer } = section;
  if (hasInlineSimpleType) {
    addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));
  }
  root.appendChild(createTypeCommandField(section, "Base Type", baseType, createTypeCommand, true));
  if (hasInlineSimpleType) {
    renderInlineSimpleTypeReplacement(root, node, baseType, typeSuggestions, dispatchCommand);
  }
}

/**
 * Renders the type of a complex type as a read-only row and its Base Type field, which sends the new
 * base type with the current derivation kind; an empty base type removes the derivation. An element
 * with an inline complex type also gets a Replacement Type field.
 *
 * @param section - The type section of the complex type, or of the element with the inline complex type
 * @param hasInlineComplexType - Whether the node is an element with an inline complex type
 */
function renderComplexBaseTypeEditor(section: TypeSection, hasInlineComplexType: boolean): void {
  const { root, node, baseType, addPropertyToContainer } = section;
  addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));
  root.appendChild(createTypeCommandField(section, "Base Type", baseType ?? "", createComplexBaseTypeCommand, true));
  if (hasInlineComplexType) {
    renderReplacementType(section, false);
  }
}

/**
 * Renders the type of a complex type with simple content read-only: no command can change the base type
 * of simple content yet. An element with such an inline complex type also gets a Replacement Type field.
 *
 * @param section - The type section of the complex type, or of the element with the inline complex type
 */
function renderSimpleContentType(section: TypeSection): void {
  const { root, node, baseType, addPropertyToContainer } = section;
  addPropertyToContainer(root, "Type", getReadOnlyTypeValue(node, baseType));
  if (baseType) {
    addPropertyToContainer(root, "Base Type", baseType);
  }
  if (hasInlineComplexType(node)) {
    renderReplacementType(section, false);
  }
}

/**
 * Renders the Replacement Type field of an element with an inline type, which replaces the inline type
 * with a reference to the entered type. The field starts with the base type of the inline type.
 *
 * @param section - The type section of the element
 * @param allowEmpty - Whether an empty type is sent too, which removes the type
 */
function renderReplacementType(section: TypeSection, allowEmpty: boolean): void {
  section.root.appendChild(
    createTypeCommandField(section, "Replacement Type", section.baseType ?? "", createTypeCommand, allowEmpty)
  );
}
