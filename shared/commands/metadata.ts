/**
 * Metadata command types for managing annotations and documentation.
 * Provides commands for adding descriptive information to schema components.
 */

import { BaseCommand } from "./base";

/**
 * Payload for adding an annotation.
 */
export interface AddAnnotationPayload {
  /** ID of the target element/type */
  targetId: string;
  /** Documentation content */
  documentation?: string;
  /** Application information content */
  appInfo?: string;
}

/**
 * Command to add an annotation.
 */
export interface AddAnnotationCommand extends BaseCommand<AddAnnotationPayload> {
  type: "addAnnotation";
  payload: AddAnnotationPayload;
}

/**
 * Payload for removing an annotation.
 */
export interface RemoveAnnotationPayload {
  /** ID of the annotation to remove */
  annotationId: string;
}

/**
 * Command to remove an annotation.
 */
export interface RemoveAnnotationCommand extends BaseCommand<RemoveAnnotationPayload> {
  type: "removeAnnotation";
  payload: RemoveAnnotationPayload;
}

/**
 * Payload for modifying an annotation.
 */
export interface ModifyAnnotationPayload {
  /** ID of the annotation to modify */
  annotationId: string;
  /** New documentation content (optional) */
  documentation?: string;
  /** New application information (optional) */
  appInfo?: string;
}

/**
 * Command to modify an annotation.
 */
export interface ModifyAnnotationCommand extends BaseCommand<ModifyAnnotationPayload> {
  type: "modifyAnnotation";
  payload: ModifyAnnotationPayload;
}

/**
 * Payload for adding documentation to a schema component.
 */
export interface AddDocumentationPayload {
  /** ID of the target element/type */
  targetId: string;
  /** Documentation content */
  content: string;
  /** Language code (optional) */
  lang?: string;
}

/**
 * Command to add documentation.
 */
export interface AddDocumentationCommand extends BaseCommand<AddDocumentationPayload> {
  type: "addDocumentation";
  payload: AddDocumentationPayload;
}

/**
 * Payload for removing documentation.
 */
export interface RemoveDocumentationPayload {
  /** ID of the documentation to remove */
  documentationId: string;
}

/**
 * Command to remove documentation.
 */
export interface RemoveDocumentationCommand extends BaseCommand<RemoveDocumentationPayload> {
  type: "removeDocumentation";
  payload: RemoveDocumentationPayload;
}

/**
 * Payload for modifying documentation.
 */
export interface ModifyDocumentationPayload {
  /** ID of the documentation to modify */
  documentationId: string;
  /** New documentation content (optional) */
  content?: string;
  /** New language code (optional) */
  lang?: string;
}

/**
 * Command to modify documentation.
 */
export interface ModifyDocumentationCommand extends BaseCommand<ModifyDocumentationPayload> {
  type: "modifyDocumentation";
  payload: ModifyDocumentationPayload;
}
