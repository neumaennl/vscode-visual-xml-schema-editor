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

    // Create a root node representing the schema
    const targetNs = schemaObj?.targetNamespace?.toString() || "no namespace";
    const schemaNode = new DiagramItem(
      this.generateId(),
      `Schema: ${targetNs}`,
      DiagramItemType.element,
      this.diagram
    );

    // Process schema child elements
    this.processChildCollection(
      schemaNode,
      (schemaObj as any).element,
      (elem) => this.createElementNode(elem)
    );

    this.processChildCollection(
      schemaNode,
      (schemaObj as any).complexType,
      (ct) => this.createComplexTypeNode(ct)
    );

    this.processChildCollection(
      schemaNode,
      (schemaObj as any).simpleType,
      (st) => this.createSimpleTypeNode(st)
    );

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
    this.extractOccurrenceConstraints(item, element);

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

    // Set initial type
    item.type = "complexType";

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

    item.type = "simpleType";

    item.isSimpleContent = true;

    // Extract documentation
    item.documentation = this.extractDocumentation(simpleType.annotation) ?? "";

    // Process restriction/list/union if present to extract base type
    if (simpleType.restriction) {
      this.processRestriction(item, simpleType.restriction);
    }

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
      this.processRestriction(parent, simpleType.restriction);
    }

    // Set type if not already set
    if (!parent.type && simpleType.restriction?.base) {
      parent.type = `<simpleType: ${simpleType.restriction.base.toString()}>`;
    } else if (!parent.type) {
      parent.type = "<anonymous simpleType>";
    }
  }

  /**
   * Process a complex type and add its children to the parent item
   * @param parent - Parent diagram item to add children to
   * @param complexType - Complex type definition from schema
   */
  private processComplexType(parent: DiagramItem, complexType: any): void {
    // Process attributes
    this.extractAttributes(parent, complexType);

    // Process complexContent
    if (complexType.complexContent) {
      parent.type += " with complexContent";

      if (complexType.complexContent.extension) {
        this.processExtension(parent, complexType.complexContent.extension);
      }

      if (complexType.complexContent.restriction) {
        this.processRestriction(parent, complexType.complexContent.restriction);
      }
    }

    // Process simpleContent
    if (complexType.simpleContent) {
      parent.isSimpleContent = true;
      parent.type += " with simpleContent";

      if (complexType.simpleContent.extension) {
        this.processExtension(parent, complexType.simpleContent.extension);
      }

      if (complexType.simpleContent.restriction) {
        this.processRestriction(parent, complexType.simpleContent.restriction);
      }
    }

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

    // Extract occurrence constraints for the group
    this.extractOccurrenceConstraints(groupNode, groupDef);

    this.processChildCollection(groupNode, groupDef.element, (elem) =>
      this.createElementNode(elem)
    );

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
    if (extension.base) {
      parent.type += ` (extension of ${extension.base.toString()})`;
    }
    // Extract attributes from extension
    this.extractAttributes(parent, extension);

    // Process sequence in extension
    if (extension.sequence) {
      this.processSequence(parent, extension.sequence);
    }

    // Process choice in extension
    if (extension.choice) {
      this.processChoice(parent, extension.choice);
    }

    // Process all in extension
    if (extension.all) {
      this.processAll(parent, extension.all);
    }
  }

  /**
   * Process a restriction and apply it to the parent item
   * @param parent - Parent diagram item to restrict
   * @param restriction - Restriction definition from schema
   */
  private processRestriction(parent: DiagramItem, restriction: any): void {
    if (restriction.base) {
      parent.type += ` (restriction on ${restriction.base.toString()})`;
    }
    // Extract attributes from restriction
    this.extractAttributes(parent, restriction);

    // Process sequence in restriction
    if (restriction.sequence) {
      this.processSequence(parent, restriction.sequence);
    }

    // Process choice in restriction
    if (restriction.choice) {
      this.processChoice(parent, restriction.choice);
    }

    // Process all in restriction
    if (restriction.all) {
      this.processAll(parent, restriction.all);
    }
    // TODO: Could also extract enumeration values, patterns, etc. here in the future
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

    const attrArray = this.toArray(source.attribute);

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

    const docs = this.toArray(annotation.documentation);
    return docs.map((d: any) => d.value).join("\n");
  }

  /**
   * Normalize a value to an array (handles both single values and arrays)
   * @param value - Value that may be a single item or array
   * @returns Array of items
   */
  private toArray<T>(value: T | T[] | undefined): T[] {
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Extract occurrence constraints from an element
   * @param item - Diagram item to update
   * @param source - Source object with minOccurs/maxOccurs properties
   */
  private extractOccurrenceConstraints(item: DiagramItem, source: any): void {
    if (source.minOccurs !== undefined) {
      item.minOccurrence = parseInt(source.minOccurs.toString(), 10) || 0;
    }
    if (source.maxOccurs !== undefined) {
      const maxOccurs = source.maxOccurs.toString();
      item.maxOccurrence =
        maxOccurs === "unbounded" ? -1 : parseInt(maxOccurs, 10) || 1;
    }
  }

  /**
   * Process child items from a schema collection and add them to parent
   * @param parent - Parent diagram item
   * @param items - Collection of items to process
   * @param createFn - Function to create diagram item from schema item
   */
  private processChildCollection(
    parent: DiagramItem,
    items: any,
    createFn: (item: any) => DiagramItem | null
  ): void {
    const itemArray = this.toArray(items);
    for (const item of itemArray) {
      const node = createFn(item);
      if (node) {
        parent.addChild(node);
      }
    }
  }

  /**
   * Generate a unique ID for a diagram item
   * @returns A unique string identifier
   */
  private generateId(): string {
    return `item_${this.idCounter++}`;
  }
}
