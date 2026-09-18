import { PaletteView } from "./PaletteView";
import {
  getActiveDraggedPaletteSchemaConstruct,
  PALETTE_MIME_TYPE,
  paletteGroups,
  setActiveDraggedPaletteSchemaConstruct,
} from "./PaletteItems";
import { PaletteSchemaConstruct } from "./PaletteSchemaConstruct";

describe("PaletteView", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    setActiveDraggedPaletteSchemaConstruct(null);
  });

  it("renders grouped items", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    expect(container.textContent).toContain("Structure");
    expect(container.textContent).toContain("Types");
    expect(container.querySelector('[data-testid="palette-item-element"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="palette-item-simpleType"]')).toBeTruthy();
  });

  it("filters items by search", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    const input = container.querySelector("#palette-search") as HTMLInputElement;
    input.value = "complex";
    input.dispatchEvent(new Event("input"));

    expect(container.querySelector('[data-testid="palette-item-complexType"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="palette-item-element"]')).toBeFalsy();
  });

  it("sets drag payload on dragstart", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    const row = container.querySelector(
      '[data-testid="palette-item-element"]'
    ) as HTMLDivElement;

    const setData = jest.fn();
    const event = new Event("dragstart", { bubbles: true }) as DragEvent;
    Object.defineProperty(event, "dataTransfer", {
      value: {
        setData,
        effectAllowed: "none",
      },
    });

    row.dispatchEvent(event);

    expect(setData).toHaveBeenCalledWith(PALETTE_MIME_TYPE, "element");
    expect(getActiveDraggedPaletteSchemaConstruct()).toBe(PaletteSchemaConstruct.Element);
  });

  it("clears active dragged construct on dragend", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    const row = container.querySelector(
      '[data-testid="palette-item-element"]'
    ) as HTMLDivElement;

    setActiveDraggedPaletteSchemaConstruct(PaletteSchemaConstruct.Element);
    row.dispatchEvent(new Event("dragend", { bubbles: true }));

    expect(getActiveDraggedPaletteSchemaConstruct()).toBeNull();
  });
});
