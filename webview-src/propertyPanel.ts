// Property panel for displaying node details

export class PropertyPanel {
  private container: HTMLDivElement;

  constructor(container: HTMLDivElement) {
    this.container = container;
  }

  public display(node: any): void {
    // TODO: Adapt to work with generated class instances
    this.container.innerHTML = "";

    // Name property
    this.addProperty("Name", node.name);

    // Type property
    this.addProperty("Type", node.type);

    // Data type if present
    if (node.dataType) {
      this.addProperty("Data Type", node.dataType);
    }

    // Namespace if present
    if (node.namespace) {
      this.addProperty("Namespace", node.namespace);
    }

    // Cardinality
    if (node.minOccurs !== undefined || node.maxOccurs !== undefined) {
      const min = node.minOccurs ?? 1;
      const max = node.maxOccurs === "unbounded" ? "∞" : node.maxOccurs ?? 1;
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
    if (node.children && node.children.length > 0) {
      this.addProperty("Children", node.children.length.toString());
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
