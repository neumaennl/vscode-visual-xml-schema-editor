import React, { useMemo, useState } from "react";
import RouteTabs from "@/components/editor/RouteTabs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight,
  FileCode2,
  FolderTree,
  GitCommitHorizontal,
  Workflow,
  CheckCircle2,
  XCircle,
  Boxes,
  PanelRight,
  MousePointer2,
  Layers,
  GitPullRequest,
  Play,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Code snippets that read as vanilla-TS drop-ins under webview-src/ and src/.
// Class names mirror the existing repo: DiagramItem, DiagramBuilder,
// DiagramSvgRenderer, ShapeRenderers, TextRenderers, SchemaProcessors,
// PropertyPanel, commandProcessor, commandValidation, schemaNavigator.
// -----------------------------------------------------------------------------

const Snippet = ({ path, code, lang = "ts" }) => (
  <div className="overflow-hidden rounded-md border border-[var(--vsc-border-strong)]">
    <div
      className="flex items-center justify-between border-b border-[var(--vsc-border)] px-3 py-1.5"
      style={{ background: "var(--vsc-panel-2)" }}
    >
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--vsc-text-dim)]">
        <FileCode2 size={12} className="text-[var(--vsc-blue)]" />
        {path}
      </div>
      <span className="font-mono text-[10px] text-[var(--vsc-text-faint)]">{lang}</span>
    </div>
    <pre className="thin-scroll max-h-[420px] overflow-auto bg-[var(--vsc-bg)] p-3 font-mono text-[11px] leading-relaxed text-[var(--vsc-text)]">
{code}
    </pre>
  </div>
);

// ------------------ proposed files: webview-src/ ------------------

const PALETTE_TS = `// webview-src/palette/PaletteView.ts
// New module — sits next to DiagramSvgRenderer in the existing webview shell.
// No framework added: same plain-TS + DOM style as the current PropertyPanel.

import { PaletteItem, paletteGroups } from "./PaletteItems";

export type PaletteDropPayload = { kind: PaletteItem["kind"]; itemId: string };

export class PaletteView {
    private readonly host: HTMLElement;

    constructor(host: HTMLElement) {
        this.host = host;
        this.render();
    }

    /** Re-renders on settings change (e.g. xmlSchemaVisualEditor.showType). */
    public render(): void {
        this.host.innerHTML = "";
        const search = document.createElement("input");
        search.type = "search";
        search.placeholder = "Search components…";
        search.className = "palette-search";
        search.addEventListener("input", () => this.filter(search.value));
        this.host.appendChild(search);

        for (const group of paletteGroups) {
            const section = document.createElement("section");
            section.dataset.group = group.label;
            const h = document.createElement("h3");
            h.textContent = group.label;
            section.appendChild(h);

            for (const item of group.items) {
                const row = document.createElement("div");
                row.className = "palette-row";
                row.draggable = true;
                row.dataset.kind = item.kind;
                row.dataset.itemId = item.id;
                row.textContent = item.name;
                row.title = item.description;
                row.addEventListener("dragstart", (e) => {
                    const payload: PaletteDropPayload = {
                        kind: item.kind,
                        itemId: item.id,
                    };
                    e.dataTransfer?.setData(
                        "application/x-xsd-component",
                        JSON.stringify(payload),
                    );
                    e.dataTransfer!.effectAllowed = "copy";
                });
                section.appendChild(row);
            }
            this.host.appendChild(section);
        }
    }

    private filter(q: string): void {
        const needle = q.trim().toLowerCase();
        for (const row of this.host.querySelectorAll<HTMLElement>(".palette-row")) {
            row.hidden = needle.length > 0 && !row.textContent!.toLowerCase().includes(needle);
        }
    }
}
`;

const DROP_TARGETS_TS = `// webview-src/diagram/DiagramSvgRenderer.ts (additions)
// Wire each rendered <g data-item-id> to accept palette drops and dispatch a
// command. The renderer already owns the SVG node lifecycle; we just add
// listeners after each shape is appended.

import type { DiagramItem } from "./DiagramItem";
import type { CommandBus } from "../command/CommandBus";
import type { PaletteDropPayload } from "../palette/PaletteView";

export class DiagramSvgRenderer {
    constructor(private readonly bus: CommandBus /*, ... existing deps */) {}

    /** Existing method, augmented with drop handlers. */
    public attachInteractions(group: SVGGElement, item: DiagramItem): void {
        group.addEventListener("dragover", (e) => {
            if (e.dataTransfer?.types.includes("application/x-xsd-component")) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                group.classList.add("drop-target");
            }
        });
        group.addEventListener("dragleave", () => group.classList.remove("drop-target"));
        group.addEventListener("drop", (e) => {
            e.preventDefault();
            group.classList.remove("drop-target");
            const raw = e.dataTransfer?.getData("application/x-xsd-component");
            if (!raw) return;
            const payload = JSON.parse(raw) as PaletteDropPayload;
            this.bus.dispatch({
                type: "AddChildCommand",
                parentItemId: item.id,
                childKind: payload.kind,
            });
        });

        group.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.bus.dispatch({
                type: "OpenContextMenuCommand",
                itemId: item.id,
                at: { x: e.clientX, y: e.clientY },
            });
        });
    }
}
`;

const PROPERTY_PANEL_TS = `// webview-src/PropertyPanel.ts (additions)
// Keeps your existing helpers — createRestrictionItem(), expectAdjacentText
// test pattern, DOM-method-only rendering for XSS safety. Adds a single
// createEditableField() helper used by every editable row.

export class PropertyPanel {
    /** Existing read-only renderer wraps each row through a tiny editable shim. */
    private createEditableField(
        label: string,
        value: string,
        onCommit: (next: string) => void,
    ): HTMLElement {
        const row = document.createElement("div");
        row.className = "prop-row";
        const lbl = document.createElement("label");
        lbl.textContent = label;
        const input = document.createElement("input");
        input.type = "text";
        input.value = value;
        input.addEventListener("change", () => onCommit(input.value));
        row.append(lbl, input);
        return row;
    }

    /** Now editing dispatches commands instead of mutating the DOM directly. */
    private renderCardinality(item: DiagramItem): HTMLElement {
        return this.createEditableField("minOccurs", String(item.minOccurs ?? 1), (v) =>
            this.bus.dispatch({
                type: "UpdateCardinalityCommand",
                itemId: item.id,
                minOccurs: Number(v),
            }),
        );
    }
}
`;

// ------------------ proposed files: src/ ------------------

const COMMAND_TS = `// src/command/Commands.ts
// Discriminated union, matching the existing CommandExecutionResult /
// ValidationResult shape introduced in Phase 2.

export type SchemaCommand =
    | { type: "AddChildCommand"; parentItemId: string; childKind: SchemaKind }
    | { type: "DeleteItemCommand"; itemId: string }
    | { type: "UpdateCardinalityCommand"; itemId: string; minOccurs: number; maxOccurs?: number | "unbounded" }
    | { type: "RenameItemCommand"; itemId: string; newName: string }
    | { type: "ConvertCompositorCommand"; itemId: string; to: "sequence" | "choice" | "all" }
    | { type: "ExtractGlobalTypeCommand"; itemId: string; typeName: string }
    | { type: "InlineTypeCommand"; itemId: string }
    | { type: "RenameAcrossSchemaCommand"; oldQName: string; newQName: string };
`;

const COMMAND_PROCESSOR_TS = `// src/command/commandProcessor.ts (additions)
// Each new command gets one validator + one handler, mirroring how
// AddElementCommand and groupValidators are wired today.

import { validateExtractGlobalType } from "./validators/extractGlobalTypeValidator";
import { applyExtractGlobalType } from "./handlers/extractGlobalTypeHandler";

export class CommandProcessor {
    public execute(cmd: SchemaCommand): CommandExecutionResult {
        const v = this.validate(cmd);
        if (v.kind === "invalid") {
            return { kind: "failure", reason: v.reason, command: cmd };
        }
        switch (cmd.type) {
            case "ExtractGlobalTypeCommand":
                return applyExtractGlobalType(this.schema, cmd, this.xmlbind);
            // ... other cases route to their handlers
        }
    }

    private validate(cmd: SchemaCommand): ValidationResult {
        switch (cmd.type) {
            case "ExtractGlobalTypeCommand":
                return validateExtractGlobalType(this.schema, cmd);
            // ...
        }
    }
}
`;

const ROUND_TRIP_TS = `// src/command/handlers/extractGlobalTypeHandler.ts
// Pure function — receives the in-memory xmlbind-ts schema, returns a new
// schema. webviewProvider then re-serializes via xmlbind-ts marshal() and
// hands the resulting string back to vscode.TextDocument as a single edit.

import { Schema, ComplexType } from "@neumaennl/xmlbind-ts/generated/schema";

export function applyExtractGlobalType(
    schema: Schema,
    cmd: ExtractGlobalTypeCommand,
    _xmlbind: XmlbindAdapter,
): CommandExecutionResult {
    const target = findItem(schema, cmd.itemId);
    if (!target?.complexType) {
        return { kind: "failure", reason: "Target has no anonymous complexType", command: cmd };
    }
    const promoted = new ComplexType({ name: cmd.typeName, ...target.complexType });
    schema.complexTypes.push(promoted);
    target.complexType = undefined;
    target.type = cmd.typeName;
    return { kind: "success", command: cmd };
}
`;

const SETTINGS_TS = `// package.json contributes (additions)
// Reuses the existing xmlSchemaVisualEditor namespace.
{
    "configuration": {
        "title": "XML Schema Visual Editor",
        "properties": {
            "xmlSchemaVisualEditor.diagramTheme": {
                "type": "string",
                "enum": ["classic", "modern"],
                "default": "classic",
                "description": "Visual style of the schema diagram. 'classic' matches xsddiagram (current). 'modern' adds color-coded node kinds and a soft glow on selection."
            },
            "xmlSchemaVisualEditor.editing.confirmDestructive": {
                "type": "boolean",
                "default": true,
                "description": "Show a confirmation when an edit deletes nodes referenced elsewhere in the schema."
            }
        }
    }
}
`;

// ------------------ command flow visualisation ------------------

const flowSteps = [
  {
    icon: MousePointer2,
    title: "1. User action",
    body: "Drop palette item / right-click / edit input.",
    sub: "PaletteView · NodeContextMenu · PropertyPanel",
  },
  {
    icon: GitCommitHorizontal,
    title: "2. Command emitted",
    body: "{ type: \"AddChildCommand\", parentItemId, childKind }",
    sub: "src/command/Commands.ts",
  },
  {
    icon: CheckCircle2,
    title: "3. Validated",
    body: "ValidationResult — discriminated union (Phase 2).",
    sub: "commandValidation · groupValidators",
  },
  {
    icon: Workflow,
    title: "4. Applied",
    body: "Pure handler mutates the xmlbind-ts schema instance.",
    sub: "commandProcessor → handlers/*",
  },
  {
    icon: FileCode2,
    title: "5. Round-tripped",
    body: "xmlbind-ts marshal() → TextDocument.applyEdit().",
    sub: "webviewProvider",
  },
  {
    icon: Layers,
    title: "6. Re-rendered",
    body: "DiagramBuilder rebuilds DiagramItems → SvgRenderer paints.",
    sub: "DiagramBuilder · DiagramLayout",
  },
];

const Pill = ({ children }) => (
  <span className="rounded-full border border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--vsc-text-dim)]">
    {children}
  </span>
);

export default function CodeMap() {
  const [tab, setTab] = useState("flow");

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <RouteTabs />
      <div className="thin-scroll flex-1 overflow-y-auto p-6">
        <div className="mb-6 max-w-4xl">
          <div className="mb-2 font-ui text-[11px] uppercase tracking-[0.3em] text-[var(--vsc-blue)]">
            repo-aligned proposal · v2
          </div>
          <h1 className="font-ui text-[26px] font-bold text-[var(--vsc-text)]">
            Wiring the editing UI into your existing extension
          </h1>
          <p className="mt-2 font-ui text-[13px] leading-relaxed text-[var(--vsc-text-dim)]">
            Concrete drop-in modules for{" "}
            <span className="font-mono text-[var(--vsc-text)]">webview-src/</span> and{" "}
            <span className="font-mono text-[var(--vsc-text)]">src/</span>, sized to fit your
            current PR cadence (#29, #44, #150). Class names mirror{" "}
            <span className="font-mono">DiagramItem</span>,{" "}
            <span className="font-mono">DiagramSvgRenderer</span>,{" "}
            <span className="font-mono">PropertyPanel</span>,{" "}
            <span className="font-mono">commandProcessor</span>,{" "}
            <span className="font-mono">SchemaProcessors</span>. Round-trip uses{" "}
            <span className="font-mono">@neumaennl/xmlbind-ts</span>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>vanilla TS</Pill>
            <Pill>no React in webview</Pill>
            <Pill>reuses existing settings</Pill>
            <Pill>discriminated commands</Pill>
            <Pill>XSS-safe DOM rendering</Pill>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList
            className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0"
            style={{ borderColor: "var(--vsc-border)" }}
          >
            {[
              ["flow", "Command flow", Workflow],
              ["deltas", "Delivery plan", GitPullRequest],
              ["demo", "Round-trip demo", Play],
              ["files", "File map", FolderTree],
              ["webview", "webview-src/ snippets", PanelRight],
              ["src", "src/ snippets", Boxes],
            ].map(([v, label, Icon]) => (
              <TabsTrigger
                key={v}
                value={v}
                className="h-9 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 font-ui text-[12px] text-[var(--vsc-text-dim)] data-[state=active]:border-[var(--vsc-blue)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--vsc-text)] data-[state=active]:shadow-none"
              >
                <Icon size={13} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="flow" className="mt-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {flowSteps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="relative rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded border border-[var(--vsc-blue)]/40 bg-[var(--vsc-blue)]/10 text-[var(--vsc-blue)]">
                        <Icon size={15} />
                      </div>
                      <div className="font-ui text-[13px] font-semibold text-[var(--vsc-text)]">
                        {s.title}
                      </div>
                      {i < flowSteps.length - 1 && (
                        <ArrowRight
                          size={14}
                          className="ml-auto text-[var(--vsc-text-faint)]"
                        />
                      )}
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[var(--vsc-text)]">
                      {s.body}
                    </pre>
                    <div className="mt-2 font-mono text-[10px] text-[var(--vsc-text-faint)]">
                      {s.sub}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-lg border border-dashed border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-4">
              <div className="mb-2 flex items-center gap-2 font-ui text-[12px] font-semibold text-[var(--vsc-text)]">
                <XCircle size={14} className="text-[var(--vsc-red)]" />
                Failure path (already covered by Phase 2)
              </div>
              <pre className="font-mono text-[11px] leading-relaxed text-[var(--vsc-text-dim)]">
{`commandProcessor.execute(cmd)
  → validation.kind === "invalid"
  → vscode.window.showWarningMessage(validation.reason)
  → diagram unchanged, no TextDocument edit emitted`}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="deltas" className="mt-6">
            <DeliveryPlan />
          </TabsContent>

          <TabsContent value="demo" className="mt-6">
            <RoundTripDemo />
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-4">
                <div className="mb-2 font-ui text-[12px] font-semibold uppercase tracking-wider text-[var(--vsc-text-dim)]">
                  webview-src/ (UI)
                </div>
                <pre className="font-mono text-[11px] leading-relaxed text-[var(--vsc-text)]">
{`webview-src/
├── diagram/
│   ├── DiagramItem.ts                (existing, +drop metadata)
│   ├── DiagramBuilder.ts             (existing)
│   ├── DiagramLayout.ts              (existing)
│   ├── DiagramSvgRenderer.ts         (+attachInteractions)
│   ├── ShapeRenderers.ts             (+modern theme branch)
│   └── TextRenderers.ts              (existing)
├── palette/                          NEW
│   ├── PaletteView.ts
│   └── PaletteItems.ts
├── contextmenu/                      NEW
│   └── NodeContextMenu.ts
├── toolbar/                          NEW
│   └── Toolbar.ts
├── dialogs/                          NEW
│   ├── NewElementDialog.ts
│   └── PreviewDialog.ts
├── PropertyPanel.ts                  (existing, +editable shim)
└── webview.ts                        (mounts the new modules)`}
                </pre>
              </div>

              <div className="rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-4">
                <div className="mb-2 font-ui text-[12px] font-semibold uppercase tracking-wider text-[var(--vsc-text-dim)]">
                  src/ (extension host)
                </div>
                <pre className="font-mono text-[11px] leading-relaxed text-[var(--vsc-text)]">
{`src/
├── webviewProvider.ts                (existing, routes new commands)
├── command/
│   ├── Commands.ts                   NEW (discriminated union)
│   ├── commandProcessor.ts           (+ new cases)
│   ├── commandValidation.ts          (existing pattern, +validators)
│   ├── handlers/                     NEW
│   │   ├── extractGlobalTypeHandler.ts
│   │   ├── inlineTypeHandler.ts
│   │   ├── convertCompositorHandler.ts
│   │   └── renameAcrossSchemaHandler.ts
│   └── validators/                   NEW
│       └── *.ts (one per command)
├── schemaNavigator.ts                (existing — find usages, go to def)
├── SchemaProcessors.ts               (existing — extractRestrictionFacets)
└── settings.ts                       (+ diagramTheme, confirmDestructive)`}
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="webview" className="mt-6 space-y-4">
            <Snippet path="webview-src/palette/PaletteView.ts" code={PALETTE_TS} />
            <Snippet
              path="webview-src/diagram/DiagramSvgRenderer.ts"
              code={DROP_TARGETS_TS}
            />
            <Snippet path="webview-src/PropertyPanel.ts" code={PROPERTY_PANEL_TS} />
          </TabsContent>

          <TabsContent value="src" className="mt-6 space-y-4">
            <Snippet path="src/command/Commands.ts" code={COMMAND_TS} />
            <Snippet path="src/command/commandProcessor.ts" code={COMMAND_PROCESSOR_TS} />
            <Snippet
              path="src/command/handlers/extractGlobalTypeHandler.ts"
              code={ROUND_TRIP_TS}
            />
            <Snippet path="package.json" code={SETTINGS_TS} lang="json" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// =============================================================================
// Task 1 — Delivery plan: PR-sized deltas that fit your existing review cadence.
// =============================================================================

const prs = [
  {
    id: "PR-1",
    title: "Component palette + drop targets",
    size: "S",
    loc: "~250 LOC",
    touches: [
      "webview-src/palette/PaletteView.ts (new)",
      "webview-src/palette/PaletteItems.ts (new)",
      "webview-src/diagram/DiagramSvgRenderer.ts (+attachInteractions)",
      "webview-src/webview.ts (mount palette)",
    ],
    enables: "Drag element / attribute / compositor / type / facet onto any node. Drop fires AddChildCommand — already supported by the Phase 2 commandProcessor.",
    tests: [
      "PaletteView.test.ts — renders groups, search filters, dragstart sets MIME",
      "DiagramSvgRenderer.test.ts — drop dispatches AddChildCommand with correct parentItemId",
    ],
    risk: "Low. No changes to the schema model.",
  },
  {
    id: "PR-2",
    title: "Editable PropertyPanel + Facets tab",
    size: "M",
    loc: "~450 LOC",
    touches: [
      "webview-src/PropertyPanel.ts (+createEditableField, 4-tab structure)",
      "webview-src/PropertyPanel.test.ts (extend expectAdjacentText patterns)",
      "src/command/UpdateCardinalityCommand.ts (new)",
      "src/command/UpdateDocumentationCommand.ts (new)",
      "src/command/UpdateFacetCommand.ts (new)",
    ],
    enables: "Inline editing of name, cardinality, type, docs, and all simpleType facets (maxLength, pattern, enumeration…) with round-trip through xmlbind-ts.",
    tests: [
      "Reuse existing createRestrictionItem — symmetric serialisation (parse ↔ emit)",
      "Round-trip integration test per facet kind (maxLength, pattern, enumeration, length, totalDigits)",
    ],
    risk: "Medium. Must preserve the XSS-safe DOM-method pattern you already enforce.",
  },
  {
    id: "PR-3",
    title: "Context menu + refactor commands",
    size: "M",
    loc: "~550 LOC",
    touches: [
      "webview-src/contextmenu/NodeContextMenu.ts (new)",
      "src/command/ExtractGlobalTypeCommand.ts + handler (new)",
      "src/command/InlineTypeCommand.ts + handler (new)",
      "src/command/ConvertCompositorCommand.ts + handler (new)",
      "src/command/RenameAcrossSchemaCommand.ts + handler (new)",
      "src/command/validators/*.ts (one per new command)",
    ],
    enables: "Right-click any diagram node → add child, change cardinality, reorder, refactor, find usages (via schemaNavigator), go to definition, delete.",
    tests: [
      "Phase-2-style integration tests per command (full XSD pipeline)",
      "Validator tests — each command rejects with a human reason when preconditions fail",
      "schemaNavigator.findUsages exercised by the 'Rename across schema' command",
    ],
    risk: "Medium. Refactor commands mutate multiple xmlbind-ts nodes — keep handlers pure and well-tested.",
  },
  {
    id: "PR-4",
    title: "Toolbar + validation panel",
    size: "S",
    loc: "~300 LOC",
    touches: [
      "webview-src/toolbar/Toolbar.ts (new)",
      "webview-src/validation/ValidationPanel.ts (new)",
      "src/webviewProvider.ts (forward vscode.Diagnostic[] into the webview)",
    ],
    enables: "Save / Undo / Redo (via TextDocument) / Validate / Preview XSD / Source / Export diagram. Bottom dock mirrors vscode.languages.getDiagnostics() for the .xsd URI.",
    tests: [
      "Toolbar dispatches the correct vscode.commands",
      "ValidationPanel.test.ts — click-to-jump calls schemaNavigator.revealItem",
    ],
    risk: "Low. Mostly UI; diagnostics already exist.",
  },
  {
    id: "PR-5",
    title: "diagramTheme setting (classic / modern)",
    size: "XS",
    loc: "~80 LOC",
    touches: [
      "package.json (contributes.configuration — xmlSchemaVisualEditor.diagramTheme)",
      "webview-src/diagram/ShapeRenderers.ts (+modern branch: colour per kind, glow)",
      "README.md (document new setting alongside showDocumentation/alwaysShowOccurrence/showType)",
    ],
    enables: "Opt-in modern visuals without touching the classic default.",
    tests: [
      "ShapeRenderers.test.ts — snapshot per theme × node kind",
    ],
    risk: "Negligible. Default unchanged.",
  },
];

function DeliveryPlan() {
  return (
    <div className="space-y-3">
      <div className="mb-2 font-ui text-[12px] text-[var(--vsc-text-dim)]">
        Five PRs, totalling ~1,600 LOC. Sized to mirror PR #29, #44 and #150. Each ships
        independently and leaves `main` green.
      </div>
      {prs.map((pr) => (
        <div
          key={pr.id}
          className="overflow-hidden rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)]"
        >
          <div className="flex items-center gap-3 border-b border-[var(--vsc-border)] px-4 py-2">
            <span className="rounded bg-[var(--vsc-blue)]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--vsc-blue)]">
              {pr.id}
            </span>
            <span className="font-ui text-[13px] font-semibold text-[var(--vsc-text)]">
              {pr.title}
            </span>
            <span className="ml-auto flex items-center gap-2 font-mono text-[10px] text-[var(--vsc-text-faint)]">
              <span className="rounded-full border border-[var(--vsc-border-strong)] px-2 py-0.5">
                size {pr.size}
              </span>
              <span>{pr.loc}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            <div>
              <div className="mb-1 font-ui text-[10px] uppercase tracking-wider text-[var(--vsc-text-dim)]">
                Files touched
              </div>
              <ul className="space-y-0.5 font-mono text-[11px] text-[var(--vsc-text)]">
                {pr.touches.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <span className="text-[var(--vsc-text-faint)]">·</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 font-ui text-[10px] uppercase tracking-wider text-[var(--vsc-text-dim)]">
                Unlocks
              </div>
              <p className="font-ui text-[11px] leading-relaxed text-[var(--vsc-text)]">
                {pr.enables}
              </p>
              <div className="mt-3 font-ui text-[10px] uppercase tracking-wider text-[var(--vsc-text-dim)]">
                Risk
              </div>
              <p className="font-ui text-[11px] leading-relaxed text-[var(--vsc-text-dim)]">
                {pr.risk}
              </p>
            </div>
            <div>
              <div className="mb-1 font-ui text-[10px] uppercase tracking-wider text-[var(--vsc-text-dim)]">
                Tests
              </div>
              <ul className="space-y-0.5 font-ui text-[11px] text-[var(--vsc-text)]">
                {pr.tests.map((t) => (
                  <li key={t} className="flex gap-1.5">
                    <CheckCircle2
                      size={11}
                      className="mt-0.5 shrink-0 text-[var(--vsc-green)]"
                    />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Task 2 — Round-trip demo: edit a field, watch a SchemaCommand get emitted,
// then watch the XSD before / after diff. Faked (no real xmlbind-ts) but
// structurally identical to what commandProcessor would produce.
// =============================================================================

const BASELINE_XSD = `<xs:simpleType name="lengthRestricitionType">
  <xs:annotation>
    <xs:documentation>a simple string with a max length</xs:documentation>
  </xs:annotation>
  <xs:restriction base="xs:string">
    <xs:maxLength value="255"/>
  </xs:restriction>
</xs:simpleType>`;

function diffLines(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  const rows = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const la = a[i];
    const lb = b[i];
    if (la === lb) rows.push({ kind: "same", text: la ?? "" });
    else {
      if (la !== undefined) rows.push({ kind: "del", text: la });
      if (lb !== undefined) rows.push({ kind: "add", text: lb });
    }
  }
  return rows;
}

function RoundTripDemo() {
  const [name, setName] = useState("lengthRestricitionType");
  const [base, setBase] = useState("xs:string");
  const [maxLen, setMaxLen] = useState(255);
  const [doc, setDoc] = useState("a simple string with a max length");

  const { commands, afterXsd } = useMemo(() => {
    const cmds = [];
    if (name !== "lengthRestricitionType") {
      cmds.push({
        type: "RenameAcrossSchemaCommand",
        oldQName: "lengthRestricitionType",
        newQName: name,
      });
    }
    if (base !== "xs:string") {
      cmds.push({
        type: "UpdateSimpleTypeBaseCommand",
        itemId: "st-lengthRestriction",
        base,
      });
    }
    if (maxLen !== 255) {
      cmds.push({
        type: "UpdateFacetCommand",
        itemId: "st-lengthRestriction",
        facet: "maxLength",
        value: maxLen,
      });
    }
    if (doc !== "a simple string with a max length") {
      cmds.push({
        type: "UpdateDocumentationCommand",
        itemId: "st-lengthRestriction",
        documentation: doc,
      });
    }

    const xsd = `<xs:simpleType name="${name}">
  <xs:annotation>
    <xs:documentation>${doc}</xs:documentation>
  </xs:annotation>
  <xs:restriction base="${base}">
    <xs:maxLength value="${maxLen}"/>
  </xs:restriction>
</xs:simpleType>`;
    return { commands: cmds, afterXsd: xsd };
  }, [name, base, maxLen, doc]);

  const rows = diffLines(BASELINE_XSD, afterXsd);
  const inputCls =
    "h-7 border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[12px]";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 1 — The editable panel (PropertyPanel-shaped) */}
      <div className="rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <PanelRight size={14} className="text-[var(--vsc-blue)]" />
          <div className="font-ui text-[12px] font-semibold text-[var(--vsc-text)]">
            1 · PropertyPanel edits
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="font-ui text-[11px] text-[var(--vsc-text-dim)]">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} data-testid="demo-name" />
          </div>
          <div>
            <Label className="font-ui text-[11px] text-[var(--vsc-text-dim)]">Base type</Label>
            <Select value={base} onValueChange={setBase}>
              <SelectTrigger className={inputCls} data-testid="demo-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-mono text-xs">
                <SelectItem value="xs:string">xs:string</SelectItem>
                <SelectItem value="xs:token">xs:token</SelectItem>
                <SelectItem value="xs:normalizedString">xs:normalizedString</SelectItem>
                <SelectItem value="xs:anyURI">xs:anyURI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-ui text-[11px] text-[var(--vsc-text-dim)]">
              maxLength facet
            </Label>
            <Input
              type="number"
              value={maxLen}
              onChange={(e) => setMaxLen(Number(e.target.value) || 0)}
              className={inputCls}
              data-testid="demo-maxlen"
            />
          </div>
          <div>
            <Label className="font-ui text-[11px] text-[var(--vsc-text-dim)]">
              xs:documentation
            </Label>
            <Input value={doc} onChange={(e) => setDoc(e.target.value)} className={inputCls} data-testid="demo-doc" />
          </div>
        </div>
      </div>

      {/* 2 — Emitted commands */}
      <div className="rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <GitCommitHorizontal size={14} className="text-[var(--vsc-purple)]" />
          <div className="font-ui text-[12px] font-semibold text-[var(--vsc-text)]">
            2 · SchemaCommand(s) emitted
          </div>
          <span className="ml-auto rounded-full border border-[var(--vsc-border-strong)] px-2 py-0.5 font-mono text-[10px] text-[var(--vsc-text-dim)]">
            {commands.length}
          </span>
        </div>
        {commands.length === 0 ? (
          <div className="rounded border border-dashed border-[var(--vsc-border-strong)] p-3 font-ui text-[11px] leading-relaxed text-[var(--vsc-text-faint)]">
            No changes yet — edit any field on the left to see the command stream.
          </div>
        ) : (
          <div className="space-y-2">
            {commands.map((c, i) => (
              <pre
                key={i}
                data-testid={`demo-command-${i}`}
                className="rounded border border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] p-2 font-mono text-[11px] leading-relaxed text-[var(--vsc-text)]"
              >
{JSON.stringify(c, null, 2)}
              </pre>
            ))}
            <div className="flex items-center gap-2 rounded border border-[var(--vsc-green)]/40 bg-[var(--vsc-green)]/10 px-2 py-1.5 font-ui text-[11px] text-[var(--vsc-green)]">
              <CheckCircle2 size={12} />
              validation.kind === "valid" · commandProcessor.execute() → success
            </div>
          </div>
        )}
      </div>

      {/* 3 — XSD diff */}
      <div className="rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileCode2 size={14} className="text-[var(--vsc-orange)]" />
          <div className="font-ui text-[12px] font-semibold text-[var(--vsc-text)]">
            3 · example.xsd diff (xmlbind-ts marshal)
          </div>
        </div>
        <pre
          data-testid="demo-xsd-diff"
          className="thin-scroll max-h-[340px] overflow-auto rounded border border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[11px] leading-relaxed"
        >
          {rows.map((r, i) => {
            const bg =
              r.kind === "add"
                ? "rgba(106,153,85,0.18)"
                : r.kind === "del"
                ? "rgba(244,135,113,0.18)"
                : "transparent";
            const prefix = r.kind === "add" ? "+ " : r.kind === "del" ? "- " : "  ";
            const color =
              r.kind === "add"
                ? "var(--vsc-green)"
                : r.kind === "del"
                ? "var(--vsc-red)"
                : "var(--vsc-text)";
            return (
              <div
                key={i}
                style={{ background: bg, color, padding: "0 8px" }}
              >
                <span className="select-none opacity-60">{prefix}</span>
                {r.text || "\u00A0"}
              </div>
            );
          })}
        </pre>
        <div className="mt-2 font-ui text-[10px] text-[var(--vsc-text-faint)]">
          The real flow calls <span className="font-mono">xmlbind.marshal(schema)</span> then
          emits a single <span className="font-mono">TextDocument.applyEdit()</span>.
        </div>
      </div>
    </div>
  );
}
