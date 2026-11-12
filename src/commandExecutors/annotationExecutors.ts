/**
 * Executors for annotation and documentation commands.
 * Implements add, remove, and modify operations for annotations and documentation.
 *
 * ID Conventions:
 * - annotationId / targetId for non-schema nodes: XPath-like path to the annotated
 *   schema component (e.g. "/element:person", "/complexType:PersonType").
 * - annotationId for the schema root (which supports multiple xs:annotation children):
 *   "/schema/annotation[N]" — identifies the N-th (0-based) annotation on the schema.
 * - documentationId for non-schema nodes: annotated-element path + "/documentation[N]"
 *   (e.g. "/element:person/documentation[0]").
 * - documentationId for schema-root annotations:
 *   - "/schema/annotation[N]/documentation[M]" — M-th doc of the N-th schema annotation.
 *   - "/schema/documentation[N]" — N-th doc of the first (index-0) schema annotation.
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
} from "../../shared/types.js";
import { isSchemaRoot } from "../../shared/schemaUtils.js";
import { assumeValidated, locateValidated } from "./assumeValidated.js";
import {
  parseDocumentationId,
  parseSchemaAnnotationId,
  parseSchemaDocumentationId,
} from "../commandUtils.js";

export { parseDocumentationId, parseSchemaAnnotationId, parseSchemaDocumentationId };

// ===== Structural types =====

/** Any non-schema component that can carry a single xs:annotation child. */
interface AnnotatableNode {
  annotation?: annotationType;
}

// ===== Helper functions =====

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
 * Returns the first xs:annotation on the schema root, creating one if the
 * schema has none yet.
 */
function getOrCreateFirstSchemaAnnotation(schemaObj: schema): annotationType {
  const annotations = schemaObj.annotation ?? [];
  if (annotations.length > 0) {
    return annotations[0];
  }
  const annotation = new annotationType();
  schemaObj.annotation = [annotation];
  return annotation;
}

/**
 * Locates a non-schema annotatable component by its path ID.
 *
 * Assumes that the validator has already confirmed the node exists and
 * supports annotations. The cast to `AnnotatableNode` is safe when the
 * validator contract is satisfied.
 */
function findAnnotatableNode(schemaObj: schema, nodeId: string): AnnotatableNode {
  return locateValidated(schemaObj, nodeId).parent as AnnotatableNode;
}

/**
 * Returns an annotation of the schema root that the validator found.
 *
 * @param annotations - The annotations of the schema
 * @param index - The index of the annotation
 * @param id - The ID in the command, for the error message
 * @returns The annotation
 * @throws Error if there is no annotation at the index
 */
function schemaAnnotationAt(annotations: annotationType[], index: number, id: string): annotationType {
  return assumeValidated(annotations[index] as annotationType | undefined, `Annotation ${index} of the schema (${id})`);
}

/**
 * Returns a documentation entry that the validator found.
 *
 * @param documentations - The documentation entries of an annotation
 * @param index - The index of the entry
 * @param id - The ID in the command, for the error message
 * @returns The documentation entry
 * @throws Error if there is no entry at the index
 */
function documentationAt(documentations: documentationType[], index: number, id: string): documentationType {
  return assumeValidated(documentations[index] as documentationType | undefined, `Documentation ${id}`);
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
 * When `documentation` is provided, all existing xs:documentation children are
 * replaced with a single new element containing the supplied text.
 */
function applyAnnotationModifications(
  annotation: annotationType,
  documentation?: string,
  appInfo?: string
): void {
  if (documentation !== undefined) {
    annotation.documentation = [createDocumentation(documentation)];
  }

  if (appInfo !== undefined) {
    const infos = annotation.appinfo ?? [];
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
 * For the schema root (`targetId: "/schema"`): appends a new xs:annotation to
 * the schema's annotation array. The schema may hold multiple annotations so
 * no duplicate check is performed.
 *
 * For all other annotatable components: creates a new xs:annotation element
 * and assigns it to the component, replacing any existing annotation.
 *
 * This executor assumes that commands have been pre-validated. It does not
 * perform additional runtime checks for target existence, annotatability, or
 * duplicate annotations.
 *
 * @param command - The addAnnotation command to execute
 * @param schemaObj - The schema object to modify
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

  if (isSchemaRoot(targetId)) {
    // Schema allows multiple xs:annotation children — always append.
    schemaObj.annotation = [...schemaObj.annotation ?? [], annotation];
    return;
  }

  const node = findAnnotatableNode(schemaObj, targetId);
  node.annotation = annotation;
}

/**
 * Executes a removeAnnotation command.
 *
 * For the schema root use `annotationId: "/schema/annotation[N]"` to remove
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

  const schemaAnnotationIndex = parseSchemaAnnotationId(annotationId);
  if (schemaAnnotationIndex !== null) {
    const annotations = schemaObj.annotation ?? [];
    assumeValidated(annotations[schemaAnnotationIndex] as annotationType | undefined, `Annotation ${annotationId}`);
    annotations.splice(schemaAnnotationIndex, 1);
    schemaObj.annotation = annotations.length > 0 ? annotations : undefined;
    return;
  }

  const node = findAnnotatableNode(schemaObj, annotationId);
  assumeValidated(node.annotation, `Annotation of ${annotationId}`);
  node.annotation = undefined;
}

/**
 * Executes a modifyAnnotation command.
 *
 * For the schema root use `annotationId: "/schema/annotation[N]"` to modify
 * the N-th annotation.
 *
 * When `documentation` is provided, all existing xs:documentation children
 * are replaced with a single new element containing the supplied text.
 * When `appInfo` is provided the first xs:appinfo child is created-or-updated.
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

  const schemaAnnotationIndex = parseSchemaAnnotationId(annotationId);
  if (schemaAnnotationIndex !== null) {
    const annotations = schemaObj.annotation ?? [];
    applyAnnotationModifications(schemaAnnotationAt(annotations, schemaAnnotationIndex, annotationId), documentation, appInfo);
    return;
  }

  const node = findAnnotatableNode(schemaObj, annotationId);
  applyAnnotationModifications(assumeValidated(node.annotation, `Annotation of ${annotationId}`), documentation, appInfo);
}

// ===== Documentation Executors =====

/**
 * Executes an addDocumentation command.
 *
 * Appends a new xs:documentation element (with optional xml:lang) to the
 * annotation on the target component:
 * - `targetId: "/schema"` — adds to the first schema annotation (creating it
 *   if the schema has none).
 * - `targetId: "/schema/annotation[N]"` — adds to the N-th schema annotation.
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

  if (isSchemaRoot(targetId)) {
    const annotation = getOrCreateFirstSchemaAnnotation(schemaObj);
    annotation.documentation = [...annotation.documentation ?? [], doc];
    return;
  }

  const schemaAnnotationIndex = parseSchemaAnnotationId(targetId);
  if (schemaAnnotationIndex !== null) {
    const annotation = schemaAnnotationAt(schemaObj.annotation ?? [], schemaAnnotationIndex, targetId);
    annotation.documentation = [...annotation.documentation ?? [], doc];
    return;
  }

  const node = findAnnotatableNode(schemaObj, targetId);
  const annotation = ensureAnnotation(node);
  annotation.documentation = [...annotation.documentation ?? [], doc];
}

/**
 * Executes a removeDocumentation command.
 *
 * Accepted `documentationId` formats:
 * - `"/schema/annotation[N]/documentation[M]"` — removes the M-th doc from
 *   the N-th annotation on the schema root.
 * - `"/schema/documentation[N]"` — removes the N-th doc from the first schema
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

  // "/schema/annotation[N]/documentation[M]" format
  const schemaDocumentationId = parseSchemaDocumentationId(documentationId);
  if (schemaDocumentationId) {
    const annotation = schemaAnnotationAt(schemaObj.annotation ?? [], schemaDocumentationId.annotationIndex, documentationId);
    const documentations = annotation.documentation ?? [];
    documentationAt(documentations, schemaDocumentationId.documentationIndex, documentationId);
    documentations.splice(schemaDocumentationId.documentationIndex, 1);
    annotation.documentation = documentations.length > 0 ? documentations : undefined;
    return;
  }

  // "elementPath/documentation[N]" format
  const { elementId, documentationIndex } = parseDocumentationId(documentationId);

  if (isSchemaRoot(elementId)) {
    // "/schema/documentation[N]" shorthand — targets the first schema annotation
    const annotation = schemaAnnotationAt(schemaObj.annotation ?? [], 0, documentationId);
    const documentations = annotation.documentation ?? [];
    documentationAt(documentations, documentationIndex, documentationId);
    documentations.splice(documentationIndex, 1);
    annotation.documentation = documentations.length > 0 ? documentations : undefined;
    return;
  }

  const node = findAnnotatableNode(schemaObj, elementId);
  const annotation = assumeValidated(node.annotation, `Annotation of ${elementId}`);
  const documentations = annotation.documentation ?? [];
  documentationAt(documentations, documentationIndex, documentationId);
  documentations.splice(documentationIndex, 1);
  annotation.documentation = documentations.length > 0 ? documentations : undefined;
}

/**
 * Executes a modifyDocumentation command.
 *
 * Accepted `documentationId` formats:
 * - `"/schema/annotation[N]/documentation[M]"` — updates the M-th doc of the
 *   N-th schema annotation.
 * - `"/schema/documentation[N]"` — updates the N-th doc of the first schema
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

  // "/schema/annotation[N]/documentation[M]" format
  const schemaDocumentationId = parseSchemaDocumentationId(documentationId);
  if (schemaDocumentationId) {
    const annotation = schemaAnnotationAt(schemaObj.annotation ?? [], schemaDocumentationId.annotationIndex, documentationId);
    const documentations = annotation.documentation ?? [];
    applyDocumentationModifications(documentationAt(documentations, schemaDocumentationId.documentationIndex, documentationId), content, lang);
    annotation.documentation = documentations;
    return;
  }

  // "elementPath/documentation[N]" format
  const { elementId, documentationIndex } = parseDocumentationId(documentationId);

  if (isSchemaRoot(elementId)) {
    // "/schema/documentation[N]" shorthand — targets the first schema annotation
    const annotation = schemaAnnotationAt(schemaObj.annotation ?? [], 0, documentationId);
    const documentations = annotation.documentation ?? [];
    applyDocumentationModifications(documentationAt(documentations, documentationIndex, documentationId), content, lang);
    annotation.documentation = documentations;
    return;
  }

  const node = findAnnotatableNode(schemaObj, elementId);
  const annotation = assumeValidated(node.annotation, `Annotation of ${elementId}`);
  const documentations = annotation.documentation ?? [];
  applyDocumentationModifications(documentationAt(documentations, documentationIndex, documentationId), content, lang);
  annotation.documentation = documentations;
}

/**
 * Applies content and/or lang changes to a single xs:documentation element.
 * Pass `lang: ""` to remove the xml:lang attribute.
 */
function applyDocumentationModifications(
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
