/**
 * Central export point for all command types.
 * This module consolidates all command definitions and exports the `SchemaCommand` union type.
 */

// Re-export base types
export * from "./base.js";

// Re-export all command modules
export * from "./element.js";
export * from "./attribute.js";
export * from "./simpleType.js";
export * from "./complexType.js";
export * from "./group.js";
export * from "./attributeGroup.js";
export * from "./annotation.js";
export * from "./schema.js";

// Import the commands of each area for the union
import type { ElementCommand } from "./element.js";
import type { AttributeCommand } from "./attribute.js";
import type { SimpleTypeCommand } from "./simpleType.js";
import type { ComplexTypeCommand } from "./complexType.js";
import type { GroupCommand } from "./group.js";
import type { AttributeGroupCommand } from "./attributeGroup.js";
import type { AnnotationCommand, DocumentationCommand } from "./annotation.js";
import type { ImportCommand, IncludeCommand, ModifySchemaNamespacesCommand } from "./schema.js";

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
