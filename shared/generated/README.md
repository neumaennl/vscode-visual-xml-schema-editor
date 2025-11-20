# Generated XML Schema Classes

This directory contains TypeScript classes auto-generated from the official W3C XML Schema definition (XMLSchema.xsd) using `@neumaennl/xmlbind-ts`.

## Generation

The classes were generated using:

```bash
node node_modules/@neumaennl/xmlbind-ts/dist/xsd/cli.js xsd2ts -i schemas/XMLSchema.xsd -o shared/generated
```

## Source

- **Source XSD**: W3C XML Schema 1.0 (https://www.w3.org/2001/XMLSchema.xsd)
- **Generated**: November 19, 2025
- **Tool**: @neumaennl/xmlbind-ts v0.7.2

## Usage

These classes represent the official XML Schema structure and can be used with xmlbind-ts's `marshal` and `unmarshal` functions:

```typescript
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "./generated";

// Parse an XSD file
const schemaObj = unmarshal(schema, xmlContent);

// Access schema properties
console.log(schemaObj.targetNamespace);
console.log(schemaObj.version);
```

## Main Classes

- `schema` - The root schema element
- `element` - Element declarations
- `complexType` - Complex type definitions
- `simpleType` - Simple type definitions
- `attribute` - Attribute declarations
- `group` - Model group definitions
- `sequence`, `choice`, `all` - Content model compositors
- And many more...

## Structure

The generator creates several organized files:

- `index.ts` - Barrel export for all generated types and classes
- `types.ts` - Type aliases for XML Schema built-in types
- `enums.ts` - Enumeration types used throughout the schema
- Individual class files for each XML Schema construct

## Note

Do not manually edit these generated files. If the XML Schema specification changes, regenerate these files using the CLI tool.
