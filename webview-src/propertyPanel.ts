/**
 * Property panel for displaying diagram node details.
 * Renders node properties such as name, type, cardinality, documentation, and attributes.
 */

import { DiagramItem } from "./diagram";

/**
 * Manages the property panel UI that displays details about selected diagram nodes.
 */
export class PropertyPanel {
  private container: HTMLDivElement;

  /**
   * Creates a new PropertyPanel.
   * 
   * @param container - The HTML div element to render the properties into
   */
  constructor(container: HTMLDivElement) {
    this.container = container;
  }

  /**
   * Displays the properties of a diagram node in the panel.
   * Shows name, type, namespace, cardinality, documentation, attributes, and children count.
   * 
   * @param node - The diagram item whose properties to display
   */
  public display(node: DiagramItem): void {
    this.container.innerHTML = "";

    // Name property
    this.addProperty("Name", node.name);

    // Type property
    if (node.type) {
      this.addProperty("Type", node.type);
    }

    // Namespace if present
    if (node.namespace) {
      this.addProperty("Namespace", node.namespace);
    }

    // Cardinality
    if (node.minOccurrence !== undefined || node.maxOccurrence !== undefined) {
      const min = node.minOccurrence ?? 1;
      const max = node.maxOccurrence === -1 ? "∞" : node.maxOccurrence ?? 1;
      this.addProperty("Cardinality", `${min}..${max}`);
    }

    // Documentation
    if (node.documentation) {
      this.addPropertyBlock("Documentation", node.documentation);
    }

    // Attributes
    if (node.attributes && node.attributes.length > 0) {
      const attrList = document.createElement("ul");
      attrList.className = "attribute-list";

      node.attributes.forEach((attr) => {
        const li = document.createElement("li");
        li.innerHTML = `
                    <strong>${attr.name}</strong>: ${attr.type}
                    <span class="attr-use">(${attr.use || "optional"})</span>
                `;
        if (attr.defaultValue) {
          li.innerHTML += ` <span class="attr-default">default: ${attr.defaultValue}</span>`;
        }
        if (attr.fixedValue) {
          li.innerHTML += ` <span class="attr-fixed">fixed: ${attr.fixedValue}</span>`;
        }
        attrList.appendChild(li);
      });

      this.addPropertyWithElement("Attributes", attrList);
    }

    // Restrictions (for simpleType restrictions)
    if (node.restrictions) {
      const restrictionList = document.createElement("div");
      restrictionList.className = "restriction-list";

      // Enumeration values
      if (node.restrictions.enumeration && node.restrictions.enumeration.length > 0) {
        restrictionList.appendChild(
          this.createRestrictionItem("Enumeration", node.restrictions.enumeration.join(", "))
        );
      }

      // Pattern values
      if (node.restrictions.pattern && node.restrictions.pattern.length > 0) {
        restrictionList.appendChild(
          this.createRestrictionItem("Pattern", node.restrictions.pattern.join(", "))
        );
      }

      // Length constraint
      if (node.restrictions.length !== undefined) {
        restrictionList.appendChild(
          this.createRestrictionItem("Length", node.restrictions.length)
        );
      }

      // Min/Max length constraints
      if (node.restrictions.minLength !== undefined || node.restrictions.maxLength !== undefined) {
        const parts: string[] = [];
        if (node.restrictions.minLength !== undefined) {
          parts.push(`min: ${node.restrictions.minLength}`);
        }
        if (node.restrictions.maxLength !== undefined) {
          parts.push(`max: ${node.restrictions.maxLength}`);
        }
        restrictionList.appendChild(
          this.createRestrictionItem("Length Range", parts.join(", "))
        );
      }

      // Min/Max value constraints
      const valueConstraints: string[] = [];
      if (node.restrictions.minInclusive !== undefined) {
        valueConstraints.push(`≥ ${node.restrictions.minInclusive}`);
      }
      if (node.restrictions.minExclusive !== undefined) {
        valueConstraints.push(`> ${node.restrictions.minExclusive}`);
      }
      if (node.restrictions.maxInclusive !== undefined) {
        valueConstraints.push(`≤ ${node.restrictions.maxInclusive}`);
      }
      if (node.restrictions.maxExclusive !== undefined) {
        valueConstraints.push(`< ${node.restrictions.maxExclusive}`);
      }
      if (valueConstraints.length > 0) {
        restrictionList.appendChild(
          this.createRestrictionItem("Value Range", valueConstraints.join(", "))
        );
      }

      // Total digits
      if (node.restrictions.totalDigits !== undefined) {
        restrictionList.appendChild(
          this.createRestrictionItem("Total Digits", node.restrictions.totalDigits)
        );
      }

      // Fraction digits
      if (node.restrictions.fractionDigits !== undefined) {
        restrictionList.appendChild(
          this.createRestrictionItem("Fraction Digits", node.restrictions.fractionDigits)
        );
      }

      // White space
      if (node.restrictions.whiteSpace !== undefined) {
        restrictionList.appendChild(
          this.createRestrictionItem("White Space", node.restrictions.whiteSpace)
        );
      }

      // Only add the restrictions section if we have content
      if (restrictionList.children.length > 0) {
        this.addPropertyWithElement("Restrictions", restrictionList);
      }
    }

    // Children count
    if (node.childElements && node.childElements.length > 0) {
      this.addProperty("Children", node.childElements.length.toString());
    }
  }

  /**
   * Adds a simple property (label-value pair) to the panel.
   * 
   * @param label - The property label (e.g., "Name", "Type")
   * @param value - The property value to display
   */
  private addProperty(label: string, value: string): void {
    const propertyDiv = document.createElement("div");
    propertyDiv.className = "property";

    const labelEl = document.createElement("label");
    labelEl.textContent = `${label}:`;

    const valueEl = document.createElement("span");
    valueEl.textContent = value;

    propertyDiv.appendChild(labelEl);
    propertyDiv.appendChild(valueEl);
    this.container.appendChild(propertyDiv);
  }

  /**
   * Adds a multi-line property block (e.g., documentation) to the panel.
   * Uses a paragraph element for better formatting of longer text.
   * 
   * @param label - The property label
   * @param value - The property value (can be multi-line text)
   */
  private addPropertyBlock(label: string, value: string): void {
    const propertyDiv = document.createElement("div");
    propertyDiv.className = "property";

    const labelEl = document.createElement("label");
    labelEl.textContent = `${label}:`;

    const valueEl = document.createElement("p");
    valueEl.textContent = value;

    propertyDiv.appendChild(labelEl);
    propertyDiv.appendChild(valueEl);
    this.container.appendChild(propertyDiv);
  }

  /**
   * Adds a property with a custom HTML element (e.g., lists).
   * Useful for complex property values like attribute lists.
   * 
   * @param label - The property label
   * @param element - The HTML element containing the property value
   */
  private addPropertyWithElement(label: string, element: HTMLElement): void {
    const propertyDiv = document.createElement("div");
    propertyDiv.className = "property";

    const labelEl = document.createElement("label");
    labelEl.textContent = `${label}:`;

    propertyDiv.appendChild(labelEl);
    propertyDiv.appendChild(element);
    this.container.appendChild(propertyDiv);
  }

  /**
   * Creates a restriction item div with label and value safely.
   * @param label - The restriction label
   * @param value - The restriction value as string or number
   * @returns A div element containing the formatted restriction
   */
  private createRestrictionItem(label: string, value: string | number): HTMLDivElement {
    const div = document.createElement("div");
    div.className = "restriction-item";

    const labelEl = document.createElement("strong");
    labelEl.textContent = `${label}: `;
    div.appendChild(labelEl);

    const valueEl = document.createElement("span");
    valueEl.textContent = String(value);
    div.appendChild(valueEl);

    return div;
  }

  /**
   * Clears all properties from the panel.
   * Removes all child elements from the container.
   */
  public clear(): void {
    this.container.innerHTML = "";
  }
}
