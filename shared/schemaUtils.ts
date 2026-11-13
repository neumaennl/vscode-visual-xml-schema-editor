/**
 * Utility functions for working with schema objects.
 * These utilities are shared between the extension and webview.
 */

import { SCHEMA_ROOT_ID } from "./idStrategy.js";
import { attribute, attributeGroupRef, schema } from "./types.js";

/**
 * Returns true when `parentId` designates the schema root rather than a
 * specific child node.
 *
 * The two accepted values are considered equivalent schema-root selectors:
 * - `undefined` — no ID provided, defaults to the schema root
 * - `"/schema"` — the canonical schema root ID
 *
 * **Annotation command ID conventions for the schema root:**
 * Schema-root annotations use special composite IDs rather than a plain "schema" ID:
 * - `"/schema/annotation[N]"` — identifies the N-th (0-based) `xs:annotation` child on the schema
 * - `"/schema/annotation[N]/documentation[M]"` — the M-th `xs:documentation` of the N-th schema annotation
 * - `"/schema/documentation[N]"` — shorthand for the N-th doc of the first schema annotation
 *
 * @param parentId - The parent ID to test
 * @returns true if the ID refers to the schema root
 */
export function isSchemaRoot(parentId: string | undefined): boolean {
  return parentId === undefined || parentId === SCHEMA_ROOT_ID;
}

/**
 * Returns the prefixes that map to the schema's own target namespace.
 *
 * @param schemaObj - Schema whose namespace declarations should be inspected
 * @returns Non-default prefixes that resolve to targetNamespace
 */
export function getCurrentSchemaPrefixes(schemaObj: schema): string[] {
  const targetNamespace = schemaObj.targetNamespace?.toString();
  if (!targetNamespace) {
    return [];
  }
  return Object.entries(schemaObj._namespacePrefixes ?? {})
    .filter(([prefix, namespaceUri]) => prefix !== "" && namespaceUri === targetNamespace)
    .map(([prefix]) => prefix);
}

/** The extension and restriction of the complex or simple content of a complex type. */
type ContentDerivations<T> = {
  complexContent?: { extension?: T; restriction?: T };
  simpleContent?: { extension?: T; restriction?: T };
};

/** A complex type whose content may live in the extension or restriction of its complex or simple content. */
export type ContentHolder<T> = T & ContentDerivations<T>;

/**
 * Returns the `xs:extension` or `xs:restriction` of the `xs:complexContent` or `xs:simpleContent` of a
 * complex type.
 *
 * @param node - A complex type or another node that can hold content
 * @returns The extension or restriction, or `undefined` if the node has no complex or simple content
 */
export function getContentDerivation<T>(node: ContentDerivations<T>): T | undefined {
  return (
    node.complexContent?.extension ??
    node.complexContent?.restriction ??
    node.simpleContent?.extension ??
    node.simpleContent?.restriction
  );
}

/**
 * Returns the node that holds the content of a complex type: its compositor or group reference, its
 * attributes and its attribute group references. In a complex type with `xs:complexContent` or
 * `xs:simpleContent`, the content belongs in its `xs:extension` or `xs:restriction`; otherwise, and for
 * every other node, it belongs in the node itself.
 *
 * @param node - A complex type or another node that can hold content
 * @returns The extension or restriction of the content, or the node itself
 */
export function getContentContainer<T>(node: ContentHolder<T>): T {
  return getContentDerivation(node) ?? node;
}

/** A node that holds attributes and attribute group references directly. */
export type AttributeContainer = {
  attribute?: attribute[];
  attributeGroup?: attributeGroupRef[];
};

/**
 * Returns the node that holds the attributes and attribute group references of a complex type, a named
 * attribute group or the schema (see {@link getContentContainer}).
 *
 * @param node - A node that can hold attributes
 * @returns The extension or restriction of the content, or the node itself
 */
export function getAttributeContainer(node: unknown): AttributeContainer {
  return getContentContainer(node as ContentHolder<AttributeContainer>);
}
