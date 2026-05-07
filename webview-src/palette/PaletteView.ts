import {
  PALETTE_MIME_TYPE,
  PaletteGroup,
  PaletteItem,
  paletteGroups,
  setActiveDraggedPaletteSchemaConstruct,
} from "./PaletteItems";

/**
 * Lightweight DOM-based component palette for drag-and-drop.
 */
export class PaletteView {
  private readonly container: HTMLDivElement;
  private readonly groups: PaletteGroup[];
  private filterText = "";
  private listContainer: HTMLDivElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private openGroups = new Set<string>();

  /**
   * Creates a new palette renderer.
   *
   * @param container - Palette host element
   * @param groups - Optional palette group override (used by tests)
   */
  constructor(container: HTMLDivElement, groups: PaletteGroup[] = paletteGroups) {
    this.container = container;
    this.groups = groups;
    groups.forEach((group) => this.openGroups.add(group.label));
  }

  /**
   * Render the palette chrome and current item list.
   */
  public render(): void {
    this.container.innerHTML = "";
    this.container.classList.add("palette");

    const header = document.createElement("div");
    header.className = "palette-header";
    const title = document.createElement("span");
    title.textContent = "Components";
    header.appendChild(title);

    const subtitle = document.createElement("span");
    subtitle.className = "palette-header-subtitle";
    subtitle.textContent = "drag onto canvas";
    header.appendChild(subtitle);
    this.container.appendChild(header);

    const searchWrapper = document.createElement("div");
    searchWrapper.className = "palette-search-wrapper";

    this.searchInput = document.createElement("input");
    this.searchInput.id = "palette-search";
    this.searchInput.type = "text";
    this.searchInput.placeholder = "Search components…";
    this.searchInput.className = "palette-search";
    this.searchInput.addEventListener("input", () => {
      this.filterText = this.searchInput?.value ?? "";
      this.renderList();
    });
    searchWrapper.appendChild(this.searchInput);
    this.container.appendChild(searchWrapper);

    this.listContainer = document.createElement("div");
    this.listContainer.className = "palette-list";
    this.container.appendChild(this.listContainer);

    const hint = document.createElement("div");
    hint.className = "palette-hint";
    hint.textContent = "Drag onto nodes or the top-level drop target";
    this.container.appendChild(hint);

    this.renderList();
  }

  /**
   * Rebuilds grouped rows using the current search text.
   */
  private renderList(): void {
    if (!this.listContainer) {
      return;
    }

    this.listContainer.innerHTML = "";
    const query = this.filterText.trim().toLowerCase();

    this.groups.forEach((group) => {
      const filteredItems = group.items.filter((item) =>
        `${item.name} ${item.description}`.toLowerCase().includes(query)
      );

      if (filteredItems.length === 0) {
        return;
      }

      const groupContainer = document.createElement("div");
      groupContainer.className = "palette-group";

      const groupButton = document.createElement("button");
      groupButton.className = "palette-group-title";
      groupButton.type = "button";
      groupButton.addEventListener("click", () => {
        if (this.openGroups.has(group.label)) {
          this.openGroups.delete(group.label);
        } else {
          this.openGroups.add(group.label);
        }
        this.renderList();
      });

      const chevron = document.createElement("span");
      const chevronIcon = this.openGroups.has(group.label)
        ? "codicon-chevron-down"
        : "codicon-chevron-right";
      chevron.className = `codicon ${chevronIcon}`;
      groupButton.appendChild(chevron);

      const title = document.createElement("span");
      title.textContent = group.label;
      groupButton.appendChild(title);

      const count = document.createElement("span");
      count.className = "palette-group-count";
      count.textContent = `${filteredItems.length}`;
      groupButton.appendChild(count);
      groupContainer.appendChild(groupButton);

      if (this.openGroups.has(group.label)) {
        const groupRows = document.createElement("div");
        groupRows.className = "palette-group-items";
        filteredItems.forEach((item) => {
          groupRows.appendChild(this.createItem(item));
        });
        groupContainer.appendChild(groupRows);
      }

      this.listContainer?.appendChild(groupContainer);
    });
  }

  /**
   * Creates one draggable palette row.
   *
   * @param item - Item metadata
   * @returns Row element
   */
  private createItem(item: PaletteItem): HTMLDivElement {
    const row = document.createElement("div");
    row.className = `palette-item${item.enabled ? "" : " palette-item-disabled"}`;
    row.draggable = item.enabled;
    row.title = item.description;
    row.setAttribute("data-palette-item", item.id);
    row.setAttribute("data-testid", `palette-item-${item.id}`);

    const dragHandle = document.createElement("span");
    dragHandle.className = "codicon codicon-gripper palette-grip";
    row.appendChild(dragHandle);

    const icon = document.createElement("span");
    icon.className = `codicon codicon-${item.icon} palette-item-icon`;
    icon.style.color = item.color;
    row.appendChild(icon);

    const name = document.createElement("span");
    name.className = "palette-item-name";
    name.textContent = item.name;
    row.appendChild(name);

    const description = document.createElement("span");
    description.className = "palette-item-description";
    description.textContent = item.description;
    row.appendChild(description);

    row.addEventListener("dragstart", (event) => {
      if (!item.enabled) {
        event.preventDefault();
        return;
      }
      if (!event.dataTransfer) {
        return;
      }
      event.dataTransfer.setData(PALETTE_MIME_TYPE, item.id);
      event.dataTransfer.effectAllowed = "copy";
      setActiveDraggedPaletteSchemaConstruct(item.id);
    });

    row.addEventListener("dragend", () => {
      setActiveDraggedPaletteSchemaConstruct(null);
    });

    return row;
  }
}
