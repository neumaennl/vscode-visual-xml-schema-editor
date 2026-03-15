/**
 * Validators for annotation commands (Annotation and Documentation).
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
import { toArray } from "../../shared/schemaUtils";
import { parseDocumentationId } from "../commandExecutors/annotationExecutors";

// ===== Internal helpers =====

/** Type guard: returns true when `node` exposes an `annotation` property. */
function hasAnnotationProperty(
  node: unknown
): node is { annotation?: annotationType } {
  return typeof node === "object" && node !== null && "annotation" in node;
}

/**
 * Returns true when `nodeId` resolves to a schema component that has an
 * `annotation` property (i.e. supports xs:annotation children).
 */
function annotationNodeExists(schemaObj: schema, nodeId: string): boolean {
  const location = locateNodeById(schemaObj, nodeId);
  return location.found && hasAnnotationProperty(location.parent);
}

/**
 * Returns true when the schema component identified by `nodeId` currently
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
