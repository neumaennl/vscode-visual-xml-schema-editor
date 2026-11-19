import { PaletteView } from "./PaletteView";
import { paletteGroups } from "./paletteEntries";
import { getDraggedSchemaConstruct, setDraggedSchemaConstruct } from "../dragAndDrop/draggedSchemaConstruct";
import { DraggableSchemaConstruct } from "../dragAndDrop/DraggableSchemaConstruct";

describe("PaletteView", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    setDraggedSchemaConstruct(null);
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

  test("should remember the dragged schema construct on dragstart and allow copying", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    const row = container.querySelector<HTMLDivElement>('[data-testid="palette-item-element"]')!;

    const dataTransfer = { effectAllowed: "none" };
    const event = new Event("dragstart", { bubbles: true }) as DragEvent;
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer });

    row.dispatchEvent(event);

    expect(getDraggedSchemaConstruct()).toBe(DraggableSchemaConstruct.Element);
    expect(dataTransfer.effectAllowed).toBe("copy");
  });

  test("should forget the dragged schema construct on dragend", () => {
    const view = new PaletteView(container, paletteGroups);
    view.render();

    const row = container.querySelector<HTMLDivElement>('[data-testid="palette-item-element"]')!;

    setDraggedSchemaConstruct(DraggableSchemaConstruct.Element);
    row.dispatchEvent(new Event("dragend", { bubbles: true }));

    expect(getDraggedSchemaConstruct()).toBeNull();
  });
});
