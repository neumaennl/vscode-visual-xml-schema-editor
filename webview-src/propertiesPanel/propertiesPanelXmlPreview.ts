/**
 * XML-preview helpers for the `PropertiesPanel` XML tab.
 * Converts a selected diagram node into an XSD fragment string.
 */

import { XSD_NAMESPACE } from "../../shared/builtInTypes";
import { LIST_FACETS, SINGLE_VALUE_FACETS } from "../../shared/facets";
import { SCHEMA_ROOT_ID, parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import {
  getAttributes,
  getDefaultValue,
  getDocumentationAnnotations,
  getFacets,
  getFixedValue,
  getMaxOccurs,
  getMinOccurs,
  getName,
  getNamespacePrefixes,
  getTargetNamespace,
  getReference,
  getComplexDerivation,
  getSimpleDerivation,
  getTypeName,
  hasInlineComplexType,
  hasInlineSimpleType,
  isAbstract,
  isMixed,
  isNillable,
  isReference,
  type DiagramItem,
} from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { getNodeType, isTopLevelElement } from "./propertiesPanelNodeKinds";
import type { XmlAttr } from "./propertiesPanelXmlMarkup";
import { escapeXml, optionalAttributes, pad, renderTag, toAttrString } from "./propertiesPanelXmlMarkup";

const TRUNCATION_MARKER = "<!-- ... truncated ... -->";
/** How many levels of children the preview shows below the selected node. */
const MAX_PREVIEW_DESCENDANT_DEPTH = 1;
/** How many children of a node the preview shows. */
const MAX_PREVIEW_CHILDREN_PER_NODE = 50;

/**
 * Writes the comment that marks children the preview leaves out.
 *
 * @param level - The indentation level
 * @returns The line
 */
function renderTruncationMarker(level: number): string {
  return `${pad(level)}${TRUNCATION_MARKER}`;
}

/**
 * Writes the children of a node, at most {@link MAX_PREVIEW_CHILDREN_PER_NODE} and only
 * {@link MAX_PREVIEW_DESCENDANT_DEPTH} levels below the selected node; the rest is marked as truncated.
 *
 * @param children - The children
 * @param level - The indentation level
 * @param depth - How many levels below the selected node the node is
 * @returns The lines of the children
 */
function renderChildNodes(children: DiagramItem[], level: number, depth: number): string[] {
  if (children.length === 0) {
    return [];
  }

  if (depth >= MAX_PREVIEW_DESCENDANT_DEPTH) {
    return [renderTruncationMarker(level)];
  }

  const rendered = children.slice(0, MAX_PREVIEW_CHILDREN_PER_NODE).map((child) => renderNode(child, level, depth + 1));
  if (children.length > MAX_PREVIEW_CHILDREN_PER_NODE) {
    rendered.push(renderTruncationMarker(level));
  }
  return rendered;
}

/**
 * Adds `minOccurs` and `maxOccurs` to attributes, by default only when they differ from 1.
 *
 * @param attributes - The attributes, which are changed
 * @param node - The node with the occurrence
 * @param includeDefaults - Whether to add them when they are 1, too
 */
function appendOccurrenceAttributes(attributes: XmlAttr[], node: DiagramItem, includeDefaults: boolean): void {
  const minOccurs = getMinOccurs(node);
  const maxOccurs = getMaxOccurs(node);
  if (includeDefaults || minOccurs !== 1) {
    attributes.push(["minOccurs", String(minOccurs)]);
  }
  if (includeDefaults || maxOccurs !== 1) {
    attributes.push(["maxOccurs", String(maxOccurs)]);
  }
}

/**
 * Writes an `xs:documentation` element on one line.
 *
 * @param content - The text of the documentation
 * @param lang - The language (`xml:lang`), if it has one
 * @param level - The indentation level
 * @returns The line
 */
function renderDocumentationNode(content: string, lang: string | undefined, level: number): string {
  const attrs: XmlAttr[] = [];
  if (lang) {
    attrs.push(["xml:lang", lang]);
  }
  if (!content) {
    return renderTag("xs:documentation", attrs, [], level);
  }
  const prefix = pad(level);
  return `${prefix}<xs:documentation${toAttrString(attrs)}>${escapeXml(content)}</xs:documentation>`;
}

/**
 * Writes the `xs:annotation` elements of a node with their documentation.
 *
 * @param node - The node
 * @param level - The indentation level
 * @returns The lines of the annotations
 */
function renderAnnotations(node: DiagramItem, level: number): string[] {
  return getDocumentationAnnotations(node).map((annotation) => {
    const documentationChildren = annotation.documentationEntries.map((entry) =>
      renderDocumentationNode(entry.content, entry.lang, level + 1)
    );
    return renderTag("xs:annotation", [], documentationChildren, level);
  });
}

/**
 * Writes the `xs:attribute` elements of a node.
 *
 * @param node - The node
 * @param level - The indentation level
 * @returns The lines of the attributes
 */
function renderAttributeNodes(node: DiagramItem, level: number): string[] {
  return getAttributes(node).map((attribute) => {
    const attrs: XmlAttr[] = [
      ["name", attribute.name],
      ...optionalAttributes([
        ["type", attribute.type],
        ["use", attribute.use],
        ["default", attribute.defaultValue],
        ["fixed", attribute.fixedValue],
      ]),
    ];
    return renderTag("xs:attribute", attrs, [], level);
  });
}

/**
 * Writes the facets of a restriction: the enumeration values and patterns, then the other facets.
 *
 * @param node - The node with the restriction
 * @param level - The indentation level
 * @returns The lines of the facets
 */
function renderRestrictionFacets(node: DiagramItem, level: number): string[] {
  const restrictions = getFacets(node);
  if (!restrictions) {
    return [];
  }

  const facets: string[] = [];

  for (const facetName of LIST_FACETS) {
    for (const value of restrictions[facetName] ?? []) {
      facets.push(renderTag(`xs:${facetName}`, [["value", value]], [], level));
    }
  }

  for (const facetName of SINGLE_VALUE_FACETS) {
    const value = restrictions[facetName];
    if (value !== undefined) {
      facets.push(renderTag(`xs:${facetName}`, [["value", String(value)]], [], level));
    }
  }

  return facets;
}

/**
 * Writes the body of a simple type: an `xs:list`, an `xs:union`, or an `xs:restriction` with its
 * base type and facets.
 *
 * @param node - The simple type, or the element with the inline simple type
 * @param level - The indentation level
 * @returns The lines of the body, empty when the type has neither a base type nor facets
 */
function renderSimpleTypeChildren(node: DiagramItem, level: number): string[] {
  const derivation = getSimpleDerivation(node);

  if (derivation?.kind === "list") {
    return [renderTag("xs:list", optionalAttributes([["itemType", derivation.itemType]]), [], level)];
  }

  if (derivation?.kind === "union") {
    const memberTypes = derivation.memberTypes.length > 0 ? derivation.memberTypes.join(" ") : undefined;
    return [renderTag("xs:union", optionalAttributes([["memberTypes", memberTypes]]), [], level)];
  }

  const baseType = derivation?.base;
  const facets = renderRestrictionFacets(node, level + 1);
  if (!baseType && facets.length === 0) {
    return [];
  }

  const restrictionAttributes: XmlAttr[] = [];
  if (baseType) {
    restrictionAttributes.push(["base", baseType]);
  }

  return [renderTag("xs:restriction", restrictionAttributes, facets, level)];
}

/**
 * Writes the content of a complex type: a derivation in `xs:simpleContent` or `xs:complexContent`
 * with its children and attributes, or the children and attributes themselves.
 *
 * @param node - The complex type, or the element with the inline complex type
 * @param level - The indentation level
 * @param depth - How many levels below the selected node the node is
 * @returns The lines of the content
 */
function renderComplexTypeBody(node: DiagramItem, level: number, depth: number): string[] {
  const derivation = getComplexDerivation(node);
  const baseType = derivation?.base;
  if (derivation && baseType) {
    const derivationTag = derivation.kind === "restriction" ? "xs:restriction" : "xs:extension";
    const derivationChildren = [
      ...renderChildNodes(node.childElements, level + 2, depth),
      ...renderAttributeNodes(node, level + 2),
    ];
    const contentTag = derivation.content === "simple" ? "xs:simpleContent" : "xs:complexContent";

    return [
      renderTag(contentTag, [], [renderTag(derivationTag, [["base", baseType]], derivationChildren, level + 1)], level),
    ];
  }

  return [...renderChildNodes(node.childElements, level, depth), ...renderAttributeNodes(node, level)];
}

/**
 * Writes an `xs:element` with its attributes, annotations and inline type or children.
 *
 * @param node - The element
 * @param nodeType - The schema node type of the element
 * @param level - The indentation level
 * @param depth - How many levels below the selected node the node is
 * @returns The lines of the element
 */
function renderElementNode(node: DiagramItem, nodeType: SchemaNodeType | null, level: number, depth: number): string {
  const attributes = optionalAttributes([
    ["name", getName(node)],
    ["ref", getReference(node)],
    ["type", getTypeName(node)],
  ]);

  attributes.push(
    ...optionalAttributes([
      ["nillable", isNillable(node) ? "true" : undefined],
      ["abstract", isAbstract(node) ? "true" : undefined],
      ["default", getDefaultValue(node)],
      ["fixed", getFixedValue(node)],
    ])
  );

  const includeOccurs = !(nodeType === SchemaNodeType.Element && isTopLevelElement(node));
  if (includeOccurs) {
    appendOccurrenceAttributes(attributes, node, false);
  }

  const children: string[] = [...renderAnnotations(node, level + 1)];

  if (hasInlineComplexType(node)) {
    const complexTypeAttributes: XmlAttr[] = [];
    if (isMixed(node)) {
      complexTypeAttributes.push(["mixed", "true"]);
    }
    const complexTypeChildren = renderComplexTypeBody(node, level + 2, depth);
    children.push(renderTag("xs:complexType", complexTypeAttributes, complexTypeChildren, level + 1));
  } else if (hasInlineSimpleType(node)) {
    const simpleTypeChildren = renderSimpleTypeChildren(node, level + 2);
    children.push(renderTag("xs:simpleType", [], simpleTypeChildren, level + 1));
  } else {
    children.push(...renderChildNodes(node.childElements, level + 1, depth));
  }

  return renderTag("xs:element", attributes, children, level);
}

/**
 * Writes a group reference, a named group, or a compositor (`xs:sequence`, `xs:choice` or `xs:all`).
 *
 * @param node - The group, group reference or compositor
 * @param nodeType - The schema node type of the node
 * @param level - The indentation level
 * @param depth - How many levels below the selected node the node is
 * @returns The lines of the node
 */
function renderGroupNode(node: DiagramItem, nodeType: SchemaNodeType | null, level: number, depth: number): string {
  if (nodeType === SchemaNodeType.GroupRef || isReference(node)) {
    const attrs = optionalAttributes([["ref", getReference(node)]]);
    appendOccurrenceAttributes(attrs, node, false);
    const children = renderAnnotations(node, level + 1);
    return renderTag("xs:group", attrs, children, level);
  }

  let parsedParentId: string | undefined;
  let parsedName: string | undefined;
  try {
    const parsed = parseSchemaId(node.id);
    parsedParentId = parsed.parentId;
    parsedName = parsed.name;
  } catch {
    parsedParentId = undefined;
  }

  if (!parsedParentId) {
    const attrs = optionalAttributes([["name", getName(node)]]);
    const children = [...renderAnnotations(node, level + 1), ...renderChildNodes(node.childElements, level + 1, depth)];
    return renderTag("xs:group", attrs, children, level);
  }

  const compositor = parsedName === "choice" || parsedName === "all" ? parsedName : "sequence";
  const attrs: XmlAttr[] = [];
  appendOccurrenceAttributes(attrs, node, false);
  const children = [...renderAnnotations(node, level + 1), ...renderChildNodes(node.childElements, level + 1, depth)];
  return renderTag(`xs:${compositor}`, attrs, children, level);
}

/**
 * Writes a named `xs:simpleType` with its annotations and body.
 *
 * @param node - The simple type
 * @param level - The indentation level
 * @returns The lines of the type
 */
function renderSimpleTypeNode(node: DiagramItem, level: number): string {
  const children = [...renderAnnotations(node, level + 1), ...renderSimpleTypeChildren(node, level + 1)];
  return renderTag("xs:simpleType", optionalAttributes([["name", getName(node)]]), children, level);
}

/**
 * Writes a named `xs:complexType` with its attributes, annotations and content.
 *
 * @param node - The complex type
 * @param level - The indentation level
 * @param depth - How many levels below the selected node the node is
 * @returns The lines of the type
 */
function renderComplexTypeNode(node: DiagramItem, level: number, depth: number): string {
  const attrs = optionalAttributes([["name", getName(node)]]);
  if (isAbstract(node)) {
    attrs.push(["abstract", "true"]);
  }
  if (isMixed(node)) {
    attrs.push(["mixed", "true"]);
  }

  const children = [...renderAnnotations(node, level + 1), ...renderComplexTypeBody(node, level + 1, depth)];

  return renderTag("xs:complexType", attrs, children, level);
}

/**
 * Writes the `xs:schema` element with the namespace declarations of the diagram, which always
 * declare the `xs` prefix that the fragment uses, the target namespace, the annotations and the children.
 *
 * @param node - The schema node
 * @param level - The indentation level
 * @param depth - How many levels below the selected node the node is
 * @returns The lines of the schema
 */
function renderSchemaNode(node: DiagramItem, level: number, depth: number): string {
  const attrs: XmlAttr[] = [];

  const namespaceEntries = Object.entries(getNamespacePrefixes(node.diagram));
  for (const [prefix, uri] of namespaceEntries) {
    const attrName = prefix ? `xmlns:${prefix}` : "xmlns";
    attrs.push([attrName, uri]);
  }

  if (!namespaceEntries.some(([prefix]) => prefix === "xs")) {
    attrs.push(["xmlns:xs", XSD_NAMESPACE]);
  }

  const targetNamespace = getTargetNamespace(node.diagram);
  if (targetNamespace) {
    attrs.push(["targetNamespace", targetNamespace]);
  }

  const children = [...renderAnnotations(node, level + 1), ...renderChildNodes(node.childElements, level + 1, depth)];

  return renderTag("xs:schema", attrs, children, level);
}

/**
 * Renders a diagram item. The diagram builder creates items for the schema, elements, groups and
 * compositors, group references, and named simple and complex types; anonymous types are part of
 * their element.
 *
 * @param node - The diagram item
 * @param level - The indentation level
 * @param depth - How many levels below the selected node the node is
 * @returns The lines of the item
 */
function renderNode(node: DiagramItem, level: number, depth: number): string {
  const nodeType = getNodeType(node);

  if (node.id === SCHEMA_ROOT_ID || nodeType === SchemaNodeType.Schema) {
    return renderSchemaNode(node, level, depth);
  }

  if (nodeType === SchemaNodeType.Element || node.itemType === DiagramItemType.element) {
    return renderElementNode(node, nodeType, level, depth);
  }

  if (
    nodeType === SchemaNodeType.Group ||
    nodeType === SchemaNodeType.GroupRef ||
    node.itemType === DiagramItemType.group
  ) {
    return renderGroupNode(node, nodeType, level, depth);
  }

  if (nodeType === SchemaNodeType.SimpleType) {
    return renderSimpleTypeNode(node, level);
  }

  return renderComplexTypeNode(node, level, depth);
}

/**
 * Builds an XML fragment representing the currently selected diagram node.
 *
 * @param node - The selected diagram item
 * @returns The fragment
 */
export function buildXmlPreview(node: DiagramItem): string {
  return renderNode(node, 0, 0);
}
