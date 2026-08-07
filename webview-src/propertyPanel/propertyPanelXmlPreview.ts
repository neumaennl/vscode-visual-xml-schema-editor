/**
 * XML-preview helpers for the PropertyPanel XML tab.
 * Converts a selected diagram node into an XSD fragment string.
 */

import { SCHEMA_ROOT_ID, parseSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { extractBaseType, getNodeType, isTopLevelElement } from "./propertyPanelCommands";

const INDENT = "  ";
const TRUNCATION_MARKER = "<!-- ... truncated ... -->";
const MAX_PREVIEW_DESCENDANT_DEPTH = 1;
const MAX_PREVIEW_CHILDREN_PER_NODE = 50;
const MAX_PREVIEW_NODES = 250;

type XmlAttr = [name: string, value: string];

interface XmlPreviewRenderContext {
  maxDescendantDepth: number;
  maxChildrenPerNode: number;
  maxNodes: number;
  renderedNodes: number;
}

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

function createRenderContext(): XmlPreviewRenderContext {
  return {
    maxDescendantDepth: MAX_PREVIEW_DESCENDANT_DEPTH,
    maxChildrenPerNode: MAX_PREVIEW_CHILDREN_PER_NODE,
    maxNodes: MAX_PREVIEW_NODES,
    renderedNodes: 0,
  };
}

function tryCountNode(context: XmlPreviewRenderContext): boolean {
  if (context.renderedNodes >= context.maxNodes) {
    return false;
  }
  context.renderedNodes += 1;
  return true;
}

function renderChildNodes(
  children: DiagramItem[],
  level: number,
  depth: number,
  context: XmlPreviewRenderContext
): string[] {
  if (children.length === 0) {
    return [];
  }

  if (depth >= context.maxDescendantDepth) {
    return [renderTruncationMarker(level)];
  }

  const limitedChildren = children.slice(0, context.maxChildrenPerNode);
  const rendered: string[] = [];

  for (const child of limitedChildren) {
    const nextNode = renderNode(child, level, depth + 1, context);
    if (!nextNode) {
      rendered.push(renderTruncationMarker(level));
      return rendered;
    }
    rendered.push(nextNode);
  }

  if (children.length > context.maxChildrenPerNode) {
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
  const baseType = extractBaseType(node.type);
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

function renderComplexTypeBody(
  node: DiagramItem,
  level: number,
  depth: number,
  context: XmlPreviewRenderContext
): string[] {
  const modelChildren = renderChildNodes(node.childElements, level, depth, context);
  const attributeChildren = renderAttributeNodes(node, level);

  const baseType = extractBaseType(node.type);
  if (baseType && node.complexDerivationKind) {
    const derivationTag = node.complexDerivationKind === "restriction" ? "xs:restriction" : "xs:extension";
    const derivationChildren = [
      ...renderChildNodes(node.childElements, level + 2, depth, context),
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

  return [...modelChildren, ...attributeChildren];
}

function renderElementNode(
  node: DiagramItem,
  nodeType: SchemaNodeType | null,
  level: number,
  depth: number,
  context: XmlPreviewRenderContext
): string {
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
    const complexTypeChildren = renderComplexTypeBody(node, level + 2, depth, context);
    children.push(renderTag("xs:complexType", complexTypeAttributes, complexTypeChildren, level + 1));
  } else if (node.isSimpleContent) {
    const simpleTypeChildren = renderSimpleTypeChildren(node, level + 2);
    children.push(renderTag("xs:simpleType", [], simpleTypeChildren, level + 1));
  } else {
    children.push(...renderChildNodes(node.childElements, level + 1, depth, context));
  }

  return renderTag("xs:element", attributes, children, level);
}

function renderGroupNode(
  node: DiagramItem,
  nodeType: SchemaNodeType | null,
  level: number,
  depth: number,
  context: XmlPreviewRenderContext
): string {
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
      ...renderChildNodes(node.childElements, level + 1, depth, context),
    ];
    return renderTag("xs:group", attrs, children, level);
  }

  const compositor = parsedName === "choice" || parsedName === "all" ? parsedName : "sequence";
  const attrs: XmlAttr[] = [];
  appendOccurrenceAttributes(attrs, node, false);
  const children = [
    ...renderAnnotations(node, level + 1),
    ...renderChildNodes(node.childElements, level + 1, depth, context),
  ];
  return renderTag(`xs:${compositor}`, attrs, children, level);
}

function renderSimpleTypeNode(node: DiagramItem, nodeType: SchemaNodeType | null, level: number): string {
  const attrs: XmlAttr[] = [];
  if (nodeType === SchemaNodeType.SimpleType) {
    attrs.push(["name", node.name]);
  }
  const children = [...renderAnnotations(node, level + 1), ...renderSimpleTypeChildren(node, level + 1)];
  return renderTag("xs:simpleType", attrs, children, level);
}

function renderComplexTypeNode(
  node: DiagramItem,
  nodeType: SchemaNodeType | null,
  level: number,
  depth: number,
  context: XmlPreviewRenderContext
): string {
  const attrs: XmlAttr[] = [];
  if (nodeType === SchemaNodeType.ComplexType) {
    attrs.push(["name", node.name]);
  }
  if (node.isAbstract) {
    attrs.push(["abstract", "true"]);
  }
  if (node.isMixed) {
    attrs.push(["mixed", "true"]);
  }

  const children = [
    ...renderAnnotations(node, level + 1),
    ...renderComplexTypeBody(node, level + 1, depth, context),
  ];

  return renderTag("xs:complexType", attrs, children, level);
}

function renderSchemaNode(
  node: DiagramItem,
  level: number,
  depth: number,
  context: XmlPreviewRenderContext
): string {
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
    ...renderChildNodes(node.childElements, level + 1, depth, context),
  ];

  return renderTag("xs:schema", attrs, children, level);
}

function renderNode(
  node: DiagramItem,
  level: number,
  depth: number,
  context: XmlPreviewRenderContext
): string | null {
  if (!tryCountNode(context)) {
    return null;
  }

  const nodeType = getNodeType(node);

  if (node.id === SCHEMA_ROOT_ID || nodeType === SchemaNodeType.Schema) {
    return renderSchemaNode(node, level, depth, context);
  }

  if (nodeType === SchemaNodeType.Element || node.itemType === DiagramItemType.element) {
    return renderElementNode(node, nodeType, level, depth, context);
  }

  if (
    nodeType === SchemaNodeType.Group ||
    nodeType === SchemaNodeType.GroupRef ||
    node.itemType === DiagramItemType.group
  ) {
    return renderGroupNode(node, nodeType, level, depth, context);
  }

  if (nodeType === SchemaNodeType.SimpleType || nodeType === SchemaNodeType.AnonymousSimpleType) {
    return renderSimpleTypeNode(node, nodeType, level);
  }

  if (nodeType === SchemaNodeType.ComplexType || nodeType === SchemaNodeType.AnonymousComplexType) {
    return renderComplexTypeNode(node, nodeType, level, depth, context);
  }

  const fallbackChildren = renderChildNodes(node.childElements, level + 1, depth, context);
  return renderTag("xs:node", [["name", node.name]], fallbackChildren, level);
}

/**
 * Builds an XML fragment representing the currently selected diagram node.
 */
export function buildXmlPreview(node: DiagramItem): string {
  const context = createRenderContext();
  const rendered = renderNode(node, 0, 0, context);
  if (!rendered) {
    return TRUNCATION_MARKER;
  }
  return rendered;
}
