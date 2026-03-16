/**
 * Validators for annotation commands (Annotation and Documentation).
 *
 * ID conventions supported:
 * - For non-schema annotatable nodes: nodeId (e.g. "/element:person")
 * - For schema-root annotations (multiple allowed):
 *   annotationId = "schema/annotation[N]"
 *   documentationId = "schema/annotation[N]/documentation[M]" or "schema/documentation[N]"
 *
 * Note on references: xs:annotation, xs:documentation, and xs:appinfo do NOT
 * support a `ref` attribute in the XSD specification. They are always inline
 * elements, so no reference validation is needed or implemented.
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
} from "../../shared/types";
import { ValidationResult } from "./validationUtils";
import { locateNodeById } from "../schemaNavigator";
import { toArray, isSchemaRoot } from "../../shared/schemaUtils";
import {
  parseDocumentationId,
  parseSchemaAnnotationId,
  parseSchemaDocumentationId,
} from "../commandUtils";

// ===== Internal helpers =====


/** Type guard: returns true when `node` exposes an `annotation` property. */
function hasAnnotationProperty(
  node: unknown
): node is { annotation?: annotationType } {
  return typeof node === "object" && node !== null && "annotation" in node;
}

/**
 * Returns true when `nodeId` resolves to a non-schema schema component that
 * has an `annotation` property (i.e. supports xs:annotation children).
 */
function annotationNodeExists(schemaObj: schema, nodeId: string): boolean {
  const location = locateNodeById(schemaObj, nodeId);
  return location.found && hasAnnotationProperty(location.parent);
}

/**
 * Returns true when the non-schema component identified by `nodeId` currently
 * has an xs:annotation child element.
 */
function annotationExists(schemaObj: schema, nodeId: string): boolean {
  const location = locateNodeById(schemaObj, nodeId);
  if (!location.found || !hasAnnotationProperty(location.parent)) {
    return false;
  }
  return location.parent.annotation !== undefined && location.parent.annotation !== null;
}

// ===== Annotation Command Validation =====

export function validateAddAnnotation(
  command: AddAnnotationCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.targetId.trim()) {
    return { valid: false, error: "Target ID cannot be empty" };
  }

  if (isSchemaRoot(command.payload.targetId)) {
    // Schema root allows multiple xs:annotation children — always valid
    return { valid: true };
  }

  if (!annotationNodeExists(schemaObj, command.payload.targetId)) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${command.payload.targetId}`,
    };
  }
  if (annotationExists(schemaObj, command.payload.targetId)) {
    return {
      valid: false,
      error: `Node already has an annotation: ${command.payload.targetId}. Use modifyAnnotation to update it.`,
    };
  }
  return { valid: true };
}

export function validateRemoveAnnotation(
  command: RemoveAnnotationCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.annotationId.trim()) {
    return { valid: false, error: "Annotation ID cannot be empty" };
  }

  if (isSchemaRoot(command.payload.annotationId)) {
    return {
      valid: false,
      error: `Use "schema/annotation[N]" to remove a specific schema-root annotation: ${command.payload.annotationId}`,
    };
  }

  const schemaAnnotIdx = parseSchemaAnnotationId(command.payload.annotationId);
  if (schemaAnnotIdx !== null) {
    const annots = toArray(schemaObj.annotation);
    if (schemaAnnotIdx < 0 || schemaAnnotIdx >= annots.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaAnnotIdx} out of bounds (length ${annots.length}): ${command.payload.annotationId}`,
      };
    }
    return { valid: true };
  }

  if (!annotationNodeExists(schemaObj, command.payload.annotationId)) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${command.payload.annotationId}`,
    };
  }
  if (!annotationExists(schemaObj, command.payload.annotationId)) {
    return {
      valid: false,
      error: `No annotation found on node: ${command.payload.annotationId}`,
    };
  }
  return { valid: true };
}

export function validateModifyAnnotation(
  command: ModifyAnnotationCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.annotationId.trim()) {
    return { valid: false, error: "Annotation ID cannot be empty" };
  }

  if (isSchemaRoot(command.payload.annotationId)) {
    return {
      valid: false,
      error: `Use "schema/annotation[N]" to modify a specific schema-root annotation: ${command.payload.annotationId}`,
    };
  }

  const schemaAnnotIdx = parseSchemaAnnotationId(command.payload.annotationId);
  if (schemaAnnotIdx !== null) {
    const annots = toArray(schemaObj.annotation);
    if (schemaAnnotIdx < 0 || schemaAnnotIdx >= annots.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaAnnotIdx} out of bounds (length ${annots.length}): ${command.payload.annotationId}`,
      };
    }
    return { valid: true };
  }

  if (!annotationNodeExists(schemaObj, command.payload.annotationId)) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${command.payload.annotationId}`,
    };
  }
  if (!annotationExists(schemaObj, command.payload.annotationId)) {
    return {
      valid: false,
      error: `No annotation found on node: ${command.payload.annotationId}`,
    };
  }
  return { valid: true };
}

// ===== Documentation Command Validation =====

export function validateAddDocumentation(
  command: AddDocumentationCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.targetId.trim()) {
    return { valid: false, error: "Target ID cannot be empty" };
  }

  if (isSchemaRoot(command.payload.targetId)) {
    // Schema root always accepts addDocumentation (creates annotation if needed)
    return { valid: true };
  }

  const schemaAnnotIdx = parseSchemaAnnotationId(command.payload.targetId);
  if (schemaAnnotIdx !== null) {
    const annots = toArray(schemaObj.annotation);
    if (schemaAnnotIdx >= annots.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaAnnotIdx} out of bounds (length ${annots.length}): ${command.payload.targetId}`,
      };
    }
    return { valid: true };
  }

  if (!annotationNodeExists(schemaObj, command.payload.targetId)) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${command.payload.targetId}`,
    };
  }
  return { valid: true };
}

export function validateRemoveDocumentation(
  command: RemoveDocumentationCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.documentationId.trim()) {
    return { valid: false, error: "Documentation ID cannot be empty" };
  }

  // "schema/annotation[N]/documentation[M]" format
  const schemaDId = parseSchemaDocumentationId(command.payload.documentationId);
  if (schemaDId) {
    const annots = toArray(schemaObj.annotation);
    if (schemaDId.annotIndex >= annots.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaDId.annotIndex} out of bounds (length ${annots.length}): ${command.payload.documentationId}`,
      };
    }
    const docs = toArray(annots[schemaDId.annotIndex].documentation);
    if (schemaDId.docIndex < 0 || schemaDId.docIndex >= docs.length) {
      return {
        valid: false,
        error: `Documentation index ${schemaDId.docIndex} out of bounds (length ${docs.length}): ${command.payload.documentationId}`,
      };
    }
    return { valid: true };
  }

  // "elementPath/documentation[N]" format
  let elementId: string;
  let docIndex: number;
  try {
    ({ elementId, docIndex } = parseDocumentationId(command.payload.documentationId));
  } catch (e) {
    return {
      valid: false,
      error: `Invalid documentationId format — expected "{elementPath}/documentation[N]": ${command.payload.documentationId}${e instanceof Error ? ` (${e.message})` : ""}`,
    };
  }

  // "schema/documentation[N]" shorthand — targets first schema annotation
  if (isSchemaRoot(elementId)) {
    const annots = toArray(schemaObj.annotation);
    if (annots.length === 0) {
      return { valid: false, error: `No annotation found on schema root` };
    }
    const docs = toArray(annots[0].documentation);
    if (docIndex < 0 || docIndex >= docs.length) {
      return {
        valid: false,
        error: `Documentation index ${docIndex} out of bounds (length ${docs.length}): ${command.payload.documentationId}`,
      };
    }
    return { valid: true };
  }

  if (!annotationNodeExists(schemaObj, elementId)) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${elementId}`,
    };
  }

  const location = locateNodeById(schemaObj, elementId);
  if (!hasAnnotationProperty(location.parent) || !location.parent.annotation) {
    return { valid: false, error: `No annotation found on node: ${elementId}` };
  }
  const docs = toArray(location.parent.annotation.documentation);
  if (docIndex < 0 || docIndex >= docs.length) {
    return {
      valid: false,
      error: `Documentation index ${docIndex} out of bounds (length ${docs.length}): ${command.payload.documentationId}`,
    };
  }

  return { valid: true };
}

export function validateModifyDocumentation(
  command: ModifyDocumentationCommand,
  schemaObj: schema
): ValidationResult {
  if (!command.payload.documentationId.trim()) {
    return { valid: false, error: "Documentation ID cannot be empty" };
  }

  // "schema/annotation[N]/documentation[M]" format
  const schemaDId = parseSchemaDocumentationId(command.payload.documentationId);
  if (schemaDId) {
    const annots = toArray(schemaObj.annotation);
    if (schemaDId.annotIndex >= annots.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaDId.annotIndex} out of bounds (length ${annots.length}): ${command.payload.documentationId}`,
      };
    }
    const docs = toArray(annots[schemaDId.annotIndex].documentation);
    if (schemaDId.docIndex < 0 || schemaDId.docIndex >= docs.length) {
      return {
        valid: false,
        error: `Documentation index ${schemaDId.docIndex} out of bounds (length ${docs.length}): ${command.payload.documentationId}`,
      };
    }
    return { valid: true };
  }

  // "elementPath/documentation[N]" format
  let elementId: string;
  let docIndex: number;
  try {
    ({ elementId, docIndex } = parseDocumentationId(command.payload.documentationId));
  } catch (e) {
    return {
      valid: false,
      error: `Invalid documentationId format — expected "{elementPath}/documentation[N]": ${command.payload.documentationId}${e instanceof Error ? ` (${e.message})` : ""}`,
    };
  }

  // "schema/documentation[N]" shorthand — targets first schema annotation
  if (isSchemaRoot(elementId)) {
    const annots = toArray(schemaObj.annotation);
    if (annots.length === 0) {
      return { valid: false, error: `No annotation found on schema root` };
    }
    const docs = toArray(annots[0].documentation);
    if (docIndex < 0 || docIndex >= docs.length) {
      return {
        valid: false,
        error: `Documentation index ${docIndex} out of bounds (length ${docs.length}): ${command.payload.documentationId}`,
      };
    }
    return { valid: true };
  }

  if (!annotationNodeExists(schemaObj, elementId)) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${elementId}`,
    };
  }

  const location = locateNodeById(schemaObj, elementId);
  if (!hasAnnotationProperty(location.parent) || !location.parent.annotation) {
    return { valid: false, error: `No annotation found on node: ${elementId}` };
  }
  const docs = toArray(location.parent.annotation.documentation);
  if (docIndex < 0 || docIndex >= docs.length) {
    return {
      valid: false,
      error: `Documentation index ${docIndex} out of bounds (length ${docs.length}): ${command.payload.documentationId}`,
    };
  }

  return { valid: true };
}
