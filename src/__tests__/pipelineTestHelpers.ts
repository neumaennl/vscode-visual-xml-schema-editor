/**
 * Shared test helpers and XML fixtures for integration tests.
 *
 * Integration tests exercise the full extension-side editing pipeline:
 *   CommandProcessor.execute() → CommandValidator → CommandExecutor → SchemaModelManager
 *
 * Helpers here are intentionally thin wrappers around CommandProcessor so
 * tests stay focused on behaviour rather than boilerplate.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { CommandProcessor } from "../commandProcessor.js";
import type {
  CommandExecutionResult,
  CommandExecutionSuccess,
  CommandExecutionValidationFailure,
} from "../commandProcessor.js";
import { schema } from "../../shared/types.js";
import type { SchemaCommand } from "../../shared/types.js";
import { schemaXmlWith } from "./schemaTestHelpers.js";

// ─── XML Fixtures ────────────────────────────────────────────────────────────

/** Schema that contains two top-level elements. */
export const SCHEMA_WITH_ELEMENTS = schemaXmlWith(`<xs:element name="person" type="xs:string"/>
<xs:element name="company" type="xs:string"/>`);

/** Schema that contains a top-level complexType with a sequence and an attribute. */
export const SCHEMA_WITH_COMPLEXTYPE = schemaXmlWith(`<xs:complexType name="PersonType">
  <xs:sequence>
    <xs:element name="name" type="xs:string"/>
  </xs:sequence>
  <xs:attribute name="id" type="xs:string"/>
</xs:complexType>`);

/** Schema that contains a top-level simpleType with an enumeration restriction. */
export const SCHEMA_WITH_SIMPLETYPE = schemaXmlWith(`<xs:simpleType name="StatusType">
  <xs:restriction base="xs:string">
    <xs:enumeration value="active"/>
    <xs:enumeration value="inactive"/>
  </xs:restriction>
</xs:simpleType>`);

/** Schema that contains a top-level named group. */
export const SCHEMA_WITH_GROUP = schemaXmlWith(`<xs:group name="ContactGroup">
  <xs:sequence>
    <xs:element name="phone" type="xs:string"/>
  </xs:sequence>
</xs:group>`);

/** Schema that contains a top-level named attributeGroup. */
export const SCHEMA_WITH_ATTRIBUTEGROUP = schemaXmlWith(`<xs:attributeGroup name="CommonAttrs">
  <xs:attribute name="id" type="xs:string"/>
</xs:attributeGroup>`);

/** Schema that has an element with an annotation/documentation child. */
export const SCHEMA_WITH_ANNOTATION = schemaXmlWith(`<xs:element name="person" type="xs:string">
  <xs:annotation>
    <xs:documentation>A person element</xs:documentation>
  </xs:annotation>
</xs:element>`);

/** Schema that declares one import. */
export const SCHEMA_WITH_IMPORT = schemaXmlWith(`<xs:import namespace="http://example.com/ext" schemaLocation="ext.xsd"/>`);

/** Schema that declares one include. */
export const SCHEMA_WITH_INCLUDE = schemaXmlWith(`<xs:include schemaLocation="base.xsd"/>`);

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
 * Throws an expectation error when the command fails.
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
 * Asserts that the command succeeds and returns the resulting schema object,
 * obtained by unmarshalling the XML produced by the command.
 *
 * Use this instead of {@link runCommandExpectSuccess} when you need to inspect
 * schema properties rather than raw XML text.
 *
 * @param xml - Current schema XML content
 * @param command - The schema editing command to execute
 * @returns The unmarshalled schema object after the command was applied
 */
export function runCommandExpectSuccessSchema(
  xml: string,
  command: SchemaCommand
): schema {
  const xmlContent = runCommandExpectSuccess(xml, command);
  return unmarshal(schema, xmlContent);
}

/**
 * Asserts that the command fails with a validation error whose message matches
 * the given expected string exactly.
 *
 * Throws an expectation error when the command succeeds or fails for a
 * different reason.
 *
 * @param xml - Current schema XML content
 * @param command - The schema editing command to execute
 * @param expectedError - Expected exact validation error message
 */
export function runCommandExpectValidationFailure(
  xml: string,
  command: SchemaCommand,
  expectedError: string
): void {
  const result = runCommand(xml, command);
  expect(result.success).toBe(false);
  const failure = result as CommandExecutionValidationFailure;
  expect(failure.errorKind).toBe("validation");
  expect(failure.error).toBe(expectedError);
}
