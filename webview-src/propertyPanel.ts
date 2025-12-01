// Property panel for displaying node details

import { DiagramItem } from "./diagram";

export class PropertyPanel {
  private container: HTMLDivElement;

  constructor(container: HTMLDivElement) {
    this.container = container;
  }

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

  private addPropertyWithElement(label: string, element: HTMLElement): void {
    const propertyDiv = document.createElement("div");
    propertyDiv.className = "property";

    const labelEl = document.createElement("label");
    labelEl.textContent = `${label}:`;

    propertyDiv.appendChild(labelEl);
    propertyDiv.appendChild(element);
    this.container.appendChild(propertyDiv);
  }

  public clear(): void {
    this.container.innerHTML = "";
  }
}
