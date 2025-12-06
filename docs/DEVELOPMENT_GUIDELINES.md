# Development Guidelines

This document outlines the development best practices and architectural vision for the Visual XML Schema Editor VS Code Extension.

## Table of Contents

- [Code Quality Standards](#code-quality-standards)
- [TypeScript Best Practices](#typescript-best-practices)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Requirements](#documentation-requirements)
- [Architecture Overview](#architecture-overview)
- [VS Code Extension Best Practices](#vs-code-extension-best-practices)

## Code Quality Standards

### File Size Limits

- **No TypeScript file should exceed 500 lines**
  - If a file grows beyond this limit, extract code into separate modules
  - Group related functionality into logical files
  - Use clear naming conventions for extracted modules

### Function Size Limits

- **No function should exceed 120 lines**
  - Break down complex functions into smaller, focused helper functions
  - Extract repeated logic into reusable utilities
  - Consider using the Single Responsibility Principle

### Code Duplication

- **Avoid code duplication**
  - Extract duplicated code into reusable functions or classes
  - Create utility modules for common operations
  - Use inheritance or composition patterns where appropriate

### Linting

- **Use ESLint to enforce code quality standards**
  - Run `npm run lint` before committing changes
  - Use `npm run lint:fix` to automatically fix issues
  - ESLint is configured with TypeScript-specific rules
  - Address all linting errors; warnings should be minimized
  - Configuration: `.eslintrc.json`

### Code Review

- **Use Copilot code review to ensure code quality**
  - Run code review before finalizing changes
  - Address all legitimate review comments
  - Document reasons if review suggestions are not followed

## TypeScript Best Practices

### Type Safety

- Use strict TypeScript configuration
- Avoid `any` types unless absolutely necessary
- Define clear interfaces and types for all data structures
- Use discriminated unions for command types

### Modern TypeScript Features

- Utilize TypeScript 5.0+ features appropriately
- Use `const` for immutable values, `let` for mutable ones
- Leverage type inference where it improves readability
- Use optional chaining and nullish coalescing operators

### Naming Conventions

- Use PascalCase for classes and interfaces
- Use camelCase for functions, methods, and variables
- Use UPPER_CASE for constants
- Use descriptive names that convey intent

### Identifier Length Guidelines

- **Soft limit**: 25-30 characters for identifiers
- **Bonus**: Keep identifiers under 15 characters when possible
- **Priority**: Clarity over brevity - be descriptive but concise
- **Examples**:
  - Good: `createElementWithChildren` (26 chars, clear purpose)
  - Better: `createElement` (14 chars, clear and concise)
  - Avoid: `createElementNodeWithProcessingOfAnonymousTypes` (too long)
  - Avoid: `cen` (too cryptic)

## Testing Guidelines

### Test Coverage

- **All code should be tested**
  - Write unit tests for all business logic
  - Test edge cases and error conditions
  - Aim for high test coverage (>80%)

### Test Organization

- **Test files should only test one feature**
  - Each test file should focus on a single module or class
  - Avoid scattering test cases for the same feature across multiple files
  - Avoid multiple test cases testing the exact same thing

### Test Organization Structure

- **Unit tests** (testing a single unit/function) should be in the **same folder** as the source file:
  - Test for `src/extension.ts` → `src/extension.test.ts`
  - Test for `webview-src/renderer.ts` → `webview-src/renderer.test.ts`
  - Test for `webview-src/diagram/Diagram.ts` → `webview-src/diagram/Diagram.test.ts`
  - This makes it easy to find the test for any source file

- **Integration tests** (testing multiple components together) go in `__tests__` directories:
  - `shared/__tests__/` - Integration tests for shared code
  - `src/__tests__/` - Integration tests for extension code (if needed)
  - `webview-src/__tests__/` - Integration tests for webview code (if needed)
  - Directory structure within `__tests__` mirrors source structure if needed

### Test Resources

- **Move larger XML snippets to `src/__tests__/test-resources`**
  - Keep test files clean and focused
  - Reuse test fixtures across multiple tests
  - Name test resource files descriptively

### Test Structure

```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle edge case', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Documentation Requirements

### TSDoc Comments

- **All functions must have up-to-date TSDoc comments**
  - Document the purpose of the function
  - Describe all parameters with `@param`
  - Describe return values with `@returns`
  - Document exceptions with `@throws`
  - Include usage examples for complex functions

### Example TSDoc Format

```typescript
/**
 * Processes an XML schema element and creates a diagram item.
 * 
 * @param element - The XML schema element to process
 * @param parentId - The ID of the parent diagram item
 * @returns A new DiagramItem representing the element, or null if invalid
 * @throws {SchemaParseError} If the element structure is invalid
 * 
 * @example
 * ```typescript
 * const item = processElement(schemaElement, "parent-123");
 * if (item) {
 *   diagram.addItem(item);
 * }
 * ```
 */
function processElement(element: SchemaElement, parentId: string): DiagramItem | null {
  // Implementation
}
```

### README and Documentation Files

- Keep README.md up to date with project status
- Document architectural decisions in `docs/architecture/`
- Maintain changelog for significant changes
- Document known issues and limitations

## Architecture Overview

### Project Structure

```
vscode-visual-xml-schema-editor/
├── src/                      # VS Code extension code
│   ├── extension.ts         # Extension activation and commands
│   └── webviewProvider.ts   # Custom editor provider
├── webview-src/             # Webview UI code
│   ├── main.ts              # Webview entry point
│   ├── renderer.ts          # Diagram rendering orchestration
│   ├── propertyPanel.ts     # Properties panel UI
│   ├── diagram/             # Diagram visualization components
│   └── webviewTypes.ts      # Webview-specific types
├── shared/                   # Code shared between extension and webview
│   ├── commands/            # Command type definitions
│   ├── generated/           # Auto-generated types from XSD
│   ├── messages.ts          # Message protocol
│   └── types.ts             # Shared type exports
└── docs/                     # Documentation
    ├── architecture/        # Architecture decision records
    └── DEVELOPMENT_GUIDELINES.md
```

### Key Architectural Principles

1. **Separation of Concerns**
   - Extension code handles VS Code integration
   - Webview code handles visualization
   - Shared code defines the contract between them

2. **Message-Based Communication**
   - Extension and webview communicate via messages
   - Commands define operations on the schema
   - Messages follow a type-safe protocol

3. **Diagram Builder Pattern**
   - DiagramBuilder creates diagram structure from XSD
   - DiagramLayout handles positioning
   - DiagramSvgRenderer handles SVG generation
   - DiagramRenderer orchestrates the rendering pipeline

4. **Type Safety**
   - Auto-generated types from XSD schema
   - Command types use discriminated unions
   - Strict TypeScript configuration

## VS Code Extension Best Practices

### Custom Editor Pattern

- Implement `CustomTextEditorProvider` for document editing
- Use webview for custom UI
- Sync document changes with webview updates

### State Management

- Store webview state using `getState()` and `setState()`
- Handle webview recreation properly
- Save user preferences in workspace or global state

### Performance

- Use `retainContextWhenHidden` judiciously
- Lazy load resources when possible
- Debounce expensive operations
- Optimize SVG rendering for large schemas

### Testing

- Use Jest for unit tests
- Mock VS Code API for extension tests
- Test webview logic independently
- Integration tests for critical paths

### Packaging

- Minimize bundle size
- Use webpack for webview bundling
- Exclude unnecessary files from package
- Test packaged extension before publishing

## Build and Development Workflow

### Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Lint code
npm run lint

# Lint and auto-fix
npm run lint:fix

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Package extension
npm run package
```

### Continuous Integration

The project uses GitHub Actions for continuous integration:

- **Workflow**: `.github/workflows/ci.yml`
- **Runs on**: Push to `main` and pull requests
- **Steps**:
  1. Install dependencies
  2. Run linting
  3. Build the project
  4. Run tests with coverage
  5. Generate coverage report
  6. Publish test results

**CI Badge**: The README includes a CI status badge showing the current build status.

### Before Committing

1. Ensure all files compile without errors
2. Run linter and fix any issues (`npm run lint`)
3. Run all tests and ensure they pass (`npm test`)
4. Review changes for compliance with these guidelines
5. Update documentation if needed
6. Run Copilot code review on changed files

## Contributing

When contributing to this project:

1. Follow all guidelines in this document
2. Write tests for new functionality
3. Update documentation for API changes
4. Keep commits focused and atomic
5. Write clear commit messages
6. Request code review before merging

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)
- [TSDoc Reference](https://tsdoc.org/)
- [XML Schema Specification](https://www.w3.org/TR/xmlschema-1/)
