/**
 * Shared test helpers and XML fixtures for integration tests.
 *
 * Integration tests exercise the full extension-side editing pipeline:
 *   CommandProcessor.execute() → CommandValidator → CommandExecutor → SchemaModelManager
 *
 * Helpers here are intentionally thin wrappers around CommandProcessor so
 * tests stay focused on behaviour rather than boilerplate.
 */

import { CommandProcessor } from "../commandProcessor";
import type {
  CommandExecutionResult,
  CommandExecutionSuccess,
  CommandExecutionValidationFailure,
} from "../commandProcessor";
import type { SchemaCommand } from "../../shared/types";

// ─── XML Fixtures ────────────────────────────────────────────────────────────

/** Minimal empty schema – used as the starting point for "add" tests. */
export const MINIMAL_SCHEMA = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
</xs:schema>`;

/** Schema that contains two top-level elements. */
export const SCHEMA_WITH_ELEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string"/>
  <xs:element name="company" type="xs:string"/>
</xs:schema>`;

/** Schema that contains a top-level complexType with a sequence and an attribute. */
export const SCHEMA_WITH_COMPLEXTYPE = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:complexType name="PersonType">
    <xs:sequence>
      <xs:element name="name" type="xs:string"/>
    </xs:sequence>
    <xs:attribute name="id" type="xs:string"/>
  </xs:complexType>
</xs:schema>`;

/** Schema that contains a top-level simpleType with an enumeration restriction. */
export const SCHEMA_WITH_SIMPLETYPE = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:simpleType name="StatusType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="active"/>
      <xs:enumeration value="inactive"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>`;

/** Schema that contains a top-level named group. */
export const SCHEMA_WITH_GROUP = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="ContactGroup">
    <xs:sequence>
      <xs:element name="phone" type="xs:string"/>
    </xs:sequence>
  </xs:group>
</xs:schema>`;

/** Schema that contains a top-level named attributeGroup. */
export const SCHEMA_WITH_ATTRIBUTEGROUP = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:attributeGroup name="CommonAttrs">
    <xs:attribute name="id" type="xs:string"/>
  </xs:attributeGroup>
</xs:schema>`;

/** Schema that has an element with an annotation/documentation child. */
export const SCHEMA_WITH_ANNOTATION = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="person" type="xs:string">
    <xs:annotation>
      <xs:documentation>A person element</xs:documentation>
    </xs:annotation>
  </xs:element>
</xs:schema>`;

/** Schema that declares one import with an explicit prefix. */
export const SCHEMA_WITH_IMPORT = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:import namespace="http://example.com/ext" schemaLocation="ext.xsd"/>
</xs:schema>`;

/** Schema that declares one include. */
export const SCHEMA_WITH_INCLUDE = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:include schemaLocation="base.xsd"/>
</xs:schema>`;

// ─── Pipeline Helpers ─────────────────────────────────────────────────────────

/**
 * Runs a command through a fresh CommandProcessor and returns the raw result.
 *
 * @param xml - Current schema XML content
 * @param command - The schema editing command to execute
 * @returns The full CommandExecutionResult (success or failure)
 */
export function runCommand(xml: string, command: SchemaCommand): CommandExecutionResult {
  return new CommandProcessor().execute(command, xml);
}

/**
 * Asserts that the command succeeds and returns the resulting XML.
 *
 * Throws a Jest expectation error when the command fails.
 *
 * @param xml - Current schema XML content
 * @param command - The schema editing command to execute
 * @returns The serialized XML after the command was applied
 */
export function runCommandExpectSuccess(xml: string, command: SchemaCommand): string {
  const result = runCommand(xml, command);
  expect(result.success).toBe(true);
  return (result as CommandExecutionSuccess).xmlContent;
}

/**
 * Asserts that the command fails with a validation error whose message contains
 * the given substring.
 *
 * Throws a Jest expectation error when the command succeeds or fails for a
 * different reason.
 *
 * @param xml - Current schema XML content
 * @param command - The schema editing command to execute
 * @param errorSubstring - Expected substring in the validation error message
 */
export function runCommandExpectValidationFailure(
  xml: string,
  command: SchemaCommand,
  errorSubstring: string
): void {
  const result = runCommand(xml, command);
  expect(result.success).toBe(false);
  const failure = result as CommandExecutionValidationFailure;
  expect(failure.errorKind).toBe("validation");
  expect(failure.error).toContain(errorSubstring);
}
