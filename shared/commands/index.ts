/**
 * Central export point for all command types.
 * This module consolidates all command definitions and exports the SchemaCommand union type.
 */

// Re-export base types
export * from "./base";

// Re-export all command modules
export * from "./element";
export * from "./attribute";
export * from "./schemaTypes";
export * from "./group";
export * from "./metadata";
export * from "./module";

// Import command types for union
import {
  AddElementCommand,
  RemoveElementCommand,
  ModifyElementCommand,
} from "./element";
import {
  AddAttributeCommand,
  RemoveAttributeCommand,
  ModifyAttributeCommand,
} from "./attribute";
import {
  AddSimpleTypeCommand,
  RemoveSimpleTypeCommand,
  ModifySimpleTypeCommand,
  AddComplexTypeCommand,
  RemoveComplexTypeCommand,
  ModifyComplexTypeCommand,
} from "./schemaTypes";
import {
  AddGroupCommand,
  RemoveGroupCommand,
  ModifyGroupCommand,
  AddAttributeGroupCommand,
  RemoveAttributeGroupCommand,
  ModifyAttributeGroupCommand,
} from "./group";
import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  ModifyAnnotationCommand,
  AddDocumentationCommand,
  RemoveDocumentationCommand,
  ModifyDocumentationCommand,
} from "./metadata";
import {
  AddImportCommand,
  RemoveImportCommand,
  ModifyImportCommand,
  AddIncludeCommand,
  RemoveIncludeCommand,
  ModifyIncludeCommand,
} from "./module";

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
  | ModifyIncludeCommand;
