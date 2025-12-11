/**
 * Validators for annotation commands (Annotation and Documentation).
 */

import {
  schema,
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "../../shared/types";
import { ValidationResult } from "./validationUtils";

// ===== Annotation Command Validation =====

export function validateAddAnnotation(
  command: AddAnnotationCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.targetId.trim()) {
    return { valid: false, error: "Target ID cannot be empty" };
  }
  // TODO Phase 2: Validate that targetId exists in schema
  return { valid: true };
}

export function validateRemoveAnnotation(
  command: RemoveAnnotationCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.annotationId.trim()) {
    return { valid: false, error: "Annotation ID cannot be empty" };
  }
  // TODO Phase 2: Validate that annotationId exists in schema
  return { valid: true };
}

export function validateModifyAnnotation(
  command: ModifyAnnotationCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.annotationId.trim()) {
    return { valid: false, error: "Annotation ID cannot be empty" };
  }
  // TODO Phase 2: Validate that annotationId exists in schema
  return { valid: true };
}

// ===== Documentation Command Validation =====

export function validateAddDocumentation(
  command: AddDocumentationCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.targetId.trim()) {
    return { valid: false, error: "Target ID cannot be empty" };
  }
  // TODO Phase 2: Validate that targetId exists in schema
  return { valid: true };
}

export function validateRemoveDocumentation(
  command: RemoveDocumentationCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.documentationId.trim()) {
    return { valid: false, error: "Documentation ID cannot be empty" };
  }
  // TODO Phase 2: Validate that documentationId exists in schema
  return { valid: true };
}

export function validateModifyDocumentation(
  command: ModifyDocumentationCommand,
  _schemaObj: schema
): ValidationResult {
  if (!command.payload.documentationId.trim()) {
    return { valid: false, error: "Documentation ID cannot be empty" };
  }
  // TODO Phase 2: Validate that documentationId exists in schema
  return { valid: true };
}
