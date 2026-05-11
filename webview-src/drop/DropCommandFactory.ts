import { schema, SchemaCommand } from "../../shared/types";
import { toArray } from "../../shared/schemaUtils";
import { DiagramItem, DiagramItemGroupType, DiagramItemType } from "../diagram";
import { generateSchemaId, SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";

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
      case PaletteSchemaConstruct.Restriction:
        return {
          type: "addSimpleType",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            typeName: this.nextName("SimpleType"),
            baseType: "xs:string",
          },
        };
      case PaletteSchemaConstruct.Extension:
        return {
          type: "addComplexType",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            typeName: this.nextName("ComplexType"),
            contentModel: "sequence",
            baseType: "xs:anyType",
            derivationKind: "extension",
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
      case PaletteSchemaConstruct.Restriction:
        return this.createRestrictionNodeDropCommand(item);
      case PaletteSchemaConstruct.Extension:
        return this.createExtensionNodeDropCommand(item);
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

  private createRestrictionNodeDropCommand(item: DiagramItem): SchemaCommand | null {
    if (this.isSchemaRoot(item)) {
      return this.createTopLevelDropCommand(PaletteSchemaConstruct.Restriction);
    }
    if (item.itemType === DiagramItemType.element) {
      if (item.hasAnonymousComplexType) {
        return {
          type: "modifyComplexType",
          payload: {
            typeId: this.getAnonymousComplexTypeId(item),
            baseType: this.getRestrictionBaseType(item),
            derivationKind: "restriction",
          },
        };
      }
      if (item.isSimpleContent) {
        return {
          type: "modifySimpleType",
          payload: {
            typeId: this.getAnonymousSimpleTypeId(item),
            baseType: this.getRestrictionBaseType(item),
          },
        };
      }
      return {
        type: "addSimpleType",
        payload: {
          parentId: item.id,
          baseType: this.getRestrictionBaseType(item),
        },
      };
    }
    if (this.isSimpleTypeNode(item)) {
      return {
        type: "modifySimpleType",
        payload: {
          typeId: item.id,
          baseType: this.getRestrictionBaseType(item),
        },
      };
    }
    if (this.isComplexTypeNode(item)) {
      return {
        type: "modifyComplexType",
        payload: {
          typeId: item.id,
          baseType: this.getRestrictionBaseType(item),
          derivationKind: "restriction",
        },
      };
    }
    return null;
  }

  private createExtensionNodeDropCommand(item: DiagramItem): SchemaCommand | null {
    if (this.isSchemaRoot(item)) {
      return this.createTopLevelDropCommand(PaletteSchemaConstruct.Extension);
    }
    if (item.itemType === DiagramItemType.element) {
      if (item.hasAnonymousComplexType) {
        return {
          type: "modifyComplexType",
          payload: {
            typeId: this.getAnonymousComplexTypeId(item),
            baseType: this.getExtensionBaseType(item),
            derivationKind: "extension",
          },
        };
      }
      return {
        type: "addComplexType",
        payload: {
          parentId: item.id,
          contentModel: "sequence",
          baseType: this.getExtensionBaseType(item),
          derivationKind: "extension",
        },
      };
    }
    if (this.isComplexTypeNode(item)) {
      return {
        type: "modifyComplexType",
        payload: {
          typeId: item.id,
          baseType: this.getExtensionBaseType(item),
          derivationKind: "extension",
        },
      };
    }
    return null;
  }

  private isSchemaRoot(item: DiagramItem): boolean {
    return item.id === SCHEMA_ROOT_ID;
  }

  private isSimpleTypeNode(item: DiagramItem): boolean {
    return item.itemType === DiagramItemType.type && item.type.startsWith("simpleType");
  }

  private isComplexTypeNode(item: DiagramItem): boolean {
    return item.itemType === DiagramItemType.type && item.type.startsWith("complexType");
  }

  private getAnonymousSimpleTypeId(item: DiagramItem): string {
    return generateSchemaId({
      nodeType: SchemaNodeType.AnonymousSimpleType,
      parentId: item.id,
      position: 0,
    });
  }

  private getAnonymousComplexTypeId(item: DiagramItem): string {
    return generateSchemaId({
      nodeType: SchemaNodeType.AnonymousComplexType,
      parentId: item.id,
      position: 0,
    });
  }

  private getRestrictionBaseType(item: DiagramItem): string {
    return this.extractDisplayedBaseType(item.type) ?? "xs:string";
  }

  private getExtensionBaseType(item: DiagramItem): string {
    return this.extractDisplayedBaseType(item.type) ?? "xs:anyType";
  }

  private extractDisplayedBaseType(typeText: string): string | null {
    const restricted = typeText.match(/\(restricts ([^)]+)\)/);
    if (restricted?.[1]) {
      return restricted[1].trim();
    }
    const extended = typeText.match(/\(extends ([^)]+)\)/);
    if (extended?.[1]) {
      return extended[1].trim();
    }
    const trimmed = typeText.trim();
    if (trimmed && !trimmed.startsWith("<anonymous ")) {
      return trimmed;
    }
    return null;
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
