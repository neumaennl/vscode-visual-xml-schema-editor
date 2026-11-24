/**
 * `DiagramBuilder` creates a Diagram from an unmarshalled XSD schema.
 * Ported and adapted from XSD Diagram project.
 *
 * This class orchestrates the building process by delegating to specialized modules:
 * - `TypeNodeCreators`: Creates the items of the named top-level components
 * - `SchemaProcessors`: Processes schema structures and builds hierarchies
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType } from "./DiagramTypes";
import type { schema, namedGroup } from "../../shared/types";
import { SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy";
import { createTopLevelNode } from "./TypeNodeCreators";
import { processChildCollection } from "./SchemaProcessorsCommon";
import {
  processAnonymousTypes,
  processComplexType,
  processSequence,
  processChoice,
  processAll,
} from "./SchemaProcessors";

/**
 * Builds diagram visualizations from XSD schema objects.
 * Coordinates the parsing and transformation of schema structures into diagram items.
 */
export class DiagramBuilder {
  /**
   * Builds a diagram from a schema object.
   * Parses the schema structure and creates a hierarchical diagram representation.
   *
   * @param schemaObj - The XSD schema object to build from
   * @returns The constructed diagram with all schema elements visualized
   */
  public buildFromSchema(schemaObj: schema): Diagram {
    const diagram = new Diagram(schemaObj);

    console.log("DiagramBuilder - Building from schema:", schemaObj);

    // Create a root node representing the schema
    const targetNs = schemaObj.targetNamespace ?? "no namespace";
    const schemaNode = new DiagramItem(
      SCHEMA_ROOT_ID,
      `Schema: ${targetNs}`,
      DiagramItemType.element,
      schemaObj,
      diagram
    );
    schemaNode.nodeType = SchemaNodeType.Schema;

    // Process the top-level components with their content
    // jscpd:ignore-start -- calls of one function with the collection of each kind, not duplicated logic
    processChildCollection(
      schemaNode,
      schemaObj.element,
      (elem) => createTopLevelNode(elem, SchemaNodeType.Element, DiagramItemType.element, diagram),
      processAnonymousTypes
    );
    processChildCollection(
      schemaNode,
      schemaObj.complexType,
      (ct) => createTopLevelNode(ct, SchemaNodeType.ComplexType, DiagramItemType.type, diagram),
      processComplexType
    );
    processChildCollection(schemaNode, schemaObj.simpleType, (st) =>
      createTopLevelNode(st, SchemaNodeType.SimpleType, DiagramItemType.type, diagram)
    );
    processChildCollection(
      schemaNode,
      schemaObj.group,
      (grp) => createTopLevelNode(grp, SchemaNodeType.Group, DiagramItemType.group, diagram),
      processNamedGroup
    );
    // jscpd:ignore-end

    diagram.addRootElement(schemaNode);
    return diagram;
  }
}

/**
 * Adds the compositor of a named group to the item of the group.
 *
 * @param item - The item of the named group
 * @param group - The named group
 */
function processNamedGroup(item: DiagramItem, group: namedGroup): void {
  if (group.sequence) {
    processSequence(item, group.sequence, 0);
  }
  if (group.choice) {
    processChoice(item, group.choice, 0);
  }
  if (group.all) {
    processAll(item, group.all, 0);
  }
}
