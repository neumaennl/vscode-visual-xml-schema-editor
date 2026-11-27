/**
 * Helpers that read the XML files in `src/__tests__/test-resources` for the tests of the extension host.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { unmarshal } from "@neumaennl/xmlbind-ts";
import { schema } from "../../shared/types.js";

/** The path of the folder with the XML files of the tests. */
export const TEST_RESOURCES = join(import.meta.dirname, "test-resources");

/**
 * Returns the paths of all schemas in `src/__tests__/test-resources` and in the example files of the repository,
 * for the tests that check something for every schema.
 *
 * @returns The paths of the `.xsd` files
 */
export function allTestSchemaFiles(): string[] {
  return [TEST_RESOURCES, join(import.meta.dirname, "../../exampleFiles")].flatMap((folder) =>
    readdirSync(folder)
      .filter((name) => name.endsWith(".xsd"))
      .map((name) => join(folder, name))
  );
}

/**
 * Reads an XML file from `src/__tests__/test-resources`.
 *
 * @param name - The file name, for example `person-type-with-name-element.xsd`
 * @returns The content of the file
 */
export function readTestXml(name: string): string {
  return readFileSync(join(TEST_RESOURCES, name), "utf8");
}

/**
 * Reads an XML file from `src/__tests__/test-resources` and unmarshals it.
 *
 * @param name - The file name, for example `person-type-with-name-element.xsd`
 * @returns The schema object
 */
export function readTestSchema(name: string): schema {
  return unmarshal(schema, readTestXml(name));
}
