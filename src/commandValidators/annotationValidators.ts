/**
 * Validators for annotation commands (Annotation and Documentation).
 *
 * ID conventions supported:
 * - For non-schema annotatable nodes: nodeId (e.g. "/element:person")
 * - For schema-root annotations (multiple allowed):
 *   annotationId = "/schema/annotation[N]"
 *   documentationId = "/schema/annotation[N]/documentation[M]" or "/schema/documentation[N]"
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
} from "../../shared/types.js";
import { ValidationResult } from "./validationUtils.js";
import { locateNodeById } from "../schemaNavigator.js";
import { isSchemaRoot } from "../../shared/schemaUtils.js";
import {
  parseDocumentationId,
  parseSchemaAnnotationId,
  parseSchemaDocumentationId,
} from "../commandUtils.js";

// ===== Internal helpers =====


/** Type guard: returns true when `node` exposes an `annotation` property. */
function hasAnnotationProperty(
  node: unknown
): node is { annotation?: annotationType } {
  return typeof node === "object" && node !== null && "annotation" in node;
}

/**
 * Locates the non-schema component that `nodeId` identifies, if it exists and supports annotations
 * (i.e. has an `annotation` property).
 *
 * @param schemaObj - The schema
 * @param nodeId - The ID of the component
 * @returns The component, or `undefined` if it does not exist or does not support annotations
 */
function locateAnnotatable(schemaObj: schema, nodeId: string): { annotation?: annotationType } | undefined {
  const location = locateNodeById(schemaObj, nodeId);
  return location.found && hasAnnotationProperty(location.parent) ? location.parent : undefined;
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

  const target = locateAnnotatable(schemaObj, command.payload.targetId);
  if (!target) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${command.payload.targetId}`,
    };
  }
  if (target.annotation) {
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
      error: `Use "/schema/annotation[N]" to remove a specific schema-root annotation: ${command.payload.annotationId}`,
    };
  }

  const schemaAnnotationIndex = parseSchemaAnnotationId(command.payload.annotationId);
  if (schemaAnnotationIndex !== null) {
    const annotations = schemaObj.annotation ?? [];
    if (schemaAnnotationIndex < 0 || schemaAnnotationIndex >= annotations.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaAnnotationIndex} out of bounds (length ${annotations.length}): ${command.payload.annotationId}`,
      };
    }
    return { valid: true };
  }

  const target = locateAnnotatable(schemaObj, command.payload.annotationId);
  if (!target) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${command.payload.annotationId}`,
    };
  }
  if (!target.annotation) {
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
      error: `Use "/schema/annotation[N]" to modify a specific schema-root annotation: ${command.payload.annotationId}`,
    };
  }

  const schemaAnnotationIndex = parseSchemaAnnotationId(command.payload.annotationId);
  if (schemaAnnotationIndex !== null) {
    const annotations = schemaObj.annotation ?? [];
    if (schemaAnnotationIndex < 0 || schemaAnnotationIndex >= annotations.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaAnnotationIndex} out of bounds (length ${annotations.length}): ${command.payload.annotationId}`,
      };
    }
    return { valid: true };
  }

  const target = locateAnnotatable(schemaObj, command.payload.annotationId);
  if (!target) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${command.payload.annotationId}`,
    };
  }
  if (!target.annotation) {
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

  const schemaAnnotationIndex = parseSchemaAnnotationId(command.payload.targetId);
  if (schemaAnnotationIndex !== null) {
    const annotations = schemaObj.annotation ?? [];
    if (schemaAnnotationIndex >= annotations.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaAnnotationIndex} out of bounds (length ${annotations.length}): ${command.payload.targetId}`,
      };
    }
    return { valid: true };
  }

  if (!locateAnnotatable(schemaObj, command.payload.targetId)) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${command.payload.targetId}`,
    };
  }
  return { valid: true };
}

/**
 * Validates a documentation ID: `/schema/annotation[N]/documentation[M]`, the shorthand
 * `/schema/documentation[M]` for the first schema annotation, or `<component ID>/documentation[M]`.
 * Used by both validateRemoveDocumentation and validateModifyDocumentation.
 *
 * @param documentationId - The documentation ID
 * @param schemaObj - The schema
 * @returns The validation result
 */
function validateDocumentationId(documentationId: string, schemaObj: schema): ValidationResult {
  if (!documentationId.trim()) {
    return { valid: false, error: "Documentation ID cannot be empty" };
  }

  // "/schema/annotation[N]/documentation[M]" format
  const schemaDocumentationId = parseSchemaDocumentationId(documentationId);
  if (schemaDocumentationId) {
    const annotations = schemaObj.annotation ?? [];
    if (schemaDocumentationId.annotationIndex >= annotations.length) {
      return {
        valid: false,
        error: `Annotation index ${schemaDocumentationId.annotationIndex} out of bounds (length ${annotations.length}): ${documentationId}`,
      };
    }
    const documentations = annotations[schemaDocumentationId.annotationIndex].documentation ?? [];
    return validateDocumentationIndex(schemaDocumentationId.documentationIndex, documentations.length, documentationId);
  }

  // "elementPath/documentation[N]" format
  let elementId: string;
  let documentationIndex: number;
  try {
    ({ elementId, documentationIndex } = parseDocumentationId(documentationId));
  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }

  // "/schema/documentation[N]" shorthand — targets first schema annotation
  if (isSchemaRoot(elementId)) {
    const annotations = schemaObj.annotation ?? [];
    if (annotations.length === 0) {
      return { valid: false, error: `No annotation found on schema root` };
    }
    const documentations = annotations[0].documentation ?? [];
    return validateDocumentationIndex(documentationIndex, documentations.length, documentationId);
  }

  const target = locateAnnotatable(schemaObj, elementId);
  if (!target) {
    return {
      valid: false,
      error: `Target node not found or does not support annotations: ${elementId}`,
    };
  }
  if (!target.annotation) {
    return { valid: false, error: `No annotation found on node: ${elementId}` };
  }
  const documentations = target.annotation.documentation ?? [];
  return validateDocumentationIndex(documentationIndex, documentations.length, documentationId);
}

/**
 * Validates that a documentation index refers to an existing documentation entry. The ID parsers only
 * accept digits, so the index is never negative.
 *
 * @param documentationIndex - The index from the documentation ID
 * @param count - The number of documentation entries of the annotation
 * @param documentationId - The documentation ID, for the error message
 * @returns The validation result
 */
function validateDocumentationIndex(documentationIndex: number, count: number, documentationId: string): ValidationResult {
  if (documentationIndex >= count) {
    return {
      valid: false,
      error: `Documentation index ${documentationIndex} out of bounds (length ${count}): ${documentationId}`,
    };
  }
  return { valid: true };
}

export function validateRemoveDocumentation(
  command: RemoveDocumentationCommand,
  schemaObj: schema
): ValidationResult {
  return validateDocumentationId(command.payload.documentationId, schemaObj);
}

export function validateModifyDocumentation(
  command: ModifyDocumentationCommand,
  schemaObj: schema
): ValidationResult {
  return validateDocumentationId(command.payload.documentationId, schemaObj);
}
