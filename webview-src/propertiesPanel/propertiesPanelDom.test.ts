/**
 * Unit tests of `propertiesPanelDom`.
 */

import { createSection } from "./propertiesPanelDom";

describe("createSection", () => {
  test("should create a section that starts with a header with the icon and the label", () => {
    const section = createSection("lock", "CONSTRAINTS");

    expect(section.className).toBe("property-section");
    expect(section.children).toHaveLength(1);
    expect(section.querySelector(".property-section-header .codicon-lock")).not.toBeNull();
    expect(section.querySelector(".property-section-header-label")?.textContent).toBe("CONSTRAINTS");
  });
});
