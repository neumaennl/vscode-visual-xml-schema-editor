/**
 * Schemas for the tests of the constraints of XML Schema that span the schema.
 */

import { unmarshal } from "@neumaennl/xmlbind-ts";
import { XSD_NAMESPACE } from "../../shared/builtInTypes.js";
import { schema } from "../../shared/types.js";

/** The target namespace of {@link schemaInTargetNamespace}, which has the prefix `t`. */
export const TARGET_NAMESPACE = "urn:t";

/**
 * Unmarshals a schema with the target namespace {@link TARGET_NAMESPACE} and the prefixes `xs` and `t`.
 *
 * @param body - The content of the schema
 * @param attributes - More attributes of the schema element, such as `elementFormDefault="qualified"`
 * @returns The schema object
 */
export function schemaInTargetNamespace(body: string, attributes = ""): schema {
  return unmarshal(
    schema,
    `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="${XSD_NAMESPACE}" xmlns:t="${TARGET_NAMESPACE}" targetNamespace="${TARGET_NAMESPACE}" ${attributes}>
${body}
</xs:schema>`
  );
}
