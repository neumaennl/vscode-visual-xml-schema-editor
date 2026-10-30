/**
 * Central export point for all command types.
 * This module consolidates all command definitions and exports the SchemaCommand union type.
 */

// Re-export base types
export * from "./base.js";

// Re-export all command modules
export * from "./element.js";
export * from "./attribute.js";
export * from "./schemaTypes.js";
export * from "./group.js";
export * from "./metadata.js";
export * from "./module.js";

// Import command types for union
import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
} from "./element.js";
import {
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "./attribute.js";
import {
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "./schemaTypes.js";
import {
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "./group.js";
import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "./metadata.js";
import {
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
  ModifySchemaNamespacesCommand,
} from "./module.js";

/**
 * Union type of all possible commands.
 * This allows for type-safe command handling with discriminated unions.
 */
export type SchemaCommand =
  | AddElementCommand
  | RemoveElementCommand
  | ModifyElementCommand
  | AddAttributeCommand
  | RemoveAttributeCommand
  | ModifyAttributeCommand
  | AddSimpleTypeCommand
  | RemoveSimpleTypeCommand
  | ModifySimpleTypeCommand
  | AddComplexTypeCommand
  | RemoveComplexTypeCommand
  | ModifyComplexTypeCommand
  | AddGroupCommand
  | RemoveGroupCommand
  | ModifyGroupCommand
  | AddAttributeGroupCommand
  | RemoveAttributeGroupCommand
  | ModifyAttributeGroupCommand
  | AddAnnotationCommand
  | RemoveAnnotationCommand
  | ModifyAnnotationCommand
  | AddDocumentationCommand
  | RemoveDocumentationCommand
  | ModifyDocumentationCommand
  | AddImportCommand
  | RemoveImportCommand
  | ModifyImportCommand
  | AddIncludeCommand
  | RemoveIncludeCommand
  | ModifyIncludeCommand
  | ModifySchemaNamespacesCommand;
