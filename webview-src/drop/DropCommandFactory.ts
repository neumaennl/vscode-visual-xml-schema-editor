import type { schema, SchemaCommand } from "../../shared/types";
import type { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram";
import { generateSchemaId, parseSchemaId, SCHEMA_ROOT_ID, SchemaNodeType } from "../../shared/idStrategy";
import { PaletteSchemaConstruct } from "../palette/PaletteSchemaConstruct";
import { isFacetPaletteConstruct } from "../palette/FacetIconStyles";
import { createFacetNodeDropCommand, getAnonymousComplexTypeId, getAnonymousSimpleTypeId, getExtensionBaseType, getRestrictionBaseType, isComplexTypeNode, isSimpleTypeNode } from "./DropCommandFactoryTypeHelpers";

/**
 * Creates schema commands from drag-and-drop actions.
 * Encapsulates default naming and name-collision handling.
 */
export class DropCommandFactory {
  private schemaTopLevelNames = new Set<string>();

  /**
   * Checks whether dropping a construct on a node is allowed without
   * mutating internal naming state.
   *
   * @param item - Drop target node
   * @param construct - Palette schema construct
   * @returns True when the drop is valid for the target node
   */
  public canDropOnNode(item: DiagramItem, construct: PaletteSchemaConstruct): boolean {
    return this.createNodeDropCommandInternal(item, construct, false) !== null;
  }

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
    return this.createTopLevelDropCommandInternal(construct, true);
  }

  /**
   * Creates the command that adds a new top-level component of the dropped kind.
   *
   * @param construct - Palette schema construct
   * @param reserveNames - Whether the new name is reserved, so that the next drop gets another one
   * @returns Command or null if the construct cannot be added at the top level
   */
  private createTopLevelDropCommandInternal(
    construct: PaletteSchemaConstruct,
    reserveNames: boolean
  ): SchemaCommand | null {
    switch (construct) {
      case PaletteSchemaConstruct.Element:
        return {
          type: "addElement",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            elementName: this.nextName("Element", reserveNames),
            elementType: "xs:string",
          },
        };
      case PaletteSchemaConstruct.Attribute:
        return {
          type: "addAttribute",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            attributeName: this.nextName("Attribute", reserveNames),
            attributeType: "xs:string",
          },
        };
      case PaletteSchemaConstruct.ComplexType:
        return {
          type: "addComplexType",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            typeName: this.nextName("ComplexType", reserveNames),
            contentModel: "sequence",
          },
        };
      case PaletteSchemaConstruct.SimpleType:
      case PaletteSchemaConstruct.Restriction:
        return {
          type: "addSimpleType",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            typeName: this.nextName("SimpleType", reserveNames),
            baseType: "xs:string",
          },
        };
      case PaletteSchemaConstruct.Extension:
        return {
          type: "addComplexType",
          payload: {
            parentId: SCHEMA_ROOT_ID,
            typeName: this.nextName("ComplexType", reserveNames),
            contentModel: "sequence",
            baseType: "xs:anyType",
            derivationKind: "extension",
          },
        };
      case PaletteSchemaConstruct.Group:
        return {
          type: "addGroup",
          payload: {
            groupName: this.nextName("Group", reserveNames),
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
    return this.createNodeDropCommandInternal(item, construct, true);
  }

  /**
   * Creates the command for a drop on a node, depending on the dropped construct.
   *
   * @param item - Drop target node
   * @param construct - Palette schema construct
   * @param reserveNames - Whether a new name is reserved, so that the next drop gets another one
   * @returns Command or null if the target cannot take the construct
   */
  private createNodeDropCommandInternal(
    item: DiagramItem,
    construct: PaletteSchemaConstruct,
    reserveNames: boolean
  ): SchemaCommand | null {
    if (isFacetPaletteConstruct(construct)) {
      return createFacetNodeDropCommand(item, construct);
    }
    switch (construct) {
      case PaletteSchemaConstruct.Element:
        return this.createElementNodeDropCommand(item, reserveNames);
      case PaletteSchemaConstruct.Attribute:
        return this.createAttributeNodeDropCommand(item, reserveNames);
      case PaletteSchemaConstruct.SimpleType:
      case PaletteSchemaConstruct.ComplexType:
        return this.createTypeNodeDropCommand(item, reserveNames, construct);
      case PaletteSchemaConstruct.Restriction:
      case PaletteSchemaConstruct.Extension:
        return this.createDerivationNodeDropCommand(item, reserveNames, construct);
      case PaletteSchemaConstruct.Group:
        return this.createGroupNodeDropCommand(item, reserveNames);
      case PaletteSchemaConstruct.Sequence:
        return this.createCompositorNodeDropCommand(item, "sequence");
      case PaletteSchemaConstruct.Choice:
        return this.createCompositorNodeDropCommand(item, "choice");
      case PaletteSchemaConstruct.All:
        return this.createCompositorNodeDropCommand(item, "all");
      default:
        return null;
    }
  }

  /**
   * Generate deterministic default names for newly created schema objects.
   *
   * @param prefix - Name prefix
   * @param reserveName - Whether the name is reserved, so that the next call returns another one
   * @returns Generated name
   */
  private nextName(prefix: string, reserveName: boolean): string {
    let nameCounter = 1;
    while (this.schemaTopLevelNames.has(`${prefix}${nameCounter}`)) {
      nameCounter += 1;
    }
    const candidate = `${prefix}${nameCounter}`;
    if (reserveName) {
      this.schemaTopLevelNames.add(candidate);
    }
    return candidate;
  }

  /**
   * Creates the command that adds an element to the schema root or to a compositor.
   *
   * @param item - Drop target node
   * @param reserveNames - Whether the new name is reserved
   * @returns Command or null if the target cannot hold elements
   */
  private createElementNodeDropCommand(
    item: DiagramItem,
    reserveNames: boolean
  ): SchemaCommand | null {
    if (
      this.isSchemaRoot(item) ||
      item.itemType === DiagramItemType.group
    ) {
      return {
        type: "addElement",
        payload: {
          parentId: item.id,
          elementName: this.nextName("Element", reserveNames),
          elementType: "xs:string",
        },
      };
    }
    return null;
  }

  /**
   * Creates the command that adds an attribute to the schema root, to a complexType, or to the anonymous
   * complexType of an element.
   *
   * @param item - Drop target node
   * @param reserveNames - Whether the new name is reserved
   * @returns Command or null if the target cannot hold attributes
   */
  private createAttributeNodeDropCommand(
    item: DiagramItem,
    reserveNames: boolean
  ): SchemaCommand | null {
    if (this.isSchemaRoot(item) || isComplexTypeNode(item)) {
      return {
        type: "addAttribute",
        payload: {
          parentId: item.id,
          attributeName: this.nextName("Attribute", reserveNames),
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
          attributeName: this.nextName("Attribute", reserveNames),
          attributeType: "xs:string",
        },
      };
    }
    return null;
  }

  /**
   * Creates the command that adds a simpleType or complexType: a top-level type on the schema root, or an
   * anonymous type in an element.
   *
   * @param item - Drop target node
   * @param reserveNames - Whether the new name is reserved
   * @param construct - `SimpleType` or `ComplexType`
   * @returns Command or null if the target cannot hold the type
   */
  private createTypeNodeDropCommand(
    item: DiagramItem,
    reserveNames: boolean,
    construct: PaletteSchemaConstruct.SimpleType | PaletteSchemaConstruct.ComplexType
  ): SchemaCommand | null {
    const isRoot = this.isSchemaRoot(item);
    if (!isRoot && item.itemType !== DiagramItemType.element) {
      return null;
    }
    if (construct === PaletteSchemaConstruct.SimpleType) {
      const typeName = isRoot ? { typeName: this.nextName("SimpleType", reserveNames) } : {};
      return { type: "addSimpleType", payload: { parentId: item.id, ...typeName, baseType: "xs:string" } };
    }
    const typeName = isRoot ? { typeName: this.nextName("ComplexType", reserveNames) } : {};
    return { type: "addComplexType", payload: { parentId: item.id, ...typeName, contentModel: "sequence" } };
  }


  /**
   * Creates the command that adds a named group, which only the schema root can hold.
   *
   * @param item - Drop target node
   * @param reserveNames - Whether the new name is reserved
   * @returns Command or null if the target is not the schema root
   */
  private createGroupNodeDropCommand(
    item: DiagramItem,
    reserveNames: boolean
  ): SchemaCommand | null {
    if (this.isSchemaRoot(item)) {
      return {
        type: "addGroup",
        payload: {
          groupName: this.nextName("Group", reserveNames),
          contentModel: "sequence",
        },
      };
    }
    return null;
  }

  /**
   * Creates the command that sets the compositor of a complexType, of the anonymous complexType of an
   * element (which gets one if it has none), or of a named group.
   *
   * @param item - Drop target node
   * @param contentModel - The dropped compositor
   * @returns Command or null if the target cannot hold a compositor
   */
  private createCompositorNodeDropCommand(
    item: DiagramItem,
    contentModel: "sequence" | "choice" | "all"
  ): SchemaCommand | null {
    if (isComplexTypeNode(item)) {
      return {
        type: "modifyComplexType",
        payload: {
          typeId: item.id,
          contentModel,
        },
      };
    }

    if (item.itemType === DiagramItemType.element) {
      if (item.hasAnonymousComplexType) {
        return {
          type: "modifyComplexType",
          payload: {
            typeId: getAnonymousComplexTypeId(item),
            contentModel,
          },
        };
      }
      return {
        type: "addComplexType",
        payload: {
          parentId: item.id,
          contentModel,
        },
      };
    }

    if (this.isNamedGroupDefinition(item)) {
      return {
        type: "modifyGroup",
        payload: {
          groupId: item.id,
          contentModel,
        },
      };
    }

    return null;
  }

  /**
   * Creates the command for a dropped restriction or extension:
   * - on the schema root, a new top-level type;
   * - on an element with an anonymous complexType, or on a complexType, a new derivation of that type;
   * - on another element, a new anonymous simpleType (restriction) or complexType (extension);
   * - on a simpleType, a new base type (restriction only).
   *
   * @param item - Drop target node
   * @param reserveNames - Whether a new name is reserved
   * @param construct - Restriction or Extension
   * @returns Command or null if unsupported
   */
  private createDerivationNodeDropCommand(
    item: DiagramItem,
    reserveNames: boolean,
    construct: PaletteSchemaConstruct.Restriction | PaletteSchemaConstruct.Extension
  ): SchemaCommand | null {
    if (this.isSchemaRoot(item)) {
      return this.createTopLevelDropCommandInternal(construct, reserveNames);
    }
    const isRestriction = construct === PaletteSchemaConstruct.Restriction;
    const derivationKind = isRestriction ? "restriction" : "extension";
    const baseType = isRestriction ? getRestrictionBaseType(item) : getExtensionBaseType(item);
    const isElement = item.itemType === DiagramItemType.element;

    if ((isElement && item.hasAnonymousComplexType) || (!isElement && isComplexTypeNode(item))) {
      const typeId = isElement ? getAnonymousComplexTypeId(item) : item.id;
      return { type: "modifyComplexType", payload: { typeId, baseType, derivationKind } };
    }
    if (isElement && !isRestriction) {
      return {
        type: "addComplexType",
        payload: { parentId: item.id, contentModel: "sequence", baseType, derivationKind },
      };
    }
    if (isElement) {
      return item.isSimpleContent
        ? { type: "modifySimpleType", payload: { typeId: getAnonymousSimpleTypeId(item), baseType } }
        : { type: "addSimpleType", payload: { parentId: item.id, baseType } };
    }
    if (isRestriction && isSimpleTypeNode(item)) {
      return { type: "modifySimpleType", payload: { typeId: item.id, baseType } };
    }
    return null;
  }

  /**
   * Tells whether the item is the schema root.
   *
   * @param item - The diagram item
   * @returns True for the schema root
   */
  private isSchemaRoot(item: DiagramItem): boolean {
    return item.id === SCHEMA_ROOT_ID;
  }

  /**
   * Tells whether the item is a named group definition, not a group reference or a compositor.
   *
   * @param item - The diagram item
   * @returns True for a top-level named group
   */
  private isNamedGroupDefinition(item: DiagramItem): boolean {
    if (item.itemType !== DiagramItemType.group) {
      return false;
    }
    try {
      const parsed = parseSchemaId(item.id);
      return parsed.nodeType === SchemaNodeType.Group && parsed.parentId === undefined;
    } catch {
      return false;
    }
  }

  /**
   * Adds all valid `name` values from a schema node collection to the name set.
   *
   * @param nodes - Named schema collection
   */
  private addNamedNodesToSet(
    nodes: Array<{ name?: string }> | undefined
  ): void {
    (nodes ?? []).forEach((node) => {
      if (node.name) {
        this.schemaTopLevelNames.add(node.name);
      }
    });
  }
}
