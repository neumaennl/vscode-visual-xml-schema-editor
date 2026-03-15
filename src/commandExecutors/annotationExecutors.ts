/**
 * Executors for annotation and documentation commands.
 * Implements add, remove, and modify operations for annotations and documentation.
 *
 * ID Conventions:
 * - annotationId / targetId: XPath-like path to the annotated schema component
 *   (e.g. "/element:person", "/complexType:PersonType").
 * - documentationId: annotated-element path + "/documentation[N]" suffix
 *   (e.g. "/element:person/documentation[0]").
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

/** Any schema component that can carry a single xs:annotation child. */
interface AnnotatableNode {
  annotation?: annotationType;
}

// ===== Helper functions =====

/**
 * Locates an annotatable schema component by its path ID.
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
 * Ensures the given node has an annotation element, creating one if absent.
 */
function ensureAnnotation(node: AnnotatableNode): annotationType {
  if (!node.annotation) {
    node.annotation = new annotationType();
  }
  return node.annotation;
}

// ===== Annotation Executors =====

/**
 * Executes an addAnnotation command.
 *
 * Creates a new xs:annotation element on the target component.
 * If `documentation` is provided a single xs:documentation child is added.
 * If `appInfo` is provided a single xs:appinfo child is added.
 *
 * @param command - The addAnnotation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the target node is not found, does not support annotations,
 *   or already has an annotation (use modifyAnnotation to update an existing one)
 */
export function executeAddAnnotation(
  command: AddAnnotationCommand,
  schemaObj: schema
): void {
  const { targetId, documentation, appInfo } = command.payload;
  const node = findAnnotatableNode(schemaObj, targetId);

  if (node.annotation) {
    throw new Error(
      `Node already has an annotation: ${targetId}. Use modifyAnnotation to update it.`
    );
  }

  const annotation = new annotationType();

  if (documentation !== undefined) {
    const doc = new documentationType();
    doc.value = documentation;
    annotation.documentation = [doc];
  }

  if (appInfo !== undefined) {
    const info = new appinfoType();
    info.value = appInfo;
    annotation.appinfo = [info];
  }

  node.annotation = annotation;
}

/**
 * Executes a removeAnnotation command.
 *
 * Removes the xs:annotation element from the target component identified
 * by `annotationId` (the path to the annotated element).
 *
 * @param command - The removeAnnotation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the node is not found or has no annotation
 */
export function executeRemoveAnnotation(
  command: RemoveAnnotationCommand,
  schemaObj: schema
): void {
  const { annotationId } = command.payload;
  const node = findAnnotatableNode(schemaObj, annotationId);

  if (!node.annotation) {
    throw new Error(`No annotation found on node: ${annotationId}`);
  }

  node.annotation = undefined;
}

/**
 * Executes a modifyAnnotation command.
 *
 * Updates the xs:annotation element on the component identified by
 * `annotationId`. When `documentation` is provided the first
 * xs:documentation child is created-or-replaced. When `appInfo` is
 * provided the first xs:appinfo child is created-or-replaced.
 *
 * @param command - The modifyAnnotation command to execute
 * @param schemaObj - The schema object to modify
 * @throws Error if the node is not found or has no annotation
 */
export function executeModifyAnnotation(
  command: ModifyAnnotationCommand,
  schemaObj: schema
): void {
  const { annotationId, documentation, appInfo } = command.payload;
  const node = findAnnotatableNode(schemaObj, annotationId);

  if (!node.annotation) {
    throw new Error(`No annotation found on node: ${annotationId}`);
  }

  if (documentation !== undefined) {
    const docs = toArray(node.annotation.documentation);
    if (docs.length > 0) {
      docs[0].value = documentation;
      node.annotation.documentation = docs;
    } else {
      const doc = new documentationType();
      doc.value = documentation;
      node.annotation.documentation = [doc];
    }
  }

  if (appInfo !== undefined) {
    const infos = toArray(node.annotation.appinfo);
    if (infos.length > 0) {
      infos[0].value = appInfo;
      node.annotation.appinfo = infos;
    } else {
      const info = new appinfoType();
      info.value = appInfo;
      node.annotation.appinfo = [info];
    }
  }
}

// ===== Documentation Executors =====

/**
 * Executes an addDocumentation command.
 *
 * Appends a new xs:documentation element (with optional xml:lang) to the
 * annotation of the target component, creating the annotation if absent.
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
  const node = findAnnotatableNode(schemaObj, targetId);
  const annotation = ensureAnnotation(node);

  const doc = createDocumentation(content, lang);
  annotation.documentation = [...toArray(annotation.documentation), doc];
}

/**
 * Executes a removeDocumentation command.
 *
 * Removes the xs:documentation element identified by `documentationId`
 * (format: "{elementPath}/documentation[N]").
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
  const { elementId, docIndex } = parseDocumentationId(documentationId);
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
 * Updates the xs:documentation element identified by `documentationId`
 * (format: "{elementPath}/documentation[N]"). When `content` is provided
 * the text value is replaced. When `lang` is provided the xml:lang
 * attribute is set (pass an empty string to remove it).
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
  const { elementId, docIndex } = parseDocumentationId(documentationId);
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

  const doc = docs[docIndex];

  if (content !== undefined) {
    doc.value = content;
  }

  if (lang !== undefined) {
    if (lang === "") {
      // Remove the xml:lang attribute
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

  node.annotation.documentation = docs;
}
