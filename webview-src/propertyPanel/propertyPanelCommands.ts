/**
 * Command-building helpers for PropertyPanel interactions.
 * This module translates edited diagram-node values into shared schema commands
 * while hiding ID-resolution details from the panel UI code.
 */

import { SchemaCommand } from "../../shared/types";
import { SCHEMA_ROOT_ID, generateSchemaId, parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { BUILT_IN_XSD_TYPE_LOCAL_NAME_SET } from "./propertyPanelTypeCatalog";

/**
 * Collects and caches top-level/local simpleType and complexType names from the active diagram.
 *
 * @param node - Any diagram node that belongs to the currently rendered diagram
 * @returns A set of discovered local schema type names
 */
export function collectLocalSchemaTypeNames(node: DiagramItem): ReadonlySet<string> {
  const cached = node.diagram?.localSchemaTypeNames;
  if (cached) {
    return cached;
  }

  const names = new Set<string>();
  const visit = (item: DiagramItem): void => {
    const itemNodeType = getNodeType(item);
    if (
      (itemNodeType === SchemaNodeType.SimpleType || itemNodeType === SchemaNodeType.ComplexType) &&
      item.name
    ) {
      const localName = item.name.trim();
      if (localName) {
        names.add(localName);
      }
    }
    for (const child of item.childElements) {
      visit(child);
    }
  };
  for (const root of node.diagram?.rootElements ?? []) {
    visit(root);
  }
  if (node.diagram) {
    node.diagram.localSchemaTypeNames = names;
  }
  return names;
}

/**
 * Normalizes a type reference entered in the property panel.
 * For local schema types, this prefixes with the schema targetNamespace prefix when available.
 */
export function normalizeTypeReferenceForCurrentSchema(
  node: DiagramItem,
  nextType: string
): string {
  const typeName = nextType.trim();
  if (!typeName) {
    return typeName;
  }
  if (typeName.includes(":")) {
    return typeName;
  }

  const currentSchemaPrefix = node.diagram?.currentSchemaPrefix?.trim();
  if (!currentSchemaPrefix || BUILT_IN_XSD_TYPE_LOCAL_NAME_SET.has(typeName)) {
    return typeName;
  }

  const localSchemaTypeNames = collectLocalSchemaTypeNames(node);
  return localSchemaTypeNames.has(typeName)
    ? `${currentSchemaPrefix}:${typeName}`
    : typeName;
}

/**
 * Determines the schema node type represented by a diagram item.
 *
 * @param node - Diagram item to inspect
 * @returns The resolved schema node type or null when it cannot be inferred
 */
export function getNodeType(node: DiagramItem): SchemaNodeType | null {
  if (node.id === SCHEMA_ROOT_ID) {
    return SchemaNodeType.Schema;
  }
  try {
    return parseSchemaId(node.id).nodeType;
  } catch {
    switch (node.itemType) {
      case DiagramItemType.element:
        return SchemaNodeType.Element;
      case DiagramItemType.type:
        return SchemaNodeType.SimpleType;
      case DiagramItemType.group:
        return SchemaNodeType.Group;
      default:
        return null;
    }
  }
}

/**
 * Returns whether the given diagram item represents a top-level element declaration.
 *
 * @param node - Diagram item to inspect
 * @returns True when the node is a top-level element
 */
export function isTopLevelElement(node: DiagramItem): boolean {
  try {
    const parsed = parseSchemaId(node.id);
    return parsed.nodeType === SchemaNodeType.Element && !parsed.parentId;
  } catch {
    return false;
  }
}

/**
 * Returns whether occurrence fields should be editable for the given node.
 *
 * @param node - Diagram item to inspect
 * @returns True when minOccurs/maxOccurs may be edited
 */
export function canEditCardinality(node: DiagramItem): boolean {
  if (isTopLevelElement(node)) {
    return false;
  }
  const nodeType = getNodeType(node);
  if (nodeType === SchemaNodeType.Element || node.itemType === DiagramItemType.element) {
    return true;
  }
  if (nodeType === SchemaNodeType.GroupRef) {
    return true;
  }
  if (nodeType === SchemaNodeType.Group) {
    try {
      const parsed = parseSchemaId(node.id);
      return (
        parsed.parentId !== undefined &&
        (parsed.name === "sequence" || parsed.name === "choice" || parsed.name === "all")
      );
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Builds a rename command for the selected node.
 *
 * @param node - Diagram item being renamed
 * @param nextName - Proposed new name from the UI
 * @returns A schema command or null when the node/name is not editable
 */
export function createNameCommand(node: DiagramItem, nextName: string): SchemaCommand | null {
  const name = nextName.trim();
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
 * Resolves the schema ID of the simple type represented by the given node.
 *
 * @param node - Diagram item to inspect
 * @returns The simple-type schema ID or null when no simple type applies
 */
export function resolveSimpleTypeId(node: DiagramItem): string | null {
  const nodeType = getNodeType(node);
  if (nodeType === SchemaNodeType.SimpleType || nodeType === SchemaNodeType.AnonymousSimpleType) {
    return node.id;
  }
  if (nodeType === SchemaNodeType.Element && node.isSimpleContent) {
    return generateSchemaId({
      nodeType: SchemaNodeType.AnonymousSimpleType,
      parentId: node.id,
      position: 0,
    });
  }
  return null;
}

/**
 * Resolves the schema ID of the complex type represented by the given node.
 *
 * @param node - Diagram item to inspect
 * @returns The complex-type schema ID or null when no complex type applies
 */
export function resolveComplexTypeId(node: DiagramItem): string | null {
  const nodeType = getNodeType(node);
  if (nodeType === SchemaNodeType.ComplexType || nodeType === SchemaNodeType.AnonymousComplexType) {
    return node.id;
  }
  if (nodeType === SchemaNodeType.Element && node.hasAnonymousComplexType) {
    return generateSchemaId({
      nodeType: SchemaNodeType.AnonymousComplexType,
      parentId: node.id,
      position: 0,
    });
  }
  return null;
}

/**
 * Resolves the default annotation/documentation target for Docs-tab operations.
 * For element nodes that inline anonymous types, this returns the anonymous type ID
 * so documentation edits target the actual annotated schema node instead of the
 * parent element wrapper.
 *
 * @param node - Diagram item being edited in the Docs tab
 * @returns The schema ID that documentation commands should target, or null when unsupported
 */
export function resolveDocumentationTargetId(node: DiagramItem): string | null {
  const nodeType = getNodeType(node);
  switch (nodeType) {
    case SchemaNodeType.Schema:
      return SCHEMA_ROOT_ID;
    case SchemaNodeType.SimpleType:
    case SchemaNodeType.AnonymousSimpleType:
      return resolveSimpleTypeId(node) ?? node.id;
    case SchemaNodeType.Element:
      if (node.hasAnonymousComplexType) {
        return generateSchemaId({
          nodeType: SchemaNodeType.AnonymousComplexType,
          parentId: node.id,
          position: 0,
        });
      }
      return resolveSimpleTypeId(node) ?? node.id;
    case SchemaNodeType.ComplexType:
    case SchemaNodeType.AnonymousComplexType:
    case SchemaNodeType.Group:
    case SchemaNodeType.GroupRef:
      return node.id;
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
  const typeName = normalizeTypeReferenceForCurrentSchema(node, nextType);
  if (!typeName) {
    return null;
  }
  const nodeType = getNodeType(node);
  switch (nodeType) {
    case SchemaNodeType.Element:
      if (node.isSimpleContent) {
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
    case SchemaNodeType.AnonymousSimpleType:
      return {
        type: "modifySimpleType",
        payload: {
          typeId: resolveSimpleTypeId(node) ?? node.id,
          baseType: typeName,
        },
      };
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
export function createComplexBaseTypeCommand(
  node: DiagramItem,
  nextBaseType: string
): SchemaCommand | null {
  const baseType = normalizeTypeReferenceForCurrentSchema(node, nextBaseType);
  const nodeType = getNodeType(node);
  const complexTypeId = resolveComplexTypeId(node);
  if (
    !complexTypeId ||
    (nodeType !== SchemaNodeType.ComplexType &&
      nodeType !== SchemaNodeType.AnonymousComplexType &&
      !(nodeType === SchemaNodeType.Element && node.hasAnonymousComplexType))
  ) {
    return null;
  }
  return {
    type: "modifyComplexType",
    payload: {
      typeId: complexTypeId,
      baseType,
      derivationKind: node.complexDerivationKind ?? "extension",
    },
  };
}

/**
 * Extracts the simple base type from the user-facing type label shown in the panel.
 *
 * @param typeText - Display text from the Type field
 * @returns The extracted base type or undefined when none can be inferred
 */
export function extractBaseType(typeText: string): string | undefined {
  if (!typeText) {
    return undefined;
  }
  const restricted = typeText.match(/\(restricts ([^)]+)\)/);
  if (restricted?.[1]) {
    return restricted[1].trim();
  }
  const extended = typeText.match(/\(extends ([^)]+)\)/);
  if (extended?.[1]) {
    return extended[1].trim();
  }
  if (typeText.startsWith("xs:")) {
    return typeText.trim();
  }
  return undefined;
}
