/**
 * Validators for annotation commands (Annotation and Documentation).
 *
 * ID conventions supported:
 * - For non-schema annotatable nodes: `nodeId` (e.g. `"/element:person"`)
 * - For schema-root annotations (multiple allowed):
 *   `annotationId` = `"/schema/annotation[N]"`
 *   `documentationId` = `"/schema/annotation[N]/documentation[M]"` or `"/schema/documentation[N]"`
 *
 * Note on references: `xs:annotation`, `xs:documentation`, and `xs:appinfo` do NOT
 * support a `ref` attribute in the XSD specification. They are always inline
 * elements, so no reference validation is needed or implemented.
 */

import type {
  schema,
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
  annotationType,
} from "../../shared/types.js";
import type { ValidationFailure, ValidationResult, ValidationResultWith } from "../../shared/validation.js";
import { locateNodeById } from "../schemaNavigator.js";
import { isSchemaRoot } from "../../shared/idStrategy.js";
import { validateLanguage } from "../../shared/languages.js";
import { parseDocumentationId, parseSchemaAnnotationId, parseSchemaDocumentationId } from "../commandUtils.js";
import type { AnnotatableNode } from "../../shared/schemaObjects.js";

// ===== Internal helpers =====

/**
 * Locates the non-schema component that `nodeId` identifies. Every component that the navigator finds,
 * except the schema, holds at most one annotation; the schema holds a list and is handled by the callers.
 *
 * @param schemaObj - The schema
 * @param nodeId - The ID of the component
 * @returns The component, or the validation failure if it does not exist or does not support annotations
 */
function locateAnnotatable(schemaObj: schema, nodeId: string): ValidationResultWith<{ target: AnnotatableNode }> {
  const location = locateNodeById(schemaObj, nodeId);
  if (!location.found || location.parentType === "schema") {
    return { valid: false, error: `Target node not found or does not support annotations: ${nodeId}` };
  }
  return { valid: true, target: location.parent as AnnotatableNode };
}

/**
 * Locates the annotation of the non-schema component that `nodeId` identifies.
 *
 * @param schemaObj - The schema
 * @param nodeId - The ID of the component
 * @returns The annotation, or the validation failure if the component does not exist, does not support
 * annotations or has none
 */
function locateAnnotation(
  schemaObj: schema,
  nodeId: string
): ValidationFailure | { valid: true; annotation: annotationType } {
  const located = locateAnnotatable(schemaObj, nodeId);
  if (!located.valid) {
    return located;
  }
  if (!located.target.annotation) {
    return { valid: false, error: `No annotation found on node: ${nodeId}` };
  }
  return { valid: true, annotation: located.target.annotation };
}

// ===== Annotation Command Validation =====

/**
 * Validates the target of `addAnnotation` or `addDocumentation`: the schema root, which can hold several
 * annotations and gets one for new documentation if needed, or a component that supports annotations.
 *
 * @param targetId - The ID of the target
 * @param schemaObj - The schema
 * @param checkComponent - Further checks of a target that is a component
 * @returns The validation result
 */
function validateAddTarget(
  targetId: string,
  schemaObj: schema,
  checkComponent: (target: AnnotatableNode) => ValidationResult
): ValidationResult {
  if (!targetId.trim()) {
    return { valid: false, error: "Target ID cannot be empty" };
  }
  if (isSchemaRoot(targetId)) {
    return { valid: true };
  }
  const located = locateAnnotatable(schemaObj, targetId);
  return located.valid ? checkComponent(located.target) : located;
}

/**
 * Validates an `addAnnotation` command: the target is the schema root, which can hold several
 * annotations, or an existing component that supports annotations and has none yet.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateAddAnnotation(command: AddAnnotationCommand, schemaObj: schema): ValidationResult {
  const targetId = command.payload.targetId;
  return validateAddTarget(targetId, schemaObj, (target) =>
    target.annotation
      ? { valid: false, error: `Node already has an annotation: ${targetId}. Use modifyAnnotation to update it.` }
      : { valid: true }
  );
}

/**
 * Validates that an annotation index of the schema root refers to an existing annotation. The ID
 * parsers only accept digits, so the index is never negative.
 *
 * @param annotationIndex - The index from the ID
 * @param schemaObj - The schema
 * @param id - The ID, for the error message
 * @returns The validation result
 */
function validateSchemaAnnotationIndex(annotationIndex: number, schemaObj: schema, id: string): ValidationResult {
  const count = schemaObj.annotation?.length ?? 0;
  if (annotationIndex >= count) {
    return {
      valid: false,
      error: `Annotation index ${annotationIndex} out of bounds (length ${count}): ${id}`,
    };
  }
  return { valid: true };
}

/**
 * Validates the ID of an existing annotation: `/schema/annotation[N]` for an annotation of the schema
 * root, or the ID of an annotated component. Used by `validateRemoveAnnotation` and
 * `validateModifyAnnotation`.
 *
 * @param annotationId - The annotation ID
 * @param schemaObj - The schema
 * @param action - What the command does with the annotation, for the error message
 * @returns The validation result
 */
function validateAnnotationId(annotationId: string, schemaObj: schema, action: "remove" | "modify"): ValidationResult {
  if (!annotationId.trim()) {
    return { valid: false, error: "Annotation ID cannot be empty" };
  }

  if (isSchemaRoot(annotationId)) {
    return {
      valid: false,
      error: `Use "/schema/annotation[N]" to ${action} a specific schema-root annotation: ${annotationId}`,
    };
  }

  const schemaAnnotationIndex = parseSchemaAnnotationId(annotationId);
  if (schemaAnnotationIndex !== null) {
    return validateSchemaAnnotationIndex(schemaAnnotationIndex, schemaObj, annotationId);
  }

  const located = locateAnnotation(schemaObj, annotationId);
  return located.valid ? { valid: true } : located;
}

/**
 * Validates a `removeAnnotation` command: the annotation must exist (see {@link validateAnnotationId}).
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveAnnotation(command: RemoveAnnotationCommand, schemaObj: schema): ValidationResult {
  return validateAnnotationId(command.payload.annotationId, schemaObj, "remove");
}

/**
 * Validates a `modifyAnnotation` command: the annotation must exist (see {@link validateAnnotationId}).
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyAnnotation(command: ModifyAnnotationCommand, schemaObj: schema): ValidationResult {
  return validateAnnotationId(command.payload.annotationId, schemaObj, "modify");
}

// ===== Documentation Command Validation =====

/**
 * Validates the language of a documentation command. Without a language, or with an empty one, the
 * documentation has no `xml:lang`.
 *
 * @param lang - The language of the payload
 * @returns The validation result
 */
function validateOptionalLanguage(lang: string | undefined): ValidationResult {
  return lang ? validateLanguage(lang) : { valid: true };
}

/**
 * Validates an `addDocumentation` command: the language, if any, is a language code, and the target is an
 * existing annotation of the schema root, the schema root, or an existing component that supports
 * annotations.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateAddDocumentation(command: AddDocumentationCommand, schemaObj: schema): ValidationResult {
  const languageResult = validateOptionalLanguage(command.payload.lang);
  if (!languageResult.valid) {
    return languageResult;
  }
  const targetId = command.payload.targetId;
  const schemaAnnotationIndex = parseSchemaAnnotationId(targetId);
  if (schemaAnnotationIndex !== null) {
    return validateSchemaAnnotationIndex(schemaAnnotationIndex, schemaObj, targetId);
  }
  return validateAddTarget(targetId, schemaObj, () => ({ valid: true }));
}

/**
 * Validates a documentation ID: `/schema/annotation[N]/documentation[M]`, the shorthand
 * `/schema/documentation[M]` for the first schema annotation, or `<component ID>/documentation[M]`.
 * Used by both `validateRemoveDocumentation` and `validateModifyDocumentation`.
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
    const indexResult = validateSchemaAnnotationIndex(
      schemaDocumentationId.annotationIndex,
      schemaObj,
      documentationId
    );
    if (!indexResult.valid) {
      return indexResult;
    }
    // validateSchemaAnnotationIndex() has checked that the annotation exists
    const documentations = schemaObj.annotation?.[schemaDocumentationId.annotationIndex]?.documentation ?? [];
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
    const firstAnnotation = schemaObj.annotation?.[0];
    if (!firstAnnotation) {
      return { valid: false, error: `No annotation found on schema root` };
    }
    const documentations = firstAnnotation.documentation ?? [];
    return validateDocumentationIndex(documentationIndex, documentations.length, documentationId);
  }

  const located = locateAnnotation(schemaObj, elementId);
  if (!located.valid) {
    return located;
  }
  const documentations = located.annotation.documentation ?? [];
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
function validateDocumentationIndex(
  documentationIndex: number,
  count: number,
  documentationId: string
): ValidationResult {
  if (documentationIndex >= count) {
    return {
      valid: false,
      error: `Documentation index ${documentationIndex} out of bounds (length ${count}): ${documentationId}`,
    };
  }
  return { valid: true };
}

/**
 * Validates a `removeDocumentation` command: the documentation must exist (see
 * {@link validateDocumentationId}).
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateRemoveDocumentation(command: RemoveDocumentationCommand, schemaObj: schema): ValidationResult {
  return validateDocumentationId(command.payload.documentationId, schemaObj);
}

/**
 * Validates a `modifyDocumentation` command: the language, if any, is a language code, and the
 * documentation must exist (see {@link validateDocumentationId}). An empty language removes `xml:lang`.
 *
 * @param command - The command
 * @param schemaObj - The schema
 * @returns The validation result
 */
export function validateModifyDocumentation(command: ModifyDocumentationCommand, schemaObj: schema): ValidationResult {
  const languageResult = validateOptionalLanguage(command.payload.lang);
  if (!languageResult.valid) {
    return languageResult;
  }
  return validateDocumentationId(command.payload.documentationId, schemaObj);
}
