/**
 * Property panel for displaying diagram node details.
 * Renders node properties such as name, type, cardinality, documentation, and attributes.
 */

import { DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import { SchemaCommand } from "../../shared/types";
import {
  collectLocalSchemaTypeNames,
  getNodeType,
  getNodeTypeLabel,
  canEditCardinality,
  createDeleteNodeCommand,
  createNameCommand,
  resolveSimpleTypeId,
  isTopLevelElement,
} from "./propertyPanelCommands";
import { SchemaNodeType, generateSchemaId } from "../../shared/idStrategy";
import { createDraftNode } from "./propertyPanelDraft";
import {
  addPropertyToContainer,
  addPropertyWithElementToContainer,
  createAttributeList,
  createEditableField,
  createPropertyPanelHeader,
  createSectionHeader,
  createToggleRow,
} from "./propertyPanelDom";
import { createDocsTab } from "./propertyPanelDocs";
import { renderFacetsTab } from "./propertyPanelFacets";
import { renderSchemaNamespaceProperties } from "./propertyPanelSchemaNamespaces";
import { BUILTIN_TYPE_SUGGESTIONS } from "./propertyPanelTypeCatalog";
import { renderTypeProperty } from "./propertyPanelTypes";

type PropertyTab = "general" | "facets" | "docs" | "xml";
type CommandDispatcher = (command: SchemaCommand) => void;

/**
 * Manages the property panel UI that displays details about selected diagram nodes.
 */
export class PropertyPanel {
  private container: HTMLDivElement;
  private selectedNode: DiagramItem | null = null;
  private draftNode: DiagramItem | null = null;
  private activeTab: PropertyTab = "general";
  private readonly dispatchCommand: CommandDispatcher;

  /**
   * Creates a new PropertyPanel.
   *
   * @param container - The HTML div element to render the properties into
   * @param dispatchCommand - Callback used to emit schema commands
   */
  constructor(container: HTMLDivElement, dispatchCommand?: CommandDispatcher) {
    this.container = container;
    this.dispatchCommand = dispatchCommand ?? (() : void => undefined);
  }

  /**
   * Displays the properties of a diagram node in the panel.
   * Shows name, type, namespace, cardinality, documentation, attributes, and children count.
   *
   * @param node - The diagram item whose properties to display
   */
  public display(node: DiagramItem): void {
    this.selectedNode = node;
    this.draftNode = createDraftNode(node);
    this.render();
  }

  private render(): void {
    if (!this.selectedNode || !this.draftNode) {
      this.clear();
      return;
    }

    if (this.activeTab === "facets" && !this.canShowFacetsTab(this.draftNode)) {
      this.activeTab = "general";
    }

    this.container.replaceChildren();
    const deleteCommand = createDeleteNodeCommand(this.draftNode);
    this.container.appendChild(
      createPropertyPanelHeader(
        getNodeTypeLabel(this.draftNode),
        deleteCommand ? () : void => this.dispatchCommand(deleteCommand) : undefined
      )
    );
    this.container.appendChild(this.createTabBar());
    this.container.appendChild(this.renderTabContent(this.draftNode));
  }

  private createTabBar(): HTMLElement {
    const tabBar = document.createElement("div");
    tabBar.className = "property-tabs";

    const tabs = this.getAvailableTabs();
    tabBar.style.gridTemplateColumns = `repeat(${tabs.length}, minmax(0, 1fr))`;

    for (const tab of tabs) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "property-tab";
      if (this.activeTab === tab.id) {
        button.classList.add("property-tab-active");
      }
      button.textContent = tab.label;
      button.addEventListener("click", () => {
        this.activeTab = tab.id;
        this.render();
      });
      tabBar.appendChild(button);
    }

    return tabBar;
  }

  private getAvailableTabs(): Array<{ id: PropertyTab; label: string }> {
    const tabs: Array<{ id: PropertyTab; label: string }> = [{ id: "general", label: "General" }];
    if (this.draftNode && this.canShowFacetsTab(this.draftNode)) {
      tabs.push({ id: "facets", label: "Facets" });
    }
    tabs.push({ id: "docs", label: "Docs" }, { id: "xml", label: "XML" });
    return tabs;
  }

  private renderTabContent(node: DiagramItem): HTMLElement {
    switch (this.activeTab) {
      case "facets":
        return this.renderFacetsTab(node);
      case "docs":
        return this.renderDocsTab(node);
      case "xml":
        return this.renderXmlTab(node);
      case "general":
      default:
        return this.renderGeneralTab(node);
    }
  }

  private renderGeneralTab(node: DiagramItem): HTMLElement {
    const root = document.createElement("div");
    root.className = "property-tab-content";

    const nameCommand = createNameCommand(node, node.name);
    if (nameCommand) {
      root.appendChild(
        createEditableField("Name", node.name, (next) => {
          const command = createNameCommand(node, next);
          if (command) {
            node.name = next.trim();
            this.dispatchCommand(command);
          }
        })
      );
    } else {
      addPropertyToContainer(root, "Name", node.name);
    }

    renderTypeProperty(
      root,
      node,
      this.getTypeSuggestions(),
      this.dispatchCommand,
      addPropertyToContainer
    );

    if (getNodeType(node) === SchemaNodeType.Schema) {
      renderSchemaNamespaceProperties(root, node, this.dispatchCommand, () => this.render());
    }

    if (canEditCardinality(node)) {
      root.appendChild(this.renderCardinalitySection(node));
    }

    if (this.canShowConstraintsSection(node)) {
      root.appendChild(this.renderConstraintsSection(node));
    }

    if (getNodeType(node) === SchemaNodeType.Element) {
      root.appendChild(this.renderDefaultFixedSection(node));
    }

    if (node.namespace) {
      addPropertyToContainer(root, "Namespace", node.namespace);
    }

    if (node.attributes.length > 0) {
      addPropertyWithElementToContainer(root, "Attributes", createAttributeList(node));
    }

    if (node.childElements.length > 0) {
      addPropertyToContainer(root, "Children", node.childElements.length.toString());
    }

    return root;
  }

  private renderCardinalitySection(node: DiagramItem): HTMLElement {
    const section = document.createElement("div");
    section.className = "property-section";
    section.appendChild(createSectionHeader("symbol-numeric", "CARDINALITY"));

    const dispatchOccurrence = (minOccurs: number, maxOccurs: number | "unbounded"): void => {
      node.minOccurrence = minOccurs;
      node.maxOccurrence = maxOccurs === "unbounded" ? -1 : maxOccurs;
      const nodeType = getNodeType(node);
      if (nodeType === SchemaNodeType.Element || node.itemType === DiagramItemType.element) {
        this.dispatchCommand({
          type: "modifyElement",
          payload: {
            elementId: node.id,
            minOccurs,
            maxOccurs,
          },
        });
      } else {
        this.dispatchCommand({
          type: "modifyGroup",
          payload: {
            groupId: node.id,
            minOccurs,
            maxOccurs,
          },
        });
      }
      this.render();
    };

    // Side-by-side min/max inputs
    const row = document.createElement("div");
    row.className = "property-row-2col";

    const minCol = document.createElement("div");
    minCol.className = "property-col";
    const minLabel = document.createElement("label");
    minLabel.textContent = "minOccurs:";
    const minInput = document.createElement("input");
    minInput.type = "text";
    minInput.className = "property-input";
    minInput.value = String(node.minOccurrence);
    const commitMin = (): void => {
      const val = Number(minInput.value);
      if (!Number.isNaN(val)) {
        dispatchOccurrence(val, node.maxOccurrence === -1 ? "unbounded" : node.maxOccurrence);
      }
    };
    minInput.addEventListener("blur", commitMin);
    minInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); minInput.blur(); }
    });
    minCol.appendChild(minLabel);
    minCol.appendChild(minInput);

    const maxCol = document.createElement("div");
    maxCol.className = "property-col";
    const maxLabel = document.createElement("label");
    maxLabel.textContent = "maxOccurs:";
    const maxInput = document.createElement("input");
    maxInput.type = "text";
    maxInput.className = "property-input";
    maxInput.value = node.maxOccurrence === -1 ? "unbounded" : String(node.maxOccurrence);
    const commitMax = (): void => {
      const raw = maxInput.value.trim();
      const maxOccurs = raw === "unbounded" ? "unbounded" : Number(raw);
      if (maxOccurs === "unbounded" || !Number.isNaN(maxOccurs)) {
        dispatchOccurrence(node.minOccurrence, maxOccurs);
      }
    };
    maxInput.addEventListener("blur", commitMax);
    maxInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); maxInput.blur(); }
    });
    maxCol.appendChild(maxLabel);
    maxCol.appendChild(maxInput);

    row.appendChild(minCol);
    row.appendChild(maxCol);
    section.appendChild(row);

    // Preset buttons
    const presets: Array<{ label: string; min: number; max: number | "unbounded" }> = [
      { label: "0..1", min: 0, max: 1 },
      { label: "1..1", min: 1, max: 1 },
      { label: "0..∞", min: 0, max: "unbounded" },
      { label: "1..∞", min: 1, max: "unbounded" },
    ];

    const presetsRow = document.createElement("div");
    presetsRow.className = "property-presets";

    for (const preset of presets) {
      const isActive =
        node.minOccurrence === preset.min &&
        (preset.max === "unbounded"
          ? node.maxOccurrence === -1
          : node.maxOccurrence === preset.max);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = isActive
        ? "property-preset-btn property-preset-btn-active"
        : "property-preset-btn";
      btn.textContent = preset.label;
      btn.addEventListener("click", () => dispatchOccurrence(preset.min, preset.max));
      presetsRow.appendChild(btn);
    }

    section.appendChild(presetsRow);
    return section;
  }

  private renderConstraintsSection(node: DiagramItem): HTMLElement {
    const section = document.createElement("div");
    section.className = "property-section";
    section.appendChild(createSectionHeader("lock", "CONSTRAINTS"));

    const nodeType = getNodeType(node);
    if (nodeType === SchemaNodeType.Element) {
      // Nillable toggle (all elements)
      section.appendChild(
        createToggleRow("Nillable", node.isNillable, (next) => {
          node.isNillable = next;
          this.dispatchCommand({
            type: "modifyElement",
            payload: { elementId: node.id, nillable: next },
          });
        })
      );

      // Abstract toggle (top-level elements only)
      if (isTopLevelElement(node)) {
        section.appendChild(
          createToggleRow("Abstract", node.isAbstract, (next) => {
            node.isAbstract = next;
            this.dispatchCommand({
              type: "modifyElement",
              payload: { elementId: node.id, abstract: next },
            });
          })
        );
      }

      // Mixed content toggle (element with anonymous complex type)
      if (node.hasAnonymousComplexType) {
        const anonComplexTypeId = generateSchemaId({
          nodeType: SchemaNodeType.AnonymousComplexType,
          parentId: node.id,
          position: 0,
        });
        section.appendChild(
          createToggleRow("Mixed content", node.isMixed, (next) => {
            node.isMixed = next;
            this.dispatchCommand({
              type: "modifyComplexType",
              payload: { typeId: anonComplexTypeId, mixed: next },
            });
          })
        );
      }
    }

    if (nodeType === SchemaNodeType.ComplexType) {
      section.appendChild(
        createToggleRow("Abstract", node.isAbstract, (next) => {
          node.isAbstract = next;
          this.dispatchCommand({
            type: "modifyComplexType",
            payload: { typeId: node.id, abstract: next },
          });
        })
      );
    }

    if (
      nodeType === SchemaNodeType.ComplexType ||
      nodeType === SchemaNodeType.AnonymousComplexType
    ) {
      section.appendChild(
        createToggleRow("Mixed content", node.isMixed, (next) => {
          node.isMixed = next;
          this.dispatchCommand({
            type: "modifyComplexType",
            payload: { typeId: node.id, mixed: next },
          });
        })
      );
    }

    return section;
  }

  private canShowConstraintsSection(node: DiagramItem): boolean {
    const nodeType = getNodeType(node);
    return (
      nodeType === SchemaNodeType.Element ||
      nodeType === SchemaNodeType.ComplexType ||
      nodeType === SchemaNodeType.AnonymousComplexType
    );
  }

  private renderDefaultFixedSection(node: DiagramItem): HTMLElement {
    const section = document.createElement("div");
    section.className = "property-section";
    section.appendChild(createSectionHeader("edit", "DEFAULT & FIXED"));

    const row = document.createElement("div");
    row.className = "property-row-2col";

    const defaultCol = document.createElement("div");
    defaultCol.className = "property-col";
    const defaultLabel = document.createElement("label");
    defaultLabel.textContent = "default";
    const defaultInput = document.createElement("input");
    defaultInput.type = "text";
    defaultInput.className = "property-input";
    defaultInput.value = node.elementDefault ?? "";
    defaultInput.placeholder = "—";
    defaultInput.addEventListener("blur", () => {
      const val = defaultInput.value;
      node.elementDefault = val || undefined;
      this.dispatchCommand({
        type: "modifyElement",
        payload: { elementId: node.id, default_: val },
      });
    });
    defaultInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); defaultInput.blur(); }
    });
    defaultCol.appendChild(defaultLabel);
    defaultCol.appendChild(defaultInput);

    const fixedCol = document.createElement("div");
    fixedCol.className = "property-col";
    const fixedLabel = document.createElement("label");
    fixedLabel.textContent = "fixed";
    const fixedInput = document.createElement("input");
    fixedInput.type = "text";
    fixedInput.className = "property-input";
    fixedInput.value = node.elementFixed ?? "";
    fixedInput.placeholder = "—";
    fixedInput.addEventListener("blur", () => {
      const val = fixedInput.value;
      node.elementFixed = val || undefined;
      this.dispatchCommand({
        type: "modifyElement",
        payload: { elementId: node.id, fixed: val },
      });
    });
    fixedInput.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); fixedInput.blur(); }
    });
    fixedCol.appendChild(fixedLabel);
    fixedCol.appendChild(fixedInput);

    row.appendChild(defaultCol);
    row.appendChild(fixedCol);
    section.appendChild(row);
    return section;
  }

  private renderFacetsTab(node: DiagramItem): HTMLElement {
    return renderFacetsTab(node, this.dispatchCommand, addPropertyToContainer);
  }

  private canShowFacetsTab(node: DiagramItem): boolean {
    return resolveSimpleTypeId(node) !== null;
  }

  private getTypeSuggestions(): string[] {
    const collected = new Set(BUILTIN_TYPE_SUGGESTIONS);
    const sourceNode = this.selectedNode ?? this.draftNode;
    if (!sourceNode) {
      return Array.from(collected);
    }
    const localSchemaTypeNames = collectLocalSchemaTypeNames(sourceNode);
    const currentSchemaPrefix = this.selectedNode?.diagram?.currentSchemaPrefix;
    for (const localName of localSchemaTypeNames) {
      collected.add(localName);
      if (currentSchemaPrefix) {
        collected.add(`${currentSchemaPrefix}:${localName}`);
      }
    }

    return Array.from(collected);
  }
  private renderDocsTab(node: DiagramItem): HTMLElement {
    return createDocsTab(node, this.dispatchCommand, () => this.render());
  }

  private renderXmlTab(node: DiagramItem): HTMLElement {
    const root = document.createElement("div");
    root.className = "property-tab-content";
    const pre = document.createElement("pre");
    pre.className = "property-xml-preview";
    pre.textContent = JSON.stringify(
      {
        id: node.id,
        name: node.name,
        itemType: node.itemType,
        type: node.type,
        minOccurs: node.minOccurrence,
        maxOccurs: node.maxOccurrence,
      },
      null,
      2
    );
    root.appendChild(pre);
    return root;
  }

  /**
   * Clears all properties from the panel.
   * Removes all child elements from the container.
   */
  public clear(): void {
    this.selectedNode = null;
    this.draftNode = null;
    this.container.replaceChildren();
  }
}
