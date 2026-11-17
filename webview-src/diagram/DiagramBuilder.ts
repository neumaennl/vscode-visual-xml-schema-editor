/**
 * `DiagramBuilder` creates a Diagram from an unmarshalled XSD schema.
 * Ported and adapted from XSD Diagram project.
 *
 * This class orchestrates the building process by delegating to specialized modules:
 * - `TypeNodeCreators`: Creates diagram nodes from schema type definitions
 * - `SchemaProcessors`: Processes schema structures and builds hierarchies
 * - `DiagramBuilderHelpers`: Provides utility functions for common operations
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import type { schema, namedGroup } from "../../shared/types";
import { generateSchemaId, SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy";
import { createElementNode, createComplexTypeNode, createSimpleTypeNode, createTopLevelNode } from "./TypeNodeCreators";
import { extractDocumentation, extractDocumentationAnnotations } from "./DiagramBuilderHelpers";
import {
  processChildCollection,
  processAnonymousTypes,
  processComplexType,
  processSimpleTypeBody,
  processSequence,
  processChoice,
  processAll,
} from "./SchemaProcessors";

/**
 * Builds diagram visualizations from XSD schema objects.
 * Coordinates the parsing and transformation of schema structures into diagram items.
 */
export class DiagramBuilder {
  private diagram: Diagram;
  private elementMap = new Map<string, DiagramItem>();

  /**
   * Creates a new `DiagramBuilder`.
   */
  constructor() {
    this.diagram = new Diagram();
  }

  /**
   * Builds a diagram from a schema object.
   * Parses the schema structure and creates a hierarchical diagram representation.
   *
   * @param schemaObj - The XSD schema object to build from
   * @returns The constructed diagram with all schema elements visualized
   */
  public buildFromSchema(schemaObj: schema): Diagram {
    this.diagram = new Diagram();
    this.elementMap.clear();
    this.diagram.currentSchemaPrefix = this.resolveTargetNamespacePrefix(schemaObj);
    this.diagram.schemaTargetNamespace = schemaObj.targetNamespace?.toString() ?? "";
    this.diagram.schemaNamespacePrefixes = { ...(schemaObj._namespacePrefixes ?? {}) };
    this.diagram.localSchemaTypeNames = undefined;

    console.log("DiagramBuilder - Building from schema:", schemaObj);

    // Create a root node representing the schema
    const targetNs = schemaObj.targetNamespace ?? "no namespace";
    const schemaNode = new DiagramItem(SCHEMA_ROOT_ID, `Schema: ${targetNs}`, DiagramItemType.element, this.diagram);
    schemaNode.documentationAnnotations = extractDocumentationAnnotations(schemaNode.id, schemaObj.annotation);
    schemaNode.documentation = extractDocumentation(schemaObj.annotation) ?? "";
    schemaNode.attributes = (schemaObj.attribute ?? [])
      .filter((attr) => !!attr.name)
      .map((attr) => ({
        name: attr.name,
        type: attr.type_ ?? "inner simpleType or ref",
        defaultValue: attr.default_,
        fixedValue: attr.fixed,
      }));

    // Process the top-level components with their content
    const diagram = this.diagram;
    // jscpd:ignore-start -- calls of one function with the collection of each kind, not duplicated logic
    processChildCollection(
      schemaNode,
      schemaObj.element,
      (elem) => createElementNode(elem, diagram),
      processAnonymousTypes
    );
    processChildCollection(
      schemaNode,
      schemaObj.complexType,
      (ct) => createComplexTypeNode(ct, diagram),
      processComplexType
    );
    processChildCollection(
      schemaNode,
      schemaObj.simpleType,
      (st) => createSimpleTypeNode(st, diagram),
      processSimpleTypeBody
    );
    processChildCollection(schemaNode, schemaObj.group, (grp) => this.createNamedGroup(grp));
    // jscpd:ignore-end

    // If no children were added, add a placeholder
    if (schemaNode.childElements.length === 0) {
      const placeholder = new DiagramItem(
        generateSchemaId({
          nodeType: SchemaNodeType.Element,
          name: "placeholder",
          parentId: schemaNode.id,
          position: 0,
        }),
        "No elements found",
        DiagramItemType.element,
        this.diagram
      );
      schemaNode.addChild(placeholder);
    }

    this.diagram.addRootElement(schemaNode);
    return this.diagram;
  }

  /**
   * Finds a prefix that the schema declares for its target namespace.
   *
   * @param schemaObj - The schema
   * @returns The first non-empty prefix of the target namespace, or undefined if there is none
   */
  private resolveTargetNamespacePrefix(schemaObj: schema): string | undefined {
    const targetNamespace = schemaObj.targetNamespace?.toString();
    if (!targetNamespace || !schemaObj._namespacePrefixes) {
      return undefined;
    }

    // Generated schema bindings expose namespace declarations as `_namespacePrefixes`.
    for (const [prefix, namespaceUri] of Object.entries(schemaObj._namespacePrefixes)) {
      if (prefix && namespaceUri === targetNamespace) {
        return prefix;
      }
    }

    return undefined;
  }

  /**
   * Creates the diagram item of a named group with its compositor.
   *
   * @param group - The named group
   * @returns The item, or null if the group has no name
   */
  private createNamedGroup(group: namedGroup): DiagramItem | null {
    const item = createTopLevelNode(group, SchemaNodeType.Group, DiagramItemType.group, this.diagram);
    if (!item) {
      return null;
    }

    if (group.sequence) {
      processSequence(item, group.sequence, 0);
    }
    if (group.choice) {
      processChoice(item, group.choice, 0);
    }
    if (group.all) {
      processAll(item, group.all, 0);
    }

    return item;
  }
}
