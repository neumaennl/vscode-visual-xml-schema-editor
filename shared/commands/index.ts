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

// Import the commands of each area for the union
import type { ElementCommand } from "./element.js";
import type { AttributeCommand } from "./attribute.js";
import type { SimpleTypeCommand, ComplexTypeCommand } from "./schemaTypes.js";
import type { GroupCommand, AttributeGroupCommand } from "./group.js";
import type { AnnotationCommand, DocumentationCommand } from "./metadata.js";
import type { ImportCommand, IncludeCommand, ModifySchemaNamespacesCommand } from "./module.js";

/**
 * Union type of all possible commands.
 * This allows for type-safe command handling with discriminated unions.
 */
export type SchemaCommand =
  | ElementCommand
  | AttributeCommand
  | SimpleTypeCommand
  | ComplexTypeCommand
  | GroupCommand
  | AttributeGroupCommand
  | AnnotationCommand
  | DocumentationCommand
  | ImportCommand
  | IncludeCommand
  | ModifySchemaNamespacesCommand;
