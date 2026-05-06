# PRD — VS Code XML Schema Editor · Editing-Mode Design Proposal

## Original problem statement
> I am developing a VS Code extension that provides a visual XML schema editor similar
> to Altova XML Spy. The extension can already display XML schemas as zoomable diagrams
> with extensible and collapsible nodes. It also has a properties panel on the right side
> of the screen. I now need to add functionality for actually editing an XML schema.
> Show me how the screens, component palette, modified properties panel, context menus,
> etc. could look. You are the designer, so make suggestions.
> Source: https://github.com/neumaennl/vscode-visual-xml-schema-editor/

## Deliverable
A clickable React design prototype + screenshot mockups that show how editing capabilities
could be added to the existing extension while staying faithful to the VS Code dark theme
and the Altova-style schema diagram already rendered.

## User personas
- **Schema author** — wants to declare elements, attributes, types, facets quickly and
  refactor as the schema evolves.
- **API consumer** — wants to read existing schemas with confidence (validation, find
  usages, go to definition).

## Architecture — what's been implemented (Feb 2026)
Frontend-only React prototype. No backend changes.
- `App.js` — 4 routes: `/` Overview · `/classic` · `/modern` · `/gallery`
- `state/schemaStore.js` — in-memory schema state (sample XSD preloaded), undo/redo,
  add child, delete, toggle expand, update-node patch.
- `lib/sampleSchema.js` — example.xsd reproduction (example/meta/product, choiceType,
  loggingType, lengthRestricitionType) + palette groups + xsd primitives.
- `components/editor/`
  - `VSCodeShell.jsx` — TitleBar, ActivityBar+Sidebar (Explorer + Outline), TabBar
  - `Toolbar.jsx` — New / Save / Undo / Redo / Zoom / Validate / Preview / Source /
    Refactor / Find / Export
  - `Palette.jsx` — searchable, grouped (Structure · Compositors · Types · Facets),
    HTML5 drag-source onto canvas
  - `PropertiesPanel.jsx` — 4 tabs (General · Facets · Docs · XML), editable name, kind
    chip, type/base picker, compositor toggle, cardinality chips, min/maxOccurs, nillable/
    abstract/mixed switches, default/fixed, facets list (maxLength/pattern/length/
    enumeration), xs:annotation textarea, live XML view.
  - `SchemaCanvas.jsx` — SVG diagram with classic Altova shapes (white outlined boxes,
    dashed = optional, stacked = repeating, tag-shape = type, octagonal compositors).
    Modern variant flag adds color-coding per node kind, soft glow selection, dotted grid
    backdrop. Drag-and-drop targets per node.
  - `NodeContextMenu.jsx` — right-click menu with Add child submenu, Cardinality submenu,
    Refactor submenu, Find usages, Go to definition, Cut/Copy/Paste, Preview fragment,
    Delete.
  - `Dialogs.jsx` — New element/type modal (4 tabs), Generated XSD preview modal.
  - `ValidationPanel.jsx` — bottom dock with Problems / Output / Schema XML / Sample XML,
    severity icons, line refs.
  - `StatusBar.jsx` — VS Code blue status bar with branch, errors/warnings counts, encoding,
    XSD version.
  - `RouteTabs.jsx` — top navigation between proposal screens.
- `pages/`
  - `Landing.jsx` — Overview/hero with feature cards.
  - `ClassicEditor.jsx` — full editor shell (handles both classic + modern via prop).
  - `Gallery.jsx` — UI spec close-ups of every surface + visual legend.

## Sample data
Preloaded XSD matches user's screenshot: `example` element with `meta` (0..1) and
`product` (0..∞) children, `choiceType` complexType with either + or (2..4),
`loggingType` (collapsed by default), `lengthRestricitionType` simpleType
(maxLength = 255). Selected node on first load is `lengthRestricitionType`, so the
properties panel mirrors the screenshot.

## Backlog / next steps
- P1 — Wire palette drag-and-drop into actual node-creation flow (works on schema/element
  drop targets, can be expanded to attribute-only / facet-only zones).
- P1 — Inline rename on diagram nodes (F2) — currently shown as a context menu action.
- P2 — Import / Include schema dialog with target-namespace picker and conflict resolution.
- P2 — Refactor wizard (rename across schema with dry-run preview).
- P2 — Persistence layer + bidirectional XSD <-> diagram serialization (this prototype
  uses an in-memory tree).
- P3 — XPath playground tab in the bottom dock.

## Key design decisions
- Stayed with the **classic Altova-like diagram** for the primary screen as requested;
  modernization is offered as a non-destructive variant on `/modern`.
- All chrome (titlebar, activity bar, tabs, status bar) reproduces VS Code dark exactly so
  the proposal can be evaluated in-context.
- Properties panel is a 4-tab structure to keep editing actions compact while exposing
  Facets and the live XML serialization.
- Components used: shadcn/ui Tabs, Tooltip, Select, Input, Textarea, Switch, Label,
  Button, Dialog, ContextMenu, Resizable, Sonner toast.
