/**
 * XML-preview helpers for the `PropertiesPanel` XML tab.
 * Converts a selected diagram node into an XSD fragment string.
 */

import { SCHEMA_ROOT_ID, parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import type { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { getNodeType, isTopLevelElement } from "./propertiesPanelCommands";
import { extractBaseType } from "./propertiesPanelSimpleTypeCommands";

const INDENT = "  ";
const TRUNCATION_MARKER = "<!-- ... truncated ... -->";
/** How many levels of children the preview shows below the selected node. */
const MAX_PREVIEW_DESCENDANT_DEPTH = 1;
/** How many children of a node the preview shows. */
const MAX_PREVIEW_CHILDREN_PER_NODE = 50;

type XmlAttr = [name: string, value: string];

/**
 * Returns the attributes that have a value.
 *
 * @param attributes - Names with optional values
 * @returns The attributes with a value, in the same order
 */
function optionalAttributes(attributes: Array<[name: string, value: string | undefined]>): XmlAttr[] {
  return attributes.filter((attribute): attribute is XmlAttr => attribute[1] !== undefined);
}

/**
 * Escapes the characters that XML does not allow in attribute values and text.
 *
 * @param value - The text
 * @returns The escaped text
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Returns the indentation of a line.
 *
 * @param level - The indentation level
 * @returns The spaces
 */
function pad(level: number): string {
  return INDENT.repeat(level);
}

/**
 * Writes attributes as they follow the name of a tag, each with a leading space.
 *
 * @param attributes - The attributes
 * @returns The attributes, or an empty string without attributes
 */
function toAttrString(attributes: XmlAttr[]): string {
  if (attributes.length === 0) {
    return "";
  }
  return attributes.map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join("");
}

/**
 * Writes an element with its attributes and children, or as an empty tag without children.
 *
 * @param tagName - The name of the element
 * @param attributes - The attributes
 * @param children - The lines of the children, already indented
 * @param level - The indentation level
 * @returns The lines of the element
 */
function renderTag(tagName: string, attributes: XmlAttr[], children: string[], level: number): string {
  const prefix = pad(level);
  const attrText = toAttrString(attributes);
  if (children.length === 0) {
    return `${prefix}<${tagName}${attrText}/>`;
  }
  return `${prefix}<${tagName}${attrText}>\n${children.join("\n")}\n${prefix}</${tagName}>`;
}

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

  const rendered = children
    .slice(0, MAX_PREVIEW_CHILDREN_PER_NODE)
    .map((child) => renderNode(child, level, depth + 1));
  if (children.length > MAX_PREVIEW_CHILDREN_PER_NODE) {
    rendered.push(renderTruncationMarker(level));
  }
  return rendered;
}

/**
 * Writes the value of `maxOccurs`, which the diagram stores as -1 for `unbounded`.
 *
 * @param maxOccurs - The value of the diagram item
 * @returns The value of the attribute
 */
function formatMaxOccurs(maxOccurs: number): string {
  return maxOccurs === -1 ? "unbounded" : String(maxOccurs);
}

/**
 * Adds `minOccurs` and `maxOccurs` to attributes, by default only when they differ from 1.
 *
 * @param attributes - The attributes, which are changed
 * @param node - The node with the occurrence
 * @param includeDefaults - Whether to add them when they are 1, too
 */
function appendOccurrenceAttributes(attributes: XmlAttr[], node: DiagramItem, includeDefaults: boolean): void {
  if (includeDefaults || node.minOccurrence !== 1) {
    attributes.push(["minOccurs", String(node.minOccurrence)]);
  }
  if (includeDefaults || node.maxOccurrence !== 1) {
    attributes.push(["maxOccurs", formatMaxOccurs(node.maxOccurrence)]);
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
  return node.documentationAnnotations.map((annotation) => {
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
  return node.attributes.map((attribute) => {
    const attrs: XmlAttr[] = [
      ["name", attribute.name],
      ...optionalAttributes([
        ["type", attribute.type || undefined],
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
  const restrictions = node.restrictions;
  if (!restrictions) {
    return [];
  }

  const facets: string[] = [];

  for (const value of restrictions.enumeration ?? []) {
    facets.push(renderTag("xs:enumeration", [["value", value]], [], level));
  }

  for (const value of restrictions.pattern ?? []) {
    facets.push(renderTag("xs:pattern", [["value", value]], [], level));
  }

  const scalarFacetMap: Array<[string, number | string | undefined]> = [
    ["length", restrictions.length],
    ["minLength", restrictions.minLength],
    ["maxLength", restrictions.maxLength],
    ["minInclusive", restrictions.minInclusive],
    ["maxInclusive", restrictions.maxInclusive],
    ["minExclusive", restrictions.minExclusive],
    ["maxExclusive", restrictions.maxExclusive],
    ["totalDigits", restrictions.totalDigits],
    ["fractionDigits", restrictions.fractionDigits],
    ["whiteSpace", restrictions.whiteSpace],
  ];

  for (const [facetName, value] of scalarFacetMap) {
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
  const typeLabel = node.type.trim();
  const hasDerivedSummary = !!node.simpleTypeDerivationKind || typeLabel.includes("(");

  if (node.simpleTypeDerivationKind === "list") {
    const listAttributes: XmlAttr[] = [];
    if (node.simpleTypeListItemType) {
      listAttributes.push(["itemType", node.simpleTypeListItemType]);
    }
    return [renderTag("xs:list", listAttributes, [], level)];
  }

  if (node.simpleTypeDerivationKind === "union") {
    const unionAttributes: XmlAttr[] = [];
    if (node.simpleTypeUnionMemberTypes?.length) {
      unionAttributes.push(["memberTypes", node.simpleTypeUnionMemberTypes.join(" ")]);
    }
    return [renderTag("xs:union", unionAttributes, [], level)];
  }

  const baseType = hasDerivedSummary ? extractBaseType(node.type) : undefined;
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
  const baseType = extractBaseType(node.type);
  if (baseType && node.complexDerivationKind) {
    const derivationTag = node.complexDerivationKind === "restriction" ? "xs:restriction" : "xs:extension";
    const derivationChildren = [
      ...renderChildNodes(node.childElements, level + 2, depth),
      ...renderAttributeNodes(node, level + 2),
    ];
    const contentTag = node.isSimpleContent ? "xs:simpleContent" : "xs:complexContent";

    return [
      renderTag(
        contentTag,
        [],
        [renderTag(derivationTag, [["base", baseType]], derivationChildren, level + 1)],
        level
      ),
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
  const attributes: XmlAttr[] = [["name", node.name]];

  if (node.type && !node.hasAnonymousComplexType && !node.isSimpleContent && !node.type.startsWith("<anonymous")) {
    attributes.push(["type", node.type]);
  }

  attributes.push(
    ...optionalAttributes([
      ["nillable", node.isNillable ? "true" : undefined],
      ["abstract", node.isAbstract ? "true" : undefined],
      ["default", node.elementDefault],
      ["fixed", node.elementFixed],
    ])
  );

  const includeOccurs = !(nodeType === SchemaNodeType.Element && isTopLevelElement(node));
  if (includeOccurs) {
    appendOccurrenceAttributes(attributes, node, false);
  }

  const children: string[] = [...renderAnnotations(node, level + 1)];

  if (node.hasAnonymousComplexType) {
    const complexTypeAttributes: XmlAttr[] = [];
    if (node.isMixed) {
      complexTypeAttributes.push(["mixed", "true"]);
    }
    const complexTypeChildren = renderComplexTypeBody(node, level + 2, depth);
    children.push(renderTag("xs:complexType", complexTypeAttributes, complexTypeChildren, level + 1));
  } else if (node.isSimpleContent) {
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
  if (nodeType === SchemaNodeType.GroupRef || node.isReference) {
    const attrs: XmlAttr[] = [["ref", node.name]];
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
    const attrs: XmlAttr[] = [["name", node.name]];
    const children = [
      ...renderAnnotations(node, level + 1),
      ...renderChildNodes(node.childElements, level + 1, depth),
    ];
    return renderTag("xs:group", attrs, children, level);
  }

  const compositor = parsedName === "choice" || parsedName === "all" ? parsedName : "sequence";
  const attrs: XmlAttr[] = [];
  appendOccurrenceAttributes(attrs, node, false);
  const children = [
    ...renderAnnotations(node, level + 1),
    ...renderChildNodes(node.childElements, level + 1, depth),
  ];
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
  return renderTag("xs:simpleType", [["name", node.name]], children, level);
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
  const attrs: XmlAttr[] = [["name", node.name]];
  if (node.isAbstract) {
    attrs.push(["abstract", "true"]);
  }
  if (node.isMixed) {
    attrs.push(["mixed", "true"]);
  }

  const children = [
    ...renderAnnotations(node, level + 1),
    ...renderComplexTypeBody(node, level + 1, depth),
  ];

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

  const namespaceEntries = Object.entries(node.diagram?.schemaNamespacePrefixes ?? {});
  for (const [prefix, uri] of namespaceEntries) {
    const attrName = prefix ? `xmlns:${prefix}` : "xmlns";
    attrs.push([attrName, uri]);
  }

  if (!namespaceEntries.some(([prefix]) => prefix === "xs")) {
    attrs.push(["xmlns:xs", "http://www.w3.org/2001/XMLSchema"]);
  }

  if (node.diagram?.schemaTargetNamespace) {
    attrs.push(["targetNamespace", node.diagram.schemaTargetNamespace]);
  }

  const children = [
    ...renderAnnotations(node, level + 1),
    ...renderChildNodes(node.childElements, level + 1, depth),
  ];

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
