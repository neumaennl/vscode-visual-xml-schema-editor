/**
 * XML-preview helpers for the PropertiesPanel XML tab.
 * Converts a selected diagram node into an XSD fragment string.
 */

import { SCHEMA_ROOT_ID, parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem } from "../diagram";
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pad(level: number): string {
  return INDENT.repeat(level);
}

function toAttrString(attributes: XmlAttr[]): string {
  if (attributes.length === 0) {
    return "";
  }
  return attributes.map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join("");
}

function renderTag(tagName: string, attributes: XmlAttr[], children: string[], level: number): string {
  const prefix = pad(level);
  const attrText = toAttrString(attributes);
  if (children.length === 0) {
    return `${prefix}<${tagName}${attrText}/>`;
  }
  return `${prefix}<${tagName}${attrText}>\n${children.join("\n")}\n${prefix}</${tagName}>`;
}

function renderTruncationMarker(level: number): string {
  return `${pad(level)}${TRUNCATION_MARKER}`;
}

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

function formatMaxOccurs(maxOccurs: number): string {
  return maxOccurs === -1 ? "unbounded" : String(maxOccurs);
}

function appendOccurrenceAttributes(attributes: XmlAttr[], node: DiagramItem, includeDefaults: boolean): void {
  if (includeDefaults || node.minOccurrence !== 1) {
    attributes.push(["minOccurs", String(node.minOccurrence)]);
  }
  if (includeDefaults || node.maxOccurrence !== 1) {
    attributes.push(["maxOccurs", formatMaxOccurs(node.maxOccurrence)]);
  }
}

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

function renderAnnotations(node: DiagramItem, level: number): string[] {
  return node.documentationAnnotations.map((annotation) => {
    const documentationChildren = annotation.documentationEntries.map((entry) =>
      renderDocumentationNode(entry.content, entry.lang, level + 1)
    );
    return renderTag("xs:annotation", [], documentationChildren, level);
  });
}

function renderAttributeNodes(node: DiagramItem, level: number): string[] {
  return node.attributes.map((attribute) => {
    const attrs: XmlAttr[] = [["name", attribute.name]];
    if (attribute.type) {
      attrs.push(["type", attribute.type]);
    }
    if (attribute.use) {
      attrs.push(["use", attribute.use]);
    }
    if (attribute.defaultValue !== undefined) {
      attrs.push(["default", attribute.defaultValue]);
    }
    if (attribute.fixedValue !== undefined) {
      attrs.push(["fixed", attribute.fixedValue]);
    }
    return renderTag("xs:attribute", attrs, [], level);
  });
}

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

function renderElementNode(node: DiagramItem, nodeType: SchemaNodeType | null, level: number, depth: number): string {
  const attributes: XmlAttr[] = [["name", node.name]];

  if (node.type && !node.hasAnonymousComplexType && !node.isSimpleContent && !node.type.startsWith("<anonymous")) {
    attributes.push(["type", node.type]);
  }

  if (node.isNillable) {
    attributes.push(["nillable", "true"]);
  }
  if (node.isAbstract) {
    attributes.push(["abstract", "true"]);
  }
  if (node.elementDefault !== undefined) {
    attributes.push(["default", node.elementDefault]);
  }
  if (node.elementFixed !== undefined) {
    attributes.push(["fixed", node.elementFixed]);
  }

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

function renderSimpleTypeNode(node: DiagramItem, level: number): string {
  const children = [...renderAnnotations(node, level + 1), ...renderSimpleTypeChildren(node, level + 1)];
  return renderTag("xs:simpleType", [["name", node.name]], children, level);
}

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
 */
export function buildXmlPreview(node: DiagramItem): string {
  return renderNode(node, 0, 0);
}
