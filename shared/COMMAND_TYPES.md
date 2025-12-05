# Command Types Documentation

This document provides an overview of the command types for the Visual XML Schema Editor.

## Overview

The command types follow the **Command Pattern** to encapsulate editing operations on XML schemas. Each command is a strongly-typed object that represents a specific editing action.

## Architecture

### Base Types

#### `BaseCommand<T>`
```typescript
interface BaseCommand<T = unknown> {
  type: string;
  payload: T;
}
```
The base interface for all commands. Uses a generic type parameter to ensure type-safe payloads.

#### `CommandResponse`
```typescript
interface CommandResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}
```
Standard response structure for command execution results.

## Command Categories

### 1. Element Commands

Commands for managing XML schema elements:

- **AddElementCommand**: Create a new element
  - Requires: `parentId`, `elementName`, `elementType`
  - Optional: `minOccurs`, `maxOccurs`, `documentation`

- **RemoveElementCommand**: Delete an existing element
  - Requires: `elementId`

- **ModifyElementCommand**: Update element properties
  - Requires: `elementId`
  - Optional: Any element property to modify

### 2. Attribute Commands

Commands for managing element attributes:

- **AddAttributeCommand**: Add an attribute to an element
  - Requires: `parentId`, `attributeName`, `attributeType`
  - Optional: `required`, `defaultValue`, `fixedValue`, `documentation`

- **RemoveAttributeCommand**: Delete an attribute
  - Requires: `attributeId`

- **ModifyAttributeCommand**: Update attribute properties
  - Requires: `attributeId`
  - Optional: Any attribute property to modify

### 3. Simple Type Commands

Commands for managing simple type definitions with restriction facets:

- **AddSimpleTypeCommand**: Create a simple type
  - Requires: `typeName`, `baseType`
  - Optional: `restrictions` (enumeration, pattern, length, etc.), `documentation`

- **RemoveSimpleTypeCommand**: Delete a simple type
  - Requires: `typeId`

- **ModifySimpleTypeCommand**: Update simple type properties
  - Requires: `typeId`
  - Optional: Any simple type property to modify

#### Restriction Facets

Simple types support all standard XSD restriction facets:
- `minInclusive`, `maxInclusive`, `minExclusive`, `maxExclusive`
- `length`, `minLength`, `maxLength`
- `pattern` (regular expression)
- `enumeration` (array of valid values)
- `whiteSpace` ("preserve" | "replace" | "collapse")
- `totalDigits`, `fractionDigits`

### 4. Complex Type Commands

Commands for managing complex type definitions:

- **AddComplexTypeCommand**: Create a complex type
  - Requires: `typeName`, `contentModel` ("sequence" | "choice" | "all")
  - Optional: `abstract`, `baseType`, `mixed`, `documentation`

- **RemoveComplexTypeCommand**: Delete a complex type
  - Requires: `typeId`

- **ModifyComplexTypeCommand**: Update complex type properties
  - Requires: `typeId`
  - Optional: Any complex type property to modify

### 5. Group Commands

Commands for managing element groups:

- **AddGroupCommand**: Create a group definition
  - Requires: `groupName`, `contentModel`
  - Optional: `documentation`

- **RemoveGroupCommand**: Delete a group
  - Requires: `groupId`

- **ModifyGroupCommand**: Update group properties
  - Requires: `groupId`
  - Optional: Any group property to modify

### 6. Attribute Group Commands

Commands for managing attribute groups:

- **AddAttributeGroupCommand**: Create an attribute group
  - Requires: `groupName`
  - Optional: `documentation`

- **RemoveAttributeGroupCommand**: Delete an attribute group
  - Requires: `groupId`

- **ModifyAttributeGroupCommand**: Update attribute group properties
  - Requires: `groupId`
  - Optional: Any attribute group property to modify

### 7. Annotation Commands

Commands for managing annotations:

- **AddAnnotationCommand**: Add an annotation to a schema component
  - Requires: `targetId`
  - Optional: `documentation`, `appInfo`

- **RemoveAnnotationCommand**: Delete an annotation
  - Requires: `annotationId`

- **ModifyAnnotationCommand**: Update annotation content
  - Requires: `annotationId`
  - Optional: `documentation`, `appInfo`

### 8. Documentation Commands

Commands for managing documentation elements:

- **AddDocumentationCommand**: Add documentation to a component
  - Requires: `targetId`, `content`
  - Optional: `lang` (language code)

- **RemoveDocumentationCommand**: Delete documentation
  - Requires: `documentationId`

- **ModifyDocumentationCommand**: Update documentation
  - Requires: `documentationId`
  - Optional: `content`, `lang`

### 9. Import Commands

Commands for managing schema imports:

- **AddImportCommand**: Import another schema namespace
  - Requires: `namespace`, `schemaLocation`

- **RemoveImportCommand**: Remove an import
  - Requires: `importId`

- **ModifyImportCommand**: Update import properties
  - Requires: `importId`
  - Optional: `namespace`, `schemaLocation`

### 10. Include Commands

Commands for managing schema includes:

- **AddIncludeCommand**: Include another schema file
  - Requires: `schemaLocation`

- **RemoveIncludeCommand**: Remove an include
  - Requires: `includeId`

- **ModifyIncludeCommand**: Update include location
  - Requires: `includeId`
  - Optional: `schemaLocation`

## Union Types

### `SchemaCommand`
A discriminated union of all command types. Enables type-safe command handling:

```typescript
type SchemaCommand =
  | AddElementCommand
  | RemoveElementCommand
  | ModifyElementCommand
  | AddAttributeCommand
  // ... all other commands
```

## Message Protocol

### Webview to Extension

#### `ExecuteCommandMessage`
```typescript
{
  command: "executeCommand",
  data: SchemaCommand
}
```
Sent from webview to execute a schema editing command.

#### `NodeClickedMessage`
```typescript
{
  command: "nodeClicked",
  data: { nodeId: string }
}
```
Sent when a user clicks on a diagram node.

### Extension to Webview

#### `CommandResultMessage`
```typescript
{
  command: "commandResult",
  data: CommandResponse
}
```
Returns the result of command execution.

#### `UpdateSchemaMessage`
```typescript
{
  command: "updateSchema",
  data: <serialized schema>
}
```
Sends updated schema to webview for rendering.

#### `ErrorMessage`
```typescript
{
  command: "error",
  data: {
    message: string,
    code?: string,
    stack?: string
  }
}
```
Reports errors to the webview.

## Usage Examples

### Creating a New Element

```typescript
const addElementCmd: AddElementCommand = {
  type: "addElement",
  payload: {
    parentId: "root-element",
    elementName: "person",
    elementType: "PersonType",
    minOccurs: 1,
    maxOccurs: "unbounded"
  }
};
```

### Adding a Simple Type with Restrictions

```typescript
const addSimpleTypeCmd: AddSimpleTypeCommand = {
  type: "addSimpleType",
  payload: {
    typeName: "EmailType",
    baseType: "string",
    restrictions: {
      pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
      maxLength: 255
    },
    documentation: "Email address format"
  }
};
```

### Modifying an Element

```typescript
const modifyElementCmd: ModifyElementCommand = {
  type: "modifyElement",
  payload: {
    elementId: "person-element",
    maxOccurs: "unbounded",  // Only update maxOccurs
    documentation: "Updated documentation"
  }
};
```

## Type Safety Features

1. **Discriminated Unions**: The `type` field enables TypeScript to narrow types automatically
2. **Generic Payloads**: Each command has a strongly-typed payload
3. **Optional Fields**: Modify commands use optional fields for partial updates
4. **Literal Types**: Command types use string literals for precise type checking

## File Structure

The command types are organized into focused modules for maintainability:

### Type Definitions
- `shared/types.ts` - Main export point, re-exports all command types
- `shared/commands/base.ts` - Base command interfaces (`BaseCommand`, `CommandResponse`)
- `shared/commands/element.ts` - Element commands (Add, Remove, Modify)
- `shared/commands/attribute.ts` - Attribute commands
- `shared/commands/schemaTypes.ts` - Simple and complex type commands
- `shared/commands/group.ts` - Element group and attribute group commands
- `shared/commands/metadata.ts` - Annotation and documentation commands
- `shared/commands/module.ts` - Import and include commands
- `shared/commands/index.ts` - Exports `SchemaCommand` union type
- `shared/messages.ts` - Message protocol types for extension/webview communication

### Testing

Comprehensive unit tests mirror the source structure:
- `shared/__tests__/commands/element.test.ts` - Element command tests
- `shared/__tests__/commands/attribute.test.ts` - Attribute command tests
- `shared/__tests__/commands/schemaTypes.test.ts` - Type command tests
- `shared/__tests__/commands/group.test.ts` - Group command tests
- `shared/__tests__/commands/metadata.test.ts` - Metadata command tests
- `shared/__tests__/commands/module.test.ts` - Module command tests
- `shared/__tests__/messages.test.ts` - Message protocol, union types, and type safety tests

Each test file covers:
- Command structure validation
- Edge case handling
- Type discrimination validation
- Optional field semantics

Run tests with:
```bash
npm test
```

## References

- [ADR 001: Editor Transition Architecture](../../docs/architecture/001-editor-transition.md)
- [Command Pattern](https://refactoring.guru/design-patterns/command)
