/**
 * Executors for annotation and documentation commands.
 * Implements add, remove, and modify operations for annotations and documentation.
 *
 * ID Conventions:
 * - annotationId / targetId for non-schema nodes: XPath-like path to the annotated
 *   schema component (e.g. "/element:person", "/complexType:PersonType").
 * - annotationId for the schema root (which supports multiple xs:annotation children):
 *   "schema/annotation[N]" — identifies the N-th (0-based) annotation on the schema.
 * - documentationId for non-schema nodes: annotated-element path + "/documentation[N]"
 *   (e.g. "/element:person/documentation[0]").
 * - documentationId for schema-root annotations:
 *   - "schema/annotation[N]/documentation[M]" — M-th doc of the N-th schema annotation.
 *   - "schema/documentation[N]" — N-th doc of the first (index-0) schema annotation.
 *
 * Note on references: xs:annotation, xs:documentation and xs:appinfo do NOT
 * support a `ref` attribute in the XSD specification. They are always inline
 * elements and cannot be referenced from elsewhere in the schema.
 */

import {
  schema,
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
  annotationType,
  documentationType,
  appinfoType,
} from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { locateNodeById } from "../schemaNavigator";

// ===== Structural types =====

/** Any non-schema component that can carry a single xs:annotation child. */
interface AnnotatableNode {
  annotation?: annotationType;
}

// ===== Helper functions =====

/** Returns true when `nodeId` refers to the schema root. */
function isSchemaId(nodeId: string): boolean {
  return nodeId === "schema" || nodeId === "/schema";
}

/**
 * Parses a schema-annotation ID of the form "schema/annotation[N]".
 * @returns The 0-based annotation index, or null if the format does not match.
 */
export function parseSchemaAnnotationId(id: string): number | null {
  const match = id.match(/^(?:\/?)schema\/annotation\[(\d+)\]$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parses a schema-level documentation ID of the form
 * "schema/annotation[N]/documentation[M]".
 * @returns Annotation and documentation indices, or null if the format does not match.
 */
export function parseSchemaDocumentationId(
  id: string
): { annotIndex: number; docIndex: number } | null {
  const match = id.match(
    /^(?:\/?)schema\/annotation\[(\d+)\]\/documentation\[(\d+)\]$/
  );
  return match
    ? { annotIndex: parseInt(match[1], 10), docIndex: parseInt(match[2], 10) }
    : null;
}

/**
 * Parses a documentationId of the form "{elementPath}/documentation[N]".
 *
 * @returns The annotated-element path and the 0-based documentation index.
 * @throws Error if the format is invalid.
 */
export function parseDocumentationId(documentationId: string): {
  elementId: string;
  docIndex: number;
} {
  const match = documentationId.match(/^(.+)\/documentation\[(\d+)\]$/);
  // The greedy `.+` is intentional: with the `$` anchor the engine backtracks to
  // match the LAST `/documentation[N]` in the string, so the captured element
  // path is everything before that final suffix (including any intermediate
  // `/documentation[N]` segments in a hypothetical nested path).
  if (!match) {
    throw new Error(
      `Invalid documentationId format — expected "{elementPath}/documentation[N]": ${documentationId}`
    );
  }
  return { elementId: match[1], docIndex: parseInt(match[2], 10) };
}

/**
 * Creates a new documentationType from content and an optional language tag.
 * The xml:lang attribute (from the XML namespace) is stored via the
 * _anyAttributes map as "xml:lang".
 */
function createDocumentation(content: string, lang?: string): documentationType {
  const doc = new documentationType();
  doc.value = content;
  if (lang) {
    doc._anyAttributes = { "xml:lang": lang };
  }
  return doc;
}

/**
 * Returns the first xs:annotation on the schema root, creating one (and
 * appending it to the array) if none exists yet. Always ensures
 * schemaObj.annotation is stored as a proper array.
 */
function getOrCreateFirstSchemaAnnotation(schemaObj: schema): annotationType {
  const annots = toArray(schemaObj.annotation);
  if (annots.length > 0) {
    schemaObj.annotation = annots; // ensure the property is a proper array
    return annots[0];
  }
  const annotation = new annotationType();
  schemaObj.annotation = [annotation];
  return annotation;
}

/**
 * Locates a non-schema annotatable component by its path ID.
 *
 * @throws Error if the node is not found or does not support annotations
 */
function findAnnotatableNode(schemaObj: schema, nodeId: string): AnnotatableNode {
  const location = locateNodeById(schemaObj, nodeId);
  if (!location.found || !location.parent) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  const node = location.parent as Record<string, unknown>;
  // Every annotatable schema component exposes an `annotation` property
  // (even when it is currently undefined).
  if (!("annotation" in node)) {
    throw new Error(`Node does not support annotations: ${nodeId}`);
  }
  return node as AnnotatableNode;
}

/**
 * Ensures the given non-schema node has an annotation element, creating one if absent.
 */
function ensureAnnotation(node: AnnotatableNode): annotationType {
  if (!node.annotation) {
    node.annotation = new annotationType();
  }
  return node.annotation;
}

/**
 * Shared logic for modifying documentation and appinfo on a single annotationType.
 */
function applyAnnotationModifications(
  annotation: annotationType,
  documentation?: string,
  appInfo?: string
): void {
  if (documentation !== undefined) {
    const docs = toArray(annotation.documentation);
    if (docs.length > 0) {
      docs[0].value = documentation;
      annotation.documentation = docs;
    } else {
      annotation.documentation = [createDocumentation(documentation)];
    }
  }

  if (appInfo !== undefined) {
    const infos = toArray(annotation.appinfo);
    if (infos.length > 0) {
      infos[0].value = appInfo;
      annotation.appinfo = infos;
    } else {
      const info = new appinfoType();
      info.value = appInfo;
      annotation.appinfo = [info];
    }
  }
}

// ===== Annotation Executors =====

/**
 * Executes an addAnnotation command.
 *
 * For the schema root (`targetId: "schema"`): appends a new xs:annotation to
 * the schema's annotation array. The schema may hold multiple annotations so
 * no duplicate check is performed.
 *
 * For all other annotatable components: creates a new xs:annotation element.
 * Fails if the component already has an annotation — use modifyAnnotation
 * instead.
 *
 * @param command - The addAnnotation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the target node is not found, does not support annotations,
 *   or (for non-schema nodes) already has an annotation
 */
export function executeAddAnnotation(
  command: AddAnnotationCommand,
  schemaObj: schema
): void {
  const { targetId, documentation, appInfo } = command.payload;

  const annotation = new annotationType();
  if (documentation !== undefined) {
    annotation.documentation = [createDocumentation(documentation)];
  }
  if (appInfo !== undefined) {
    const info = new appinfoType();
    info.value = appInfo;
    annotation.appinfo = [info];
  }

  if (isSchemaId(targetId)) {
    // Schema allows multiple xs:annotation children — always append.
    schemaObj.annotation = [...toArray(schemaObj.annotation), annotation];
    return;
  }

  const node = findAnnotatableNode(schemaObj, targetId);
  if (node.annotation) {
    throw new Error(
      `Node already has an annotation: ${targetId}. Use modifyAnnotation to update it.`
    );
  }
  node.annotation = annotation;
}

/**
 * Executes a removeAnnotation command.
 *
 * For the schema root use `annotationId: "schema/annotation[N]"` to remove
 * the N-th annotation from the schema's annotation array.
 *
 * For all other annotatable components, `annotationId` is the node path
 * (e.g. "/element:person").
 *
 * @param command - The removeAnnotation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the node is not found, has no annotation, or the index is
 *   out of bounds
 */
export function executeRemoveAnnotation(
  command: RemoveAnnotationCommand,
  schemaObj: schema
): void {
  const { annotationId } = command.payload;

  const schemaAnnotIdx = parseSchemaAnnotationId(annotationId);
  if (schemaAnnotIdx !== null) {
    const annots = toArray(schemaObj.annotation);
    if (schemaAnnotIdx < 0 || schemaAnnotIdx >= annots.length) {
      throw new Error(
        `Annotation index ${schemaAnnotIdx} out of bounds (length ${annots.length}): ${annotationId}`
      );
    }
    annots.splice(schemaAnnotIdx, 1);
    schemaObj.annotation = annots.length > 0 ? annots : undefined;
    return;
  }

  const node = findAnnotatableNode(schemaObj, annotationId);
  if (!node.annotation) {
    throw new Error(`No annotation found on node: ${annotationId}`);
  }
  node.annotation = undefined;
}

/**
 * Executes a modifyAnnotation command.
 *
 * For the schema root use `annotationId: "schema/annotation[N]"` to modify
 * the N-th annotation.
 *
 * When `documentation` is provided the first xs:documentation child is
 * created-or-updated. When `appInfo` is provided the first xs:appinfo child
 * is created-or-updated.
 *
 * @param command - The modifyAnnotation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the node is not found, has no annotation, or the index is
 *   out of bounds
 */
export function executeModifyAnnotation(
  command: ModifyAnnotationCommand,
  schemaObj: schema
): void {
  const { annotationId, documentation, appInfo } = command.payload;

  const schemaAnnotIdx = parseSchemaAnnotationId(annotationId);
  if (schemaAnnotIdx !== null) {
    const annots = toArray(schemaObj.annotation);
    if (schemaAnnotIdx < 0 || schemaAnnotIdx >= annots.length) {
      throw new Error(
        `Annotation index ${schemaAnnotIdx} out of bounds (length ${annots.length}): ${annotationId}`
      );
    }
    applyAnnotationModifications(annots[schemaAnnotIdx], documentation, appInfo);
    return;
  }

  const node = findAnnotatableNode(schemaObj, annotationId);
  if (!node.annotation) {
    throw new Error(`No annotation found on node: ${annotationId}`);
  }
  applyAnnotationModifications(node.annotation, documentation, appInfo);
}

// ===== Documentation Executors =====

/**
 * Executes an addDocumentation command.
 *
 * Appends a new xs:documentation element (with optional xml:lang) to the
 * annotation on the target component:
 * - `targetId: "schema"` — adds to the first schema annotation (creating it
 *   if the schema has none).
 * - `targetId: "schema/annotation[N]"` — adds to the N-th schema annotation.
 * - Any other path — adds to the single annotation of that component,
 *   creating the annotation if absent.
 *
 * @param command - The addDocumentation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the target node is not found or does not support annotations
 */
export function executeAddDocumentation(
  command: AddDocumentationCommand,
  schemaObj: schema
): void {
  const { targetId, content, lang } = command.payload;
  const doc = createDocumentation(content, lang);

  if (isSchemaId(targetId)) {
    const annotation = getOrCreateFirstSchemaAnnotation(schemaObj);
    annotation.documentation = [...toArray(annotation.documentation), doc];
    return;
  }

  const schemaAnnotIdx = parseSchemaAnnotationId(targetId);
  if (schemaAnnotIdx !== null) {
    const annots = toArray(schemaObj.annotation);
    if (schemaAnnotIdx >= annots.length) {
      throw new Error(
        `Annotation index ${schemaAnnotIdx} out of bounds (length ${annots.length}): ${targetId}`
      );
    }
    const annotation = annots[schemaAnnotIdx];
    annotation.documentation = [...toArray(annotation.documentation), doc];
    return;
  }

  const node = findAnnotatableNode(schemaObj, targetId);
  const annotation = ensureAnnotation(node);
  annotation.documentation = [...toArray(annotation.documentation), doc];
}

/**
 * Executes a removeDocumentation command.
 *
 * Accepted `documentationId` formats:
 * - `"schema/annotation[N]/documentation[M]"` — removes the M-th doc from
 *   the N-th annotation on the schema root.
 * - `"schema/documentation[N]"` — removes the N-th doc from the first schema
 *   annotation.
 * - `"{elementPath}/documentation[N]"` — removes from the single annotation
 *   of any other schema component.
 *
 * @param command - The removeDocumentation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the node, annotation, or documentation element is not found
 */
export function executeRemoveDocumentation(
  command: RemoveDocumentationCommand,
  schemaObj: schema
): void {
  const { documentationId } = command.payload;

  // "schema/annotation[N]/documentation[M]" format
  const schemaDId = parseSchemaDocumentationId(documentationId);
  if (schemaDId) {
    const annots = toArray(schemaObj.annotation);
    if (schemaDId.annotIndex >= annots.length) {
      throw new Error(
        `Annotation index ${schemaDId.annotIndex} out of bounds (length ${annots.length}): ${documentationId}`
      );
    }
    const annotation = annots[schemaDId.annotIndex];
    const docs = toArray(annotation.documentation);
    if (schemaDId.docIndex < 0 || schemaDId.docIndex >= docs.length) {
      throw new Error(
        `Documentation index ${schemaDId.docIndex} out of bounds (length ${docs.length}): ${documentationId}`
      );
    }
    docs.splice(schemaDId.docIndex, 1);
    annotation.documentation = docs.length > 0 ? docs : undefined;
    return;
  }

  // "elementPath/documentation[N]" format
  const { elementId, docIndex } = parseDocumentationId(documentationId);

  if (isSchemaId(elementId)) {
    // "schema/documentation[N]" shorthand — targets the first schema annotation
    const annots = toArray(schemaObj.annotation);
    if (annots.length === 0) {
      throw new Error(`No annotation found on schema root`);
    }
    const annotation = annots[0];
    const docs = toArray(annotation.documentation);
    if (docIndex < 0 || docIndex >= docs.length) {
      throw new Error(
        `Documentation index ${docIndex} out of bounds (length ${docs.length}): ${documentationId}`
      );
    }
    docs.splice(docIndex, 1);
    annotation.documentation = docs.length > 0 ? docs : undefined;
    return;
  }

  const node = findAnnotatableNode(schemaObj, elementId);
  if (!node.annotation) {
    throw new Error(`No annotation found on node: ${elementId}`);
  }
  const docs = toArray(node.annotation.documentation);
  if (docIndex < 0 || docIndex >= docs.length) {
    throw new Error(
      `Documentation index ${docIndex} out of bounds (length ${docs.length}): ${documentationId}`
    );
  }
  docs.splice(docIndex, 1);
  node.annotation.documentation = docs.length > 0 ? docs : undefined;
}

/**
 * Executes a modifyDocumentation command.
 *
 * Accepted `documentationId` formats:
 * - `"schema/annotation[N]/documentation[M]"` — updates the M-th doc of the
 *   N-th schema annotation.
 * - `"schema/documentation[N]"` — updates the N-th doc of the first schema
 *   annotation.
 * - `"{elementPath}/documentation[N]"` — updates the doc of any other
 *   schema component.
 *
 * Pass `lang: ""` to remove the xml:lang attribute.
 *
 * @param command - The modifyDocumentation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the node, annotation, or documentation element is not found
 */
export function executeModifyDocumentation(
  command: ModifyDocumentationCommand,
  schemaObj: schema
): void {
  const { documentationId, content, lang } = command.payload;

  // "schema/annotation[N]/documentation[M]" format
  const schemaDId = parseSchemaDocumentationId(documentationId);
  if (schemaDId) {
    const annots = toArray(schemaObj.annotation);
    if (schemaDId.annotIndex >= annots.length) {
      throw new Error(
        `Annotation index ${schemaDId.annotIndex} out of bounds (length ${annots.length}): ${documentationId}`
      );
    }
    const annotation = annots[schemaDId.annotIndex];
    const docs = toArray(annotation.documentation);
    if (schemaDId.docIndex < 0 || schemaDId.docIndex >= docs.length) {
      throw new Error(
        `Documentation index ${schemaDId.docIndex} out of bounds (length ${docs.length}): ${documentationId}`
      );
    }
    applyDocModifications(docs[schemaDId.docIndex], content, lang);
    annotation.documentation = docs;
    return;
  }

  // "elementPath/documentation[N]" format
  const { elementId, docIndex } = parseDocumentationId(documentationId);

  if (isSchemaId(elementId)) {
    // "schema/documentation[N]" shorthand — targets the first schema annotation
    const annots = toArray(schemaObj.annotation);
    if (annots.length === 0) {
      throw new Error(`No annotation found on schema root`);
    }
    const annotation = annots[0];
    const docs = toArray(annotation.documentation);
    if (docIndex < 0 || docIndex >= docs.length) {
      throw new Error(
        `Documentation index ${docIndex} out of bounds (length ${docs.length}): ${documentationId}`
      );
    }
    applyDocModifications(docs[docIndex], content, lang);
    annotation.documentation = docs;
    return;
  }

  const node = findAnnotatableNode(schemaObj, elementId);
  if (!node.annotation) {
    throw new Error(`No annotation found on node: ${elementId}`);
  }
  const docs = toArray(node.annotation.documentation);
  if (docIndex < 0 || docIndex >= docs.length) {
    throw new Error(
      `Documentation index ${docIndex} out of bounds (length ${docs.length}): ${documentationId}`
    );
  }
  applyDocModifications(docs[docIndex], content, lang);
  node.annotation.documentation = docs;
}

/**
 * Applies content and/or lang changes to a single xs:documentation element.
 * Pass `lang: ""` to remove the xml:lang attribute.
 */
function applyDocModifications(
  doc: documentationType,
  content?: string,
  lang?: string
): void {
  if (content !== undefined) {
    doc.value = content;
  }
  if (lang !== undefined) {
    if (lang === "") {
      if (doc._anyAttributes) {
        delete doc._anyAttributes["xml:lang"];
      }
    } else {
      if (!doc._anyAttributes) {
        doc._anyAttributes = {};
      }
      doc._anyAttributes["xml:lang"] = lang;
    }
  }
}
