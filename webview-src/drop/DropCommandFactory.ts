import { schema, SchemaCommand } from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { DiagramItem, DiagramItemGroupType, DiagramItemType } from "../diagram";
import { generateSchemaId, SchemaNodeType } from "../../shared/idStrategy";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";

const SCHEMA_ROOT_ID = generateSchemaId({ nodeType: SchemaNodeType.Schema });

/**
 * Creates schema commands from drag-and-drop actions.
 * Encapsulates default naming and name-collision handling.
 */
export class DropCommandFactory {
  private schemaTopLevelNames = new Set<string>();

  /**
   * Refresh the cached top-level declaration names from the latest schema.
   *
   * @param schemaObj - Current schema snapshot
   */
  public updateNamesFromSchema(schemaObj: schema): void {
    this.schemaTopLevelNames.clear();
    this.addNamedNodesToSet(schemaObj.element);
    this.addNamedNodesToSet(schemaObj.attribute);
    this.addNamedNodesToSet(schemaObj.simpleType);
    this.addNamedNodesToSet(schemaObj.complexType);
    this.addNamedNodesToSet(schemaObj.group);
    this.addNamedNodesToSet(schemaObj.attributeGroup);
  }

  /**
   * Create a command payload for a top-level drop.
   *
   * @param construct - Palette schema construct
   * @returns Command or null if unsupported
   */
  public createTopLevelDropCommand(construct: PaletteSchemaConstruct): SchemaCommand | null {
    switch (construct) {
      case PaletteSchemaConstruct.Element:
        return {
          type: "addElement",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            elementName: this.nextName("Element"),
            elementType: "xs:string",
          },
        };
      case PaletteSchemaConstruct.Attribute:
        return {
          type: "addAttribute",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            attributeName: this.nextName("Attribute"),
            attributeType: "xs:string",
          },
        };
      case PaletteSchemaConstruct.SimpleType:
        return {
          type: "addSimpleType",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            typeName: this.nextName("SimpleType"),
            baseType: "xs:string",
          },
        };
      case PaletteSchemaConstruct.ComplexType:
        return {
          type: "addComplexType",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            typeName: this.nextName("ComplexType"),
            contentModel: "sequence",
          },
        };
      case PaletteSchemaConstruct.Group:
        return {
          type: "addGroup",
          payload: {
            groupName: this.nextName("Group"),
            contentModel: "sequence",
          },
        };
      default:
        return null;
    }
  }

  /**
   * Create a command payload for a node-level drop.
   *
   * @param item - Drop target node
   * @param construct - Palette schema construct
   * @returns Command or null if unsupported
   */
  public createNodeDropCommand(
    item: DiagramItem,
    construct: PaletteSchemaConstruct
  ): SchemaCommand | null {
    switch (construct) {
      case PaletteSchemaConstruct.Element:
        return this.createElementNodeDropCommand(item);
      case PaletteSchemaConstruct.Attribute:
        return this.createAttributeNodeDropCommand(item);
      case PaletteSchemaConstruct.SimpleType:
        return this.createSimpleTypeNodeDropCommand(item);
      case PaletteSchemaConstruct.ComplexType:
        return this.createComplexTypeNodeDropCommand(item);
      case PaletteSchemaConstruct.Group:
        return this.createGroupNodeDropCommand(item);
      default:
        return null;
    }
  }

  /**
   * Generate deterministic default names for newly created schema objects.
   *
   * @param prefix - Name prefix
   * @returns Generated name
   */
  private nextName(prefix: string): string {
    let nameCounter = 1;
    while (this.schemaTopLevelNames.has(`${prefix}${nameCounter}`)) {
      nameCounter += 1;
    }
    const candidate = `${prefix}${nameCounter}`;
    this.schemaTopLevelNames.add(candidate);
    return candidate;
  }

  private createElementNodeDropCommand(item: DiagramItem): SchemaCommand | null {
    if (
      this.isSchemaRoot(item) ||
      (item.itemType === DiagramItemType.group &&
        (item.groupType === DiagramItemGroupType.Sequence ||
          item.groupType === DiagramItemGroupType.Choice ||
          item.groupType === DiagramItemGroupType.All))
    ) {
      return {
        type: "addElement",
        payload: {
          parentId: item.id,
          elementName: this.nextName("Element"),
          elementType: "xs:string",
        },
      };
    }
    return null;
  }

  private createAttributeNodeDropCommand(
    item: DiagramItem
  ): SchemaCommand | null {
    if (
      this.isSchemaRoot(item) ||
      (item.itemType === DiagramItemType.type && item.type === "complexType")
    ) {
      return {
        type: "addAttribute",
        payload: {
          parentId: item.id,
          attributeName: this.nextName("Attribute"),
          attributeType: "xs:string",
        },
      };
    }
    if (
      item.itemType === DiagramItemType.element &&
      item.hasAnonymousComplexType
    ) {
      const anonCtId = generateSchemaId({
        nodeType: SchemaNodeType.AnonymousComplexType,
        parentId: item.id,
        position: 0,
      });
      return {
        type: "addAttribute",
        payload: {
          parentId: anonCtId,
          attributeName: this.nextName("Attribute"),
          attributeType: "xs:string",
        },
      };
    }
    return null;
  }

  private createSimpleTypeNodeDropCommand(
    item: DiagramItem
  ): SchemaCommand | null {
    if (this.isSchemaRoot(item) || item.itemType === DiagramItemType.element) {
      return {
        type: "addSimpleType",
        payload: {
          parentId: item.id,
          ...(this.isSchemaRoot(item)
            ? { typeName: this.nextName("SimpleType") }
            : {}),
          baseType: "xs:string",
        },
      };
    }
    return null;
  }

  private createComplexTypeNodeDropCommand(
    item: DiagramItem
  ): SchemaCommand | null {
    if (this.isSchemaRoot(item) || item.itemType === DiagramItemType.element) {
      return {
        type: "addComplexType",
        payload: {
          parentId: item.id,
          ...(this.isSchemaRoot(item)
            ? { typeName: this.nextName("ComplexType") }
            : {}),
          contentModel: "sequence",
        },
      };
    }
    return null;
  }

  private createGroupNodeDropCommand(item: DiagramItem): SchemaCommand | null {
    if (this.isSchemaRoot(item)) {
      return {
        type: "addGroup",
        payload: {
          groupName: this.nextName("Group"),
          contentModel: "sequence",
        },
      };
    }
    return null;
  }

  private isSchemaRoot(item: DiagramItem): boolean {
    return item.id === SCHEMA_ROOT_ID;
  }

  /**
   * Adds all valid `name` values from a schema node collection to the name set.
   *
   * @param nodes - Named schema collection
   */
  private addNamedNodesToSet(
    nodes: { name?: string }[] | { name?: string } | undefined
  ): void {
    toArray(nodes).forEach((node) => {
      if (node.name) {
        this.schemaTopLevelNames.add(node.name);
      }
    });
  }
}
