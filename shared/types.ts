// Shared types between extension and webview

// Re-export XML Schema generated classes
export * from "./generated";

// Re-export the main schema class for convenience
export { schema as Schema } from "./generated";

// =============================================================================
// Base Command Types
// =============================================================================

/**
 * Base interface for all commands.
 * Commands represent editing operations on the schema.
 */
export interface BaseCommand<T = unknown> {
  /** Unique identifier for this command type */
  type: string;
  /** Payload containing command-specific data */
  payload: T;
}

/**
 * Standard response for command execution.
 */
export interface CommandResponse {
  /** Whether the command was executed successfully */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Additional data returned from command execution */
  data?: unknown;
}

// =============================================================================
// Element Commands
// =============================================================================

/**
 * Payload for adding a new element to the schema.
 */
export interface AddElementPayload {
  /** ID of the parent node where the element should be added */
  parentId: string;
  /** Name of the new element */
  elementName: string;
  /** Type of the element (e.g., 'string', 'int', or a custom type name) */
  elementType: string;
  /** Minimum occurrences (default: 1) */
  minOccurs?: number;
  /** Maximum occurrences (default: 1, use 'unbounded' for unlimited) */
  maxOccurs?: number | "unbounded";
  /** Optional documentation for the element */
  documentation?: string;
}

/**
 * Command to add a new element to the schema.
 */
export interface AddElementCommand extends BaseCommand<AddElementPayload> {
  type: "addElement";
  payload: AddElementPayload;
}

/**
 * Payload for removing an element from the schema.
 */
export interface RemoveElementPayload {
  /** ID of the element to remove */
  elementId: string;
}

/**
 * Command to remove an element from the schema.
 */
export interface RemoveElementCommand extends BaseCommand<RemoveElementPayload> {
  type: "removeElement";
  payload: RemoveElementPayload;
}

/**
 * Payload for modifying an existing element.
 */
export interface ModifyElementPayload {
  /** ID of the element to modify */
  elementId: string;
  /** New name for the element (optional) */
  elementName?: string;
  /** New type for the element (optional) */
  elementType?: string;
  /** New minimum occurrences (optional) */
  minOccurs?: number;
  /** New maximum occurrences (optional) */
  maxOccurs?: number | "unbounded";
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify an existing element.
 */
export interface ModifyElementCommand extends BaseCommand<ModifyElementPayload> {
  type: "modifyElement";
  payload: ModifyElementPayload;
}

// =============================================================================
// Attribute Commands
// =============================================================================

/**
 * Payload for adding a new attribute to an element.
 */
export interface AddAttributePayload {
  /** ID of the parent element */
  parentId: string;
  /** Name of the attribute */
  attributeName: string;
  /** Type of the attribute */
  attributeType: string;
  /** Whether the attribute is required (default: false) */
  required?: boolean;
  /** Default value for the attribute (optional) */
  defaultValue?: string;
  /** Fixed value for the attribute (optional) */
  fixedValue?: string;
  /** Optional documentation for the attribute */
  documentation?: string;
}

/**
 * Command to add a new attribute to an element.
 */
export interface AddAttributeCommand extends BaseCommand<AddAttributePayload> {
  type: "addAttribute";
  payload: AddAttributePayload;
}

/**
 * Payload for removing an attribute.
 */
export interface RemoveAttributePayload {
  /** ID of the attribute to remove */
  attributeId: string;
}

/**
 * Command to remove an attribute.
 */
export interface RemoveAttributeCommand extends BaseCommand<RemoveAttributePayload> {
  type: "removeAttribute";
  payload: RemoveAttributePayload;
}

/**
 * Payload for modifying an existing attribute.
 */
export interface ModifyAttributePayload {
  /** ID of the attribute to modify */
  attributeId: string;
  /** New name for the attribute (optional) */
  attributeName?: string;
  /** New type for the attribute (optional) */
  attributeType?: string;
  /** New required status (optional) */
  required?: boolean;
  /** New default value (optional) */
  defaultValue?: string;
  /** New fixed value (optional) */
  fixedValue?: string;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify an existing attribute.
 */
export interface ModifyAttributeCommand extends BaseCommand<ModifyAttributePayload> {
  type: "modifyAttribute";
  payload: ModifyAttributePayload;
}

// =============================================================================
// Simple Type Commands
// =============================================================================

/**
 * Restriction facets for simple types.
 */
export interface RestrictionFacets {
  /** Minimum value (inclusive) */
  minInclusive?: string;
  /** Maximum value (inclusive) */
  maxInclusive?: string;
  /** Minimum value (exclusive) */
  minExclusive?: string;
  /** Maximum value (exclusive) */
  maxExclusive?: string;
  /** Exact length */
  length?: number;
  /** Minimum length */
  minLength?: number;
  /** Maximum length */
  maxLength?: number;
  /** Regular expression pattern */
  pattern?: string;
  /** Enumeration values */
  enumeration?: string[];
  /** Whitespace handling */
  whiteSpace?: "preserve" | "replace" | "collapse";
  /** Total number of digits */
  totalDigits?: number;
  /** Number of fraction digits */
  fractionDigits?: number;
}

/**
 * Payload for adding a simple type definition.
 */
export interface AddSimpleTypePayload {
  /** Name of the simple type */
  typeName: string;
  /** Base type for the restriction */
  baseType: string;
  /** Restriction facets */
  restrictions?: RestrictionFacets;
  /** Optional documentation */
  documentation?: string;
}

/**
 * Command to add a simple type definition.
 */
export interface AddSimpleTypeCommand extends BaseCommand<AddSimpleTypePayload> {
  type: "addSimpleType";
  payload: AddSimpleTypePayload;
}

/**
 * Payload for removing a simple type.
 */
export interface RemoveSimpleTypePayload {
  /** ID of the simple type to remove */
  typeId: string;
}

/**
 * Command to remove a simple type.
 */
export interface RemoveSimpleTypeCommand extends BaseCommand<RemoveSimpleTypePayload> {
  type: "removeSimpleType";
  payload: RemoveSimpleTypePayload;
}

/**
 * Payload for modifying a simple type.
 */
export interface ModifySimpleTypePayload {
  /** ID of the simple type to modify */
  typeId: string;
  /** New name for the type (optional) */
  typeName?: string;
  /** New base type (optional) */
  baseType?: string;
  /** New restrictions (optional) */
  restrictions?: RestrictionFacets;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify a simple type.
 */
export interface ModifySimpleTypeCommand extends BaseCommand<ModifySimpleTypePayload> {
  type: "modifySimpleType";
  payload: ModifySimpleTypePayload;
}

// =============================================================================
// Complex Type Commands
// =============================================================================

/**
 * Content model for complex types.
 */
export type ContentModel = "sequence" | "choice" | "all";

/**
 * Payload for adding a complex type definition.
 */
export interface AddComplexTypePayload {
  /** Name of the complex type */
  typeName: string;
  /** Content model (sequence, choice, all) */
  contentModel: ContentModel;
  /** Whether the type is abstract */
  abstract?: boolean;
  /** Base type for extension (optional) */
  baseType?: string;
  /** Whether to allow mixed content */
  mixed?: boolean;
  /** Optional documentation */
  documentation?: string;
}

/**
 * Command to add a complex type definition.
 */
export interface AddComplexTypeCommand extends BaseCommand<AddComplexTypePayload> {
  type: "addComplexType";
  payload: AddComplexTypePayload;
}

/**
 * Payload for removing a complex type.
 */
export interface RemoveComplexTypePayload {
  /** ID of the complex type to remove */
  typeId: string;
}

/**
 * Command to remove a complex type.
 */
export interface RemoveComplexTypeCommand extends BaseCommand<RemoveComplexTypePayload> {
  type: "removeComplexType";
  payload: RemoveComplexTypePayload;
}

/**
 * Payload for modifying a complex type.
 */
export interface ModifyComplexTypePayload {
  /** ID of the complex type to modify */
  typeId: string;
  /** New name for the type (optional) */
  typeName?: string;
  /** New content model (optional) */
  contentModel?: ContentModel;
  /** New abstract status (optional) */
  abstract?: boolean;
  /** New base type (optional) */
  baseType?: string;
  /** New mixed content flag (optional) */
  mixed?: boolean;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify a complex type.
 */
export interface ModifyComplexTypeCommand extends BaseCommand<ModifyComplexTypePayload> {
  type: "modifyComplexType";
  payload: ModifyComplexTypePayload;
}

// =============================================================================
// Group Commands
// =============================================================================

/**
 * Payload for adding a group definition.
 */
export interface AddGroupPayload {
  /** Name of the group */
  groupName: string;
  /** Content model for the group */
  contentModel: ContentModel;
  /** Optional documentation */
  documentation?: string;
}

/**
 * Command to add a group definition.
 */
export interface AddGroupCommand extends BaseCommand<AddGroupPayload> {
  type: "addGroup";
  payload: AddGroupPayload;
}

/**
 * Payload for removing a group.
 */
export interface RemoveGroupPayload {
  /** ID of the group to remove */
  groupId: string;
}

/**
 * Command to remove a group.
 */
export interface RemoveGroupCommand extends BaseCommand<RemoveGroupPayload> {
  type: "removeGroup";
  payload: RemoveGroupPayload;
}

/**
 * Payload for modifying a group.
 */
export interface ModifyGroupPayload {
  /** ID of the group to modify */
  groupId: string;
  /** New name for the group (optional) */
  groupName?: string;
  /** New content model (optional) */
  contentModel?: ContentModel;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify a group.
 */
export interface ModifyGroupCommand extends BaseCommand<ModifyGroupPayload> {
  type: "modifyGroup";
  payload: ModifyGroupPayload;
}

// =============================================================================
// Attribute Group Commands
// =============================================================================

/**
 * Payload for adding an attribute group definition.
 */
export interface AddAttributeGroupPayload {
  /** Name of the attribute group */
  groupName: string;
  /** Optional documentation */
  documentation?: string;
}

/**
 * Command to add an attribute group definition.
 */
export interface AddAttributeGroupCommand extends BaseCommand<AddAttributeGroupPayload> {
  type: "addAttributeGroup";
  payload: AddAttributeGroupPayload;
}

/**
 * Payload for removing an attribute group.
 */
export interface RemoveAttributeGroupPayload {
  /** ID of the attribute group to remove */
  groupId: string;
}

/**
 * Command to remove an attribute group.
 */
export interface RemoveAttributeGroupCommand extends BaseCommand<RemoveAttributeGroupPayload> {
  type: "removeAttributeGroup";
  payload: RemoveAttributeGroupPayload;
}

/**
 * Payload for modifying an attribute group.
 */
export interface ModifyAttributeGroupPayload {
  /** ID of the attribute group to modify */
  groupId: string;
  /** New name for the group (optional) */
  groupName?: string;
  /** New documentation (optional) */
  documentation?: string;
}

/**
 * Command to modify an attribute group.
 */
export interface ModifyAttributeGroupCommand extends BaseCommand<ModifyAttributeGroupPayload> {
  type: "modifyAttributeGroup";
  payload: ModifyAttributeGroupPayload;
}

// =============================================================================
// Annotation Commands
// =============================================================================

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

// =============================================================================
// Documentation Commands
// =============================================================================

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

// =============================================================================
// Import Commands
// =============================================================================

/**
 * Payload for adding an import to the schema.
 */
export interface AddImportPayload {
  /** Namespace URI to import */
  namespace: string;
  /** Location of the schema to import */
  schemaLocation: string;
}

/**
 * Command to add an import.
 */
export interface AddImportCommand extends BaseCommand<AddImportPayload> {
  type: "addImport";
  payload: AddImportPayload;
}

/**
 * Payload for removing an import.
 */
export interface RemoveImportPayload {
  /** ID of the import to remove */
  importId: string;
}

/**
 * Command to remove an import.
 */
export interface RemoveImportCommand extends BaseCommand<RemoveImportPayload> {
  type: "removeImport";
  payload: RemoveImportPayload;
}

/**
 * Payload for modifying an import.
 */
export interface ModifyImportPayload {
  /** ID of the import to modify */
  importId: string;
  /** New namespace (optional) */
  namespace?: string;
  /** New schema location (optional) */
  schemaLocation?: string;
}

/**
 * Command to modify an import.
 */
export interface ModifyImportCommand extends BaseCommand<ModifyImportPayload> {
  type: "modifyImport";
  payload: ModifyImportPayload;
}

// =============================================================================
// Include Commands
// =============================================================================

/**
 * Payload for adding an include to the schema.
 */
export interface AddIncludePayload {
  /** Location of the schema to include */
  schemaLocation: string;
}

/**
 * Command to add an include.
 */
export interface AddIncludeCommand extends BaseCommand<AddIncludePayload> {
  type: "addInclude";
  payload: AddIncludePayload;
}

/**
 * Payload for removing an include.
 */
export interface RemoveIncludePayload {
  /** ID of the include to remove */
  includeId: string;
}

/**
 * Command to remove an include.
 */
export interface RemoveIncludeCommand extends BaseCommand<RemoveIncludePayload> {
  type: "removeInclude";
  payload: RemoveIncludePayload;
}

/**
 * Payload for modifying an include.
 */
export interface ModifyIncludePayload {
  /** ID of the include to modify */
  includeId: string;
  /** New schema location (optional) */
  schemaLocation?: string;
}

/**
 * Command to modify an include.
 */
export interface ModifyIncludeCommand extends BaseCommand<ModifyIncludePayload> {
  type: "modifyInclude";
  payload: ModifyIncludePayload;
}

// =============================================================================
// Command Union Type
// =============================================================================

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

// =============================================================================
// Message Protocol
// =============================================================================

/**
 * Base interface for messages between extension and webview.
 */
export interface Message {
  command: string;
  data?: unknown;
}

/**
 * Message to execute a schema command.
 */
export interface ExecuteCommandMessage extends Message {
  command: "executeCommand";
  data: SchemaCommand;
}

/**
 * Message to update the schema in the webview.
 */
export interface UpdateSchemaMessage extends Message {
  command: "updateSchema";
  data: unknown; // Schema object serialized for webview
}

/**
 * Message when a node is clicked in the diagram.
 */
export interface NodeClickedMessage extends Message {
  command: "nodeClicked";
  data: { nodeId: string };
}

/**
 * Message when the schema has been modified.
 */
export interface SchemaModifiedMessage extends Message {
  command: "schemaModified";
  data: unknown; // Updated schema object
}

/**
 * Message to report an error.
 */
export interface ErrorMessage extends Message {
  command: "error";
  data: { message: string; code?: string };
}

/**
 * Message to report command execution result.
 */
export interface CommandResultMessage extends Message {
  command: "commandResult";
  data: CommandResponse;
}

/**
 * Union type of all messages from webview to extension.
 */
export type WebviewMessage = ExecuteCommandMessage | NodeClickedMessage;

/**
 * Union type of all messages from extension to webview.
 */
export type ExtensionMessage =
  | UpdateSchemaMessage
  | SchemaModifiedMessage
  | ErrorMessage
  | CommandResultMessage;
