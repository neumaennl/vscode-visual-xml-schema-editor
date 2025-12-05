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

      node.attributes.forEach((attr: any) => {
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
   * Clears all properties from the panel.
   * Removes all child elements from the container.
   */
  public clear(): void {
    this.container.innerHTML = "";
  }
}
