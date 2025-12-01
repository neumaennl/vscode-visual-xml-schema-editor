/**
 * DiagramBuilder creates a Diagram from an unmarshalled XSD schema
 * Ported and adapted from XSD Diagram project
 */

import { Diagram } from "./Diagram";
import { DiagramItem } from "./DiagramItem";
import { DiagramItemType, DiagramItemGroupType } from "./DiagramTypes";
import { schema } from "../../shared/types";

export class DiagramBuilder {
  private diagram: Diagram;
  private elementMap: Map<string, DiagramItem> = new Map();
  private idCounter: number = 0;

  /**
   * Create a new DiagramBuilder
   */
  constructor() {
    this.diagram = new Diagram();
  }

  /**
   * Build a diagram from a schema object
   * @param schemaObj - The XSD schema object to build from
   * @returns The constructed diagram
   */
  public buildFromSchema(schemaObj: schema | any): Diagram {
    this.diagram = new Diagram();
    this.elementMap.clear();
    this.idCounter = 0;

    console.log("DiagramBuilder - Building from schema:", schemaObj);

    // For now, create a simplified representation
    // TODO: Properly traverse the schema structure once we understand the generated class hierarchy better

    // Create a root node representing the schema
    const targetNs = schemaObj?.targetNamespace?.toString() || "no namespace";
    const schemaNode = new DiagramItem(
      this.generateId(),
      `Schema: ${targetNs}`,
      DiagramItemType.element,
      this.diagram
    );

    // Try to extract any available information from the schema
    // Note: The generated classes need to be enhanced to properly expose child elements
    if ((schemaObj as any).element) {
      const elements = Array.isArray((schemaObj as any).element)
        ? (schemaObj as any).element
        : [(schemaObj as any).element];

      for (const elem of elements) {
        const elemNode = this.createElementNode(elem);
        if (elemNode) {
          schemaNode.addChild(elemNode);
        }
      }
    }

    if ((schemaObj as any).complexType) {
      const complexTypes = Array.isArray((schemaObj as any).complexType)
        ? (schemaObj as any).complexType
        : [(schemaObj as any).complexType];

      for (const ct of complexTypes) {
        const typeNode = this.createComplexTypeNode(ct);
        if (typeNode) {
          schemaNode.addChild(typeNode);
        }
      }
    }

    if ((schemaObj as any).simpleType) {
      const simpleTypes = Array.isArray((schemaObj as any).simpleType)
        ? (schemaObj as any).simpleType
        : [(schemaObj as any).simpleType];

      for (const st of simpleTypes) {
        const typeNode = this.createSimpleTypeNode(st);
        if (typeNode) {
          schemaNode.addChild(typeNode);
        }
      }
    }

    // If no children were added, add a placeholder
    if (schemaNode.childElements.length === 0) {
      const placeholder = new DiagramItem(
        this.generateId(),
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
   * Create a diagram item node from an element definition
   * @param element - Element definition from schema
   * @returns The created diagram item or null if element is invalid
   */
  private createElementNode(element: any): DiagramItem | null {
    if (!element || !element.name) {
      return null;
    }

    const item = new DiagramItem(
      this.generateId(),
      element.name.toString(),
      DiagramItemType.element,
      this.diagram
    );

    // Extract type information
    if (element.type_) {
      item.type = element.type_.toString();
    }

    // Extract namespace
    if (element.targetNamespace) {
      item.namespace = element.targetNamespace.toString();
    }

    // Extract occurrence constraints
    if (element.minOccurs !== undefined) {
      item.minOccurrence = parseInt(element.minOccurs.toString(), 10) || 0;
    }
    if (element.maxOccurs !== undefined) {
      const maxOccurs = element.maxOccurs.toString();
      item.maxOccurrence =
        maxOccurs === "unbounded" ? -1 : parseInt(maxOccurs, 10) || 1;
    }

    // Extract documentation
    item.documentation = this.extractDocumentation(element.annotation) ?? "";

    // Process anonymous inline complex type
    if (element.complexType) {
      this.processAnonymousComplexType(item, element.complexType);
    }

    // Process anonymous inline simple type
    if (element.simpleType) {
      this.processAnonymousSimpleType(item, element.simpleType);
    }

    return item;
  }

  /**
   * Create a diagram item node from a complex type definition
   * @param complexType - Complex type definition from schema
   * @returns The created diagram item or null if type is invalid
   */
  private createComplexTypeNode(complexType: any): DiagramItem | null {
    if (!complexType || !complexType.name) {
      return null;
    }

    const item = new DiagramItem(
      this.generateId(),
      complexType.name.toString(),
      DiagramItemType.type,
      this.diagram
    );

    this.processComplexType(item, complexType);

    return item;
  }

  /**
   * Create a diagram item node from a simple type definition
   * @param simpleType - Simple type definition from schema
   * @returns The created diagram item or null if type is invalid
   */
  private createSimpleTypeNode(simpleType: any): DiagramItem | null {
    if (!simpleType || !simpleType.name) {
      return null;
    }

    const item = new DiagramItem(
      this.generateId(),
      simpleType.name.toString(),
      DiagramItemType.type,
      this.diagram
    );

    item.isSimpleContent = true;

    // Extract documentation
    item.documentation = this.extractDocumentation(simpleType.annotation) ?? "";

    return item;
  }

  /**
   * Process an anonymous inline complex type within an element
   * @param parent - Parent element item containing the anonymous type
   * @param complexType - Anonymous complex type definition
   */
  private processAnonymousComplexType(
    parent: DiagramItem,
    complexType: any
  ): void {
    // Mark the parent type as anonymous complex type
    if (!parent.type) {
      parent.type = "<anonymous complexType>";
    }

    // Merge documentation from the anonymous type if parent has none
    if (!parent.documentation) {
      parent.documentation =
        this.extractDocumentation(complexType.annotation) ?? "";
    }

    // Process the complex type structure directly on the parent
    // This will attach attributes and groups to the parent element
    this.processComplexType(parent, complexType);
  }

  /**
   * Process an anonymous inline simple type within an element
   * @param parent - Parent element item containing the anonymous type
   * @param simpleType - Anonymous simple type definition
   */
  private processAnonymousSimpleType(
    parent: DiagramItem,
    simpleType: any
  ): void {
    // Mark the parent as having simple content
    parent.isSimpleContent = true;

    // Merge documentation from the anonymous type if parent has none
    if (!parent.documentation) {
      parent.documentation =
        this.extractDocumentation(simpleType.annotation) ?? "";
    }

    // Process restriction/list/union if present to extract base type
    if (simpleType.restriction) {
      this.processSimpleTypeRestriction(parent, simpleType.restriction);
    }

    // Set type if not already set
    if (!parent.type && simpleType.restriction?.base) {
      parent.type = `<simpleType: ${simpleType.restriction.base.toString()}>`;
    } else if (!parent.type) {
      parent.type = "<anonymous simpleType>";
    }
  }

  /**
   * Process a simple type restriction to extract base type and facets
   * @param parent - Parent simple type item
   * @param restriction - Restriction definition
   */
  private processSimpleTypeRestriction(
    parent: DiagramItem,
    restriction: any
  ): void {
    // Extract base type
    if (restriction.base) {
      parent.type = restriction.base.toString();
    }

    // TODO: Could also extract enumeration values, patterns, etc. here in the future
  }

  /**
   * Process a complex type and add its children to the parent item
   * @param parent - Parent diagram item to add children to
   * @param complexType - Complex type definition from schema
   */
  private processComplexType(parent: DiagramItem, complexType: any): void {
    // Process attributes
    this.extractAttributes(parent, complexType);

    // Process sequence
    if (complexType.sequence) {
      this.processSequence(parent, complexType.sequence);
    }

    // Process choice
    if (complexType.choice) {
      this.processChoice(parent, complexType.choice);
    }

    // Process all
    if (complexType.all) {
      this.processAll(parent, complexType.all);
    }

    // Process complexContent/extension
    if (complexType.complexContent?.extension) {
      this.processExtension(parent, complexType.complexContent.extension);
    }

    // Process simpleContent
    if (complexType.simpleContent) {
      parent.isSimpleContent = true;
    }
  }

  /**
   * Process a sequence group in the schema
   * @param parent - Parent diagram item to add the sequence to
   * @param sequence - Sequence definition from schema
   */
  private processSequence(parent: DiagramItem, sequence: any): void {
    this.processGroup(
      parent,
      sequence,
      "sequence",
      DiagramItemGroupType.Sequence
    );
  }

  /**
   * Process a choice group in the schema
   * @param parent - Parent diagram item to add the choice to
   * @param choice - Choice definition from schema
   */
  private processChoice(parent: DiagramItem, choice: any): void {
    this.processGroup(parent, choice, "choice", DiagramItemGroupType.Choice);
  }

  /**
   * Process an all group in the schema
   * @param parent - Parent diagram item to add the all group to
   * @param all - All definition from schema
   */
  private processAll(parent: DiagramItem, all: any): void {
    this.processGroup(parent, all, "all", DiagramItemGroupType.All);
  }

  /**
   * Generic method to process any group type (sequence, choice, all)
   * @param parent - Parent diagram item to add the group to
   * @param groupDef - Group definition from schema
   * @param name - Name of the group type
   * @param groupType - Type of the group
   */
  private processGroup(
    parent: DiagramItem,
    groupDef: any,
    name: string,
    groupType: DiagramItemGroupType
  ): void {
    const groupNode = new DiagramItem(
      this.generateId(),
      name,
      DiagramItemType.group,
      this.diagram
    );
    groupNode.groupType = groupType;

    if (groupDef.element) {
      const elements = Array.isArray(groupDef.element)
        ? groupDef.element
        : [groupDef.element];

      for (const elem of elements) {
        const elemNode = this.createElementNode(elem);
        if (elemNode) {
          groupNode.addChild(elemNode);
        }
      }
    }

    if (groupNode.childElements.length > 0) {
      parent.addChild(groupNode);
    }
  }

  /**
   * Process an extension and apply it to the parent item
   * @param parent - Parent diagram item to extend
   * @param extension - Extension definition from schema
   */
  private processExtension(parent: DiagramItem, extension: any): void {
    // Process base type reference
    if (extension.base) {
      parent.type = extension.base.toString();
    }

    // Extract attributes from extension
    this.extractAttributes(parent, extension);

    // Process sequence in extension
    if (extension.sequence) {
      this.processSequence(parent, extension.sequence);
    }
  }

  /**
   * Extract attributes from a complex type or extension
   * @param item - Diagram item to add attributes to
   * @param source - Source object that may contain attribute definitions
   */
  private extractAttributes(item: DiagramItem, source: any): void {
    if (!source) {
      return;
    }

    const attributes = source.attribute;
    if (!attributes) {
      return;
    }

    const attrArray = Array.isArray(attributes) ? attributes : [attributes];

    for (const attr of attrArray) {
      if (!attr.name) {
        continue;
      }

      item.attributes.push({
        name: attr.name.toString(),
        type: attr.type_ ? attr.type_.toString() : "inner simpleType or ref",
        use: attr.use ? attr.use.toString() : undefined,
        defaultValue: attr.default_ ? attr.default_.toString() : undefined,
        fixedValue: attr.fixed ? attr.fixed.toString() : undefined,
      });
    }
  }

  /**
   * Extract documentation from an annotation object
   * @param annotation - Annotation object from schema element
   * @returns Concatenated documentation string or undefined
   */
  private extractDocumentation(annotation: any): string | undefined {
    if (!annotation?.documentation) {
      return undefined;
    }

    const docs = Array.isArray(annotation.documentation)
      ? annotation.documentation
      : [annotation.documentation];
    return docs.map((d: any) => d.value).join("\n");
  }

  /**
   * Generate a unique ID for a diagram item
   * @returns A unique string identifier
   */
  private generateId(): string {
    return `item_${this.idCounter++}`;
  }
}
