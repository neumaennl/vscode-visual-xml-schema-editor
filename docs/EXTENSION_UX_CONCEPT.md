# VS Code extension UX concept

This document defines the intended interaction model for the whole extension (palette, diagram, properties panel, context menu, and toolbar) and aligns it with the prototype UX direction.

---

## 1. Core rules

- Add new schema constructs via drag-and-drop from the palette.
- Edit existing constructs in the properties panel (including delete actions in-panel where applicable).
- Keep toolbar actions scoped to schema/diagram-wide operations.
- Use context menu as a contextual complement (not as the primary add/edit surface).
- Keep the `XML` tab read-only.

---

## 2. Interaction ownership model — what goes where

Each interaction belongs to one primary surface:

| Surface | Primary role | Examples |
|---|---|---|
| **Palette + drag/drop** | Primary entry point for adding constructs | add element, attribute, simpleType, complexType, and facet kinds |
| **Properties panel** | Primary entry point for editing selected-node data | name, type, cardinality, facet values, docs, in-panel delete where supported |
| **Toolbar** | Schema/diagram-wide actions only | actions that apply to whole schema/diagram |
| **Context menu** | Context-sensitive complement | reorder, refactor actions, find usages, go to definition, cut/copy/paste, regenerate sample XML, and quick access to overlapping actions |
| **Read-only display** | Computed/non-editable values | namespace, derived labels, unresolved values |

**Discoverability rule:** adding starts in the palette; editing starts in the panel. The context menu augments both with contextual operations.

---

## 3. Facet UX model

Facet operations follow the same ownership pattern as all other constructs:

- **Add facet kind:** drag facet item from palette to a compatible type node.
- **Edit facet value:** use the **Facets** tab in the properties panel.
- **Delete facet kind:** use delete control in the corresponding facet row in the panel.

The properties panel commit behavior remains unchanged: editing dispatches `modifySimpleType` with the full `restrictions` object.

---

## 4. Multiple facets on the same type

### Are they supported?

Yes. The data model (`RestrictionFacets` in `shared/types.ts`) and the `modifySimpleType` executor support all of the following facets simultaneously on a single restriction:

| Facet | Applies to |
|---|---|
| `enumeration` (list) | string and numeric types |
| `pattern` | string types |
| `length` | string / binary types |
| `minLength`, `maxLength` | string / binary types |
| `minInclusive`, `maxInclusive` | numeric / date types |
| `minExclusive`, `maxExclusive` | numeric / date types |
| `totalDigits`, `fractionDigits` | decimal types |
| `whiteSpace` | string types |

The Facets tab renders a row for every facet that is present on the current type. Multiple facets coexist and are all shown at once.

### Supported combinations

The XSD specification defines which facets are mutually exclusive or base-type-specific. The UX should enforce these rules at add/edit time:

| Rule | Description |
|---|---|
| `length` + `minLength`/`maxLength` | `length` is exclusive with both `minLength` and `maxLength`. Do not use them together. |
| `minInclusive` + `minExclusive` | Only one lower-bound style at a time. |
| `maxInclusive` + `maxExclusive` | Only one upper-bound style at a time. |
| `enumeration` + range / length facets | Technically allowed by XSD; the listed values are further constrained by the other facets. Rare in practice. |
| `enumeration` + `pattern` | Both allowed; the value must match both the pattern and be in the enumeration list. |
| `totalDigits` / `fractionDigits` | Only meaningful for `xs:decimal` and its derived types. |
| Length facets | Only meaningful for `xs:string`, `xs:hexBinary`, `xs:base64Binary`, and derived types. |
| Range facets | Only meaningful for numeric and date/time types. |

Validation should prevent adding or editing facet combinations that are invalid for the selected base type.

### Multiple patterns

The XSD schema allows multiple `<xs:pattern>` elements (values are ANDed together). The current property panel only displays and edits `pattern[0]`. Multiple patterns are preserved in the schema when already present but are not yet all surfaced in the panel. Full multi-pattern editing is deferred to Phase 3.

---

## 5. Properties panel behavior

### General

Shows editable fields only when the selected node kind supports the corresponding command:

| Node kind | Editable fields |
|---|---|
| Element | Name, Type when the element references an explicit type, Base Type and Facets when the element carries an inline anonymous simpleType, Base Type when the element carries an inline anonymous complexType extension, Documentation (and minOccurs/maxOccurs for non-top-level elements only) |
| Simple type | Name, Base Type when a single base type can be resolved safely, Documentation |
| Complex type | Name, Base Type when the type uses an extension, Documentation |
| Group | Name, Documentation |
| Attribute | (read-only for now — Phase 3) |

Computed or unsupported values (namespace, group type, anonymous-type indicator, or any type summary text that does not map 1:1 to a schema field) are displayed as read-only text.

### Facets

- Shown for simpleType nodes plus elements that carry inline anonymous simpleTypes.
- An editable row is rendered for each facet kind that is currently present on the type.
- If no editable facets are present, the panel should direct users to palette drag/drop for adding facet kinds.
- Editing any facet field dispatches `modifySimpleType` with the full updated restriction set.

### Type editing safety rule

- A type-related field is only editable when the panel can map it directly back to a single schema property.
- Elements with explicit `type="..."` values keep an editable **Type** field.
- Elements with inline anonymous simpleTypes expose an editable **Base Type** field and the **Facets** tab while still offering **Replacement Type** for converting back to an explicit type reference.
- Elements with inline anonymous complexTypes expose an editable **Base Type** field for extension bases while still offering **Replacement Type** for converting back to an explicit type reference.
- Dropping an anonymous `simpleType` or `complexType` onto an element that currently has an explicit `type="..."` reference replaces that explicit type reference with the new inline anonymous type instead of failing.
- Dropping the **restriction** palette item onto a relevant node creates or updates a simple-type restriction using the best available base type.
- Dropping the **extension** palette item onto a relevant node creates or updates a complex-type extension using the best available base type.
- Type and base-type inputs expose known schema and built-in XSD types through suggestions while still allowing free-form typing for imported or included types.
- simpleType nodes edit the resolved **Base Type** only; rendered summary strings such as `simpleType (restricts xs:string)` are never edited directly.
- complexType nodes keep their rendered summary labels read-only, but any resolved extension base is editable through **Base Type**.

### Docs

- Documentation uses the same commit behavior as other editable fields (blur or Enter commits).
- There is no docs-only save button.

### XML

- Read-only preview of the node's key properties (id, name, itemType, type, cardinality).
- Reflects in-panel edits immediately via the draft node.

---

## 6. Context menu and toolbar boundaries

### Context menu

- Keep context menu highly context-sensitive.
- Keep operations that are inherently contextual and/or not well represented in palette/panel, including:
  - Reorder
  - Refactor submenu
  - Find usages
  - Go to definition
  - Cut / Copy / Paste
  - Regenerate sample XML
- Context menu may duplicate selected add/edit/delete actions as shortcuts, but it is not the primary interaction surface.

### Toolbar

- Toolbar contains only actions that apply to the complete schema/diagram.
- Node-level operations should stay in palette, panel, or context menu.

---

## 7. Synchronization

- The panel keeps a local draft copy (`draftNode`) for the current selection so switching tabs does not reload stale values from the diagram.
- On schema update, the panel rebinds to the refreshed diagram node that matches the current selection ID.
- If the selected node no longer exists after a schema update, the panel is cleared.
- Visual selection highlighting is reapplied to the matched node after each re-render.
