/**
 * Properties panel for displaying diagram node details.
 * Renders node properties such as name, type, cardinality, documentation, and attributes.
 */

import {
  parseMaxOccurs,
  UNBOUNDED,
  validateMaxOccurs,
  validateMinOccurs,
  type MaxOccurs,
} from "../../shared/occurrences";
import { isValidXmlName } from "../../shared/qNames";
import { getMaxOccurs, getMinOccurs, getName, getAttributes, getSimpleDerivation, type DiagramItem } from "../diagram";
import { DiagramItemType } from "../diagram/DiagramTypes";
import type { SchemaCommand } from "../../shared/types";
import { canEditCardinality, getNodeType, getNodeTypeLabel } from "./propertiesPanelNodeKinds";
import { collectTypeSuggestions } from "./propertiesPanelTypeReferences";
import { createDeleteNodeCommand, createRenameNodeCommand } from "./propertiesPanelCommands";
import { resolveSimpleTypeId } from "./propertiesPanelTargets";
import { SchemaNodeType } from "../../shared/idStrategy";
import {
  addPropertyToContainer,
  createAttributeList,
  createPropertiesPanelHeader,
  createSection,
  createSectionHeader,
} from "./propertiesPanelDom";
import { createEditableField, createInputColumn } from "./propertiesPanelFields";
import { createDocsTab } from "./propertiesPanelDocs";
import { renderFacetsTab } from "./propertiesPanelFacets";
import { renderSchemaNamespaceProperties } from "./propertiesPanelSchemaNamespaces";
import { renderTypeProperty } from "./propertiesPanelTypes";
import { renderElementDefaultFixedSection } from "./propertiesPanelElementDefaults";
import { canShowConstraintsSection, renderConstraintsSection } from "./propertiesPanelConstraints";
import { buildXmlPreview } from "./propertiesPanelXmlPreview";

type PropertyTab = "general" | "facets" | "docs" | "xml";
type CommandDispatcher = (command: SchemaCommand) => void;

/** A rename that was sent and is not in the schema yet: the node it renames and its new name. */
interface PendingRename {
  sourceId: string;
  newName: string;
}

/** A tab of the panel and the label of its button. */
interface TabEntry {
  id: PropertyTab;
  label: string;
}

/**
 * Manages the properties panel UI that displays details about selected diagram nodes.
 */
export class PropertiesPanel {
  private container: HTMLDivElement;
  private selectedNode: DiagramItem | null = null;
  private activeTab: PropertyTab = "general";
  private pendingRename: PendingRename | null = null;
  private readonly dispatchCommand: CommandDispatcher;

  /**
   * Creates a new `PropertiesPanel`.
   *
   * @param container - The HTML div element to render the properties into
   * @param dispatchCommand - Callback used to emit schema commands
   */
  constructor(container: HTMLDivElement, dispatchCommand?: CommandDispatcher) {
    this.container = container;
    this.dispatchCommand = dispatchCommand ?? ((): void => undefined);
  }

  /**
   * Displays the properties of a diagram node in the panel.
   * Shows name, type, namespace, cardinality, documentation, attributes, and children count.
   *
   * @param node - The diagram item whose properties to display
   */
  public display(node: DiagramItem): void {
    if (this.pendingRename) {
      const renameApplied = getName(node)?.trim() === this.pendingRename.newName;
      const selectionMoved = node.id !== this.pendingRename.sourceId;
      if (renameApplied || selectionMoved) {
        this.pendingRename = null;
      }
    }
    this.selectedNode = node;
    this.render();
  }

  /**
   * Renders the header, the tab bar and the active tab of the selected node, or clears the panel
   * without a node. Falls back to the General tab when the node has no Facets tab.
   */
  private render(): void {
    const node = this.selectedNode;
    if (!node) {
      this.clear();
      return;
    }

    if (this.activeTab === "facets" && !this.canShowFacetsTab(node)) {
      this.activeTab = "general";
    }

    this.container.replaceChildren();
    this.container.appendChild(
      createPropertiesPanelHeader(getNodeTypeLabel(node), node.id, this.createDeleteHandler(node))
    );
    this.container.appendChild(this.createTabBar());
    this.container.appendChild(this.renderTabContent(node));
  }

  /**
   * Creates the handler of the header's delete button, which dispatches the command that deletes the node.
   *
   * @param node - Diagram node shown in the panel
   * @returns The handler, or `undefined` if the node cannot be deleted
   */
  private createDeleteHandler(node: DiagramItem): (() => void) | undefined {
    const deleteCommand = createDeleteNodeCommand(node);
    if (!deleteCommand) {
      return undefined;
    }
    return (): void => {
      this.dispatchCommand(deleteCommand);
    };
  }

  /**
   * Creates the tab bar with a button for each tab of the selected node; clicking one shows its tab.
   *
   * @returns The tab bar
   */
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

  /**
   * Returns the tabs of the selected node: General, Facets for restrictions, Docs and XML.
   *
   * @returns The IDs and labels of the tabs, in display order
   */
  private getAvailableTabs(): TabEntry[] {
    const tabs: TabEntry[] = [{ id: "general", label: "General" }];
    if (this.selectedNode && this.canShowFacetsTab(this.selectedNode)) {
      tabs.push({ id: "facets", label: "Facets" });
    }
    tabs.push({ id: "docs", label: "Docs" }, { id: "xml", label: "XML" });
    return tabs;
  }

  /**
   * Renders the active tab.
   *
   * @param node - The selected node
   * @returns The content of the tab
   */
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

  /**
   * Renders the General tab: the name, the type fields, the namespaces of the schema, the cardinality,
   * the constraints, the default and fixed values, the namespace and the attributes, as far as the node has them.
   *
   * @param node - The selected node
   * @returns The content of the tab
   */
  private renderGeneralTab(node: DiagramItem): HTMLElement {
    const root = document.createElement("div");
    root.className = "property-tab-content";
    root.appendChild(createSectionHeader("symbol-key", "IDENTITY"));

    const name = getName(node);
    if (name !== undefined && createRenameNodeCommand(node, name)) {
      root.appendChild(
        createEditableField("Name", name, (next, reject) => {
          const trimmedName = next.trim();
          if (trimmedName === getName(node)?.trim()) {
            return;
          }
          if (!trimmedName) {
            reject("Enter a name");
            return;
          }
          if (!isValidXmlName(trimmedName)) {
            reject("Name must be a valid XML name");
            return;
          }
          if (this.pendingRename?.sourceId === node.id && this.pendingRename.newName === trimmedName) {
            return;
          }
          const command = createRenameNodeCommand(node, next);
          if (command) {
            this.pendingRename = { sourceId: node.id, newName: trimmedName };
            this.dispatchCommand(command);
          }
        })
      );
    } else {
      addPropertyToContainer(root, "Name", node.label);
    }

    renderTypeProperty(root, node, collectTypeSuggestions(node), this.dispatchCommand, addPropertyToContainer);

    if (getNodeType(node) === SchemaNodeType.Schema) {
      renderSchemaNamespaceProperties(root, node, this.dispatchCommand, () => {
        this.render();
      });
    }

    if (canEditCardinality(node)) {
      root.appendChild(this.renderCardinalitySection(node));
    }

    if (canShowConstraintsSection(node)) {
      root.appendChild(renderConstraintsSection(node, this.dispatchCommand));
    }

    if (getNodeType(node) === SchemaNodeType.Element) {
      root.appendChild(renderElementDefaultFixedSection(node, this.dispatchCommand));
    }

    const attributes = getAttributes(node);
    if (attributes.length > 0) {
      const attributesSection = createSection("mention", "ATTRIBUTES");
      attributesSection.appendChild(createAttributeList(attributes));
      root.appendChild(attributesSection);
    }

    return root;
  }

  /**
   * Renders the CARDINALITY section: `minOccurs` and `maxOccurs` fields and presets for common
   * occurrences, which send the occurrence of the node.
   *
   * @param node - The selected node
   * @returns The section
   */
  private renderCardinalitySection(node: DiagramItem): HTMLElement {
    const section = createSection("symbol-numeric", "CARDINALITY");

    const dispatchOccurrence = (minOccurs: number, maxOccurs: MaxOccurs): void => {
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
    };

    // Side-by-side min/max inputs
    const row = document.createElement("div");
    row.className = "property-row-2col";

    // Each value is checked on its own; minOccurs > maxOccurs is left to the validator of the extension host
    const minCol = createInputColumn("minOccurs:", String(getMinOccurs(node)), (text, reject) => {
      const raw = text.trim();
      const minOccurs = Number(raw);
      if (raw === "" || Number.isNaN(minOccurs)) {
        reject("minOccurs must be a number");
        return;
      }
      const result = validateMinOccurs(minOccurs);
      if (!result.valid) {
        reject(result.error);
        return;
      }
      dispatchOccurrence(minOccurs, getMaxOccurs(node));
    });
    const maxCol = createInputColumn("maxOccurs:", String(getMaxOccurs(node)), (text, reject) => {
      const maxOccurs = parseMaxOccurs(text);
      if (maxOccurs === undefined) {
        reject("maxOccurs must be a number or unbounded");
        return;
      }
      const result = validateMaxOccurs(maxOccurs);
      if (!result.valid) {
        reject(result.error);
        return;
      }
      dispatchOccurrence(getMinOccurs(node), maxOccurs);
    });

    row.appendChild(minCol);
    row.appendChild(maxCol);
    section.appendChild(row);

    // Preset buttons
    const presets: Array<{ label: string; min: number; max: MaxOccurs }> = [
      { label: "0..1", min: 0, max: 1 },
      { label: "1..1", min: 1, max: 1 },
      { label: "0..∞", min: 0, max: UNBOUNDED },
      { label: "1..∞", min: 1, max: UNBOUNDED },
    ];

    const presetsRow = document.createElement("div");
    presetsRow.className = "property-presets";

    for (const preset of presets) {
      const isActive = getMinOccurs(node) === preset.min && getMaxOccurs(node) === preset.max;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = isActive ? "property-preset-btn property-preset-btn-active" : "property-preset-btn";
      btn.textContent = preset.label;
      btn.addEventListener("click", () => {
        dispatchOccurrence(preset.min, preset.max);
      });
      presetsRow.appendChild(btn);
    }

    section.appendChild(presetsRow);
    return section;
  }

  /**
   * Renders the Facets tab.
   *
   * @param node - The selected node
   * @returns The content of the tab
   */
  private renderFacetsTab(node: DiagramItem): HTMLElement {
    return renderFacetsTab(node, this.dispatchCommand, addPropertyToContainer);
  }

  /**
   * Tells whether the node has a Facets tab: a simple type, or an element with an inline simple
   * type, that is a restriction.
   *
   * @param node - The selected node
   * @returns True when the node has facets to edit
   */
  private canShowFacetsTab(node: DiagramItem): boolean {
    if (resolveSimpleTypeId(node) === null) {
      return false;
    }
    const derivationKind = getSimpleDerivation(node)?.kind;
    return derivationKind !== "list" && derivationKind !== "union";
  }

  /**
   * Renders the Docs tab.
   *
   * @param node - The selected node
   * @returns The content of the tab
   */
  private renderDocsTab(node: DiagramItem): HTMLElement {
    return createDocsTab(node, this.dispatchCommand);
  }

  /**
   * Renders the XML tab: a read-only XSD fragment of the node with a hint that it is a preview.
   *
   * @param node - The selected node
   * @returns The content of the tab
   */
  private renderXmlTab(node: DiagramItem): HTMLElement {
    const root = document.createElement("div");
    root.className = "property-tab-content property-tab-content-xml";

    const hint = document.createElement("p");
    hint.className = "property-xml-hint";
    hint.textContent =
      "Preview only; it may differ from the exact schema XML. Open the schema in a text editor tab for the source of truth.";

    const pre = document.createElement("pre");
    pre.className = "property-xml-preview";
    pre.textContent = buildXmlPreview(node);

    root.appendChild(hint);
    root.appendChild(pre);
    return root;
  }

  /**
   * Clears all properties from the panel.
   * Removes all child elements from the container.
   */
  public clear(): void {
    this.selectedNode = null;
    this.container.replaceChildren();
  }
}
