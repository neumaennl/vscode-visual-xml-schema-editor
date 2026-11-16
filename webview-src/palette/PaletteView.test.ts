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

  test("should render grouped items", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    expect(container.textContent).toContain("Structure");
    expect(container.textContent).toContain("Types");
    expect(container.querySelector('[data-testid="palette-item-element"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="palette-item-simpleType"]')).toBeTruthy();
  });

  test("should filter items by search", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    const input = container.querySelector<HTMLInputElement>("#palette-search")!;
    input.value = "complex";
    input.dispatchEvent(new Event("input"));

    expect(container.querySelector('[data-testid="palette-item-complexType"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="palette-item-element"]')).toBeFalsy();
  });

  test("should set drag payload on dragstart", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    const row = container.querySelector<HTMLDivElement>('[data-testid="palette-item-element"]')!;

    const setData = vi.fn();
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

  test("should clear active dragged construct on dragend", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    const row = container.querySelector<HTMLDivElement>('[data-testid="palette-item-element"]')!;

    setActiveDraggedPaletteSchemaConstruct(PaletteSchemaConstruct.Element);
    row.dispatchEvent(new Event("dragend", { bubbles: true }));

    expect(getActiveDraggedPaletteSchemaConstruct()).toBeNull();
  });
});
