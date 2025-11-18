# Migration to xmlbind-ts Generated Classes

## Summary

This project has been updated to use TypeScript classes generated from the official W3C XML Schema definition (XMLSchema.xsd) using the `@neumaennl/xmlbind-ts` CLI tool.

## What Changed

### 1. Generated Classes

- Downloaded the official XML Schema XSD from https://www.w3.org/2001/XMLSchema.xsd
- Generated 87 TypeScript class files in `shared/generated/` using the `xsd2ts` CLI tool
- Fixed missing imports in generated files to ensure proper compilation

### 2. Type System Updates

- `shared/types.ts` now re-exports all generated classes
- Kept existing UI/communication types (SchemaNode, SchemaDiagram, NodeType, etc.) for visualization
- These types serve as a bridge between the official XSD structure and the visualization layer

### 3. Parser Refactoring

- **SchemaParser** (`src/schemaParser.ts`):
  - Removed legacy DOM-based parsing
  - Now uses `unmarshal()` from xmlbind-ts to parse XSD files into the generated `schema` class
  - Contains TODO for implementing conversion from generated classes to diagram format

### 4. Marshaller Updates

- **SchemaMarshaller** (`src/schemaMarshaller.ts`):
  - Added `unmarshalSchema()` and `marshalSchema()` methods for working with the generated schema class
  - Retained generic methods for flexibility
  - Contains TODO for implementing conversion to diagram format

## Key Generated Classes

The main generated classes in `shared/generated/` include:

- `schema` - Root schema element
- `element`, `topLevelElement`, `localElement` - Element declarations
- `complexType`, `topLevelComplexType`, `localComplexType` - Complex types
- `simpleType`, `topLevelSimpleType`, `localSimpleType` - Simple types
- `attribute`, `topLevelAttribute` - Attributes
- `sequence`, `choice`, `all` - Content model compositors
- `group`, `attributeGroup` - Reusable groups
- And 60+ more classes covering the entire XSD specification

## Compilation

The project compiles successfully with TypeScript's strict mode enabled:

```bash
npm run compile
```

## Next Steps

To complete the integration, the following needs to be implemented:

1. **Schema to Diagram Conversion**: Implement the TODO in `SchemaParser.convertToDiagram()` to:

   - Extract top-level elements, complex types, and simple types from the schema object
   - Convert each to the SchemaNode structure used by the visualization
   - Handle nested structures, attributes, and documentation

2. **Marshalling Support**: Implement the TODO in `SchemaMarshaller.convertToDiagram()` for:

   - Converting schema objects to the diagram format
   - Supporting round-trip editing (diagram → schema → XML)

3. **Testing**: Add tests to verify:
   - Parsing various XSD files works correctly
   - The conversion to diagram format preserves all important information
   - Marshalling back to XML produces valid XSD

## Benefits

Using the official XSD-generated classes provides:

- **Type Safety**: Full TypeScript type checking for XSD structures
- **Completeness**: Support for all XSD features, not just a subset
- **Maintainability**: Easy to regenerate if the XSD specification is updated
- **Correctness**: Guaranteed to match the official XML Schema specification
- **xmlbind-ts Integration**: Native support for marshalling/unmarshalling XML

## Regeneration

If needed, regenerate the classes with:

```bash
node node_modules/@neumaennl/xmlbind-ts/dist/xsd/cli.js xsd2ts -i XMLSchema.xsd -o shared/generated
```

Then manually fix imports in the generated files (see git history for examples).
