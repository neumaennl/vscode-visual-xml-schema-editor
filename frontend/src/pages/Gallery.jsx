import React from "react";
import RouteTabs from "@/components/editor/RouteTabs";
import { SchemaProvider } from "@/state/schemaStore";
import Palette from "@/components/editor/Palette";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import SchemaCanvas from "@/components/editor/SchemaCanvas";
import { NewElementDialog, PreviewDialog } from "@/components/editor/Dialogs";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Plus, Edit3, Trash2, Wand2, Repeat, GitBranch } from "lucide-react";

const Section = ({ title, subtitle, children, span = "" }) => (
  <section
    className={`rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-4 ${span}`}
  >
    <div className="mb-3">
      <div className="font-ui text-[13px] font-semibold text-[var(--vsc-text)]">{title}</div>
      {subtitle && (
        <div className="font-ui text-[11px] text-[var(--vsc-text-dim)]">{subtitle}</div>
      )}
    </div>
    {children}
  </section>
);

// Static, pre-opened context menu mockup
const StaticContextMenu = () => (
  <ContextMenu>
    <ContextMenuTrigger asChild>
      <button className="rounded border border-dashed border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] px-4 py-3 font-ui text-[12px] text-[var(--vsc-text-dim)] hover:text-[var(--vsc-text)]">
        Right-click here to preview the menu
      </button>
    </ContextMenuTrigger>
    <ContextMenuContent className="w-64 border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] font-ui text-[12px] text-[var(--vsc-text)]">
      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <Plus size={12} className="text-[var(--vsc-blue)]" /> Add child
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] font-ui text-[12px]">
          <ContextMenuItem className="focus:bg-[var(--vsc-panel-2)]">Element</ContextMenuItem>
          <ContextMenuItem className="focus:bg-[var(--vsc-panel-2)]">Attribute</ContextMenuItem>
          <ContextMenuItem className="focus:bg-[var(--vsc-panel-2)]">
            Sequence compositor
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
        <Edit3 size={12} /> Rename inline
        <ContextMenuShortcut>F2</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
        <Repeat size={12} /> Cardinality
      </ContextMenuItem>
      <ContextMenuSeparator className="bg-[var(--vsc-border)]" />
      <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
        <Wand2 size={12} className="text-[var(--vsc-purple)]" /> Refactor →
      </ContextMenuItem>
      <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
        <GitBranch size={12} /> Find usages
      </ContextMenuItem>
      <ContextMenuSeparator className="bg-[var(--vsc-border)]" />
      <ContextMenuItem className="gap-2 text-[var(--vsc-red)] focus:bg-[var(--vsc-red)]/15 focus:text-[var(--vsc-red)]">
        <Trash2 size={12} /> Delete
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
);

export default function Gallery() {
  const [newOpen, setNewOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  return (
    <SchemaProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <RouteTabs />
        <div className="thin-scroll flex-1 overflow-y-auto p-6">
          <div className="mb-6 max-w-3xl">
            <h1 className="font-ui text-[24px] font-bold text-[var(--vsc-text)]">
              Editing-mode UI spec
            </h1>
            <p className="mt-2 font-ui text-[13px] leading-relaxed text-[var(--vsc-text-dim)]">
              Annotated close-ups of every new editing surface. Components are real (shadcn/ui)
              and behave the same way they would in the editor — drag the palette, type into
              fields, right-click the area below for the context menu.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <Section
              title="1 — Component Palette"
              subtitle="Left dock · drag-source · search-first · hotkeys"
            >
              <div className="h-[420px] overflow-hidden rounded border border-[var(--vsc-border)]">
                <Palette />
              </div>
            </Section>

            <Section
              title="2 — Properties panel"
              subtitle="Right dock · 4 tabs · contextual fields per node kind"
              span="xl:col-span-1"
            >
              <div className="h-[420px] overflow-hidden rounded border border-[var(--vsc-border)]">
                <PropertiesPanel />
              </div>
            </Section>

            <Section
              title="3 — Context menu (right-click on node)"
              subtitle="Submenus for Add / Cardinality / Refactor"
            >
              <div className="flex h-[420px] flex-col items-center justify-center gap-4 rounded border border-dashed border-[var(--vsc-border)] p-6 text-center">
                <StaticContextMenu />
                <div className="font-ui text-[11px] text-[var(--vsc-text-faint)]">
                  Same menu wires up on each diagram node.
                </div>
              </div>
            </Section>

            <Section
              title="4 — Diagram in editing mode"
              subtitle="Selection glow, drop targets, expand/collapse, cardinality chips"
              span="xl:col-span-2"
            >
              <div className="h-[420px] overflow-hidden rounded border border-[var(--vsc-border)]">
                <SchemaCanvas />
              </div>
            </Section>

            <Section title="5 — Dialogs" subtitle="Modal flows for global declarations">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setNewOpen(true)}
                  data-testid="open-new-dialog"
                  className="rounded border border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] px-3 py-2 text-left font-ui text-[12px] text-[var(--vsc-text)] transition-colors hover:border-[var(--vsc-blue)] hover:text-[var(--vsc-blue)]"
                >
                  Open · New element / type dialog
                </button>
                <button
                  onClick={() => setPreviewOpen(true)}
                  data-testid="open-preview-dialog"
                  className="rounded border border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] px-3 py-2 text-left font-ui text-[12px] text-[var(--vsc-text)] transition-colors hover:border-[var(--vsc-blue)] hover:text-[var(--vsc-blue)]"
                >
                  Open · Generated XSD preview
                </button>
                <div className="mt-2 rounded border border-dashed border-[var(--vsc-border-strong)] p-3 font-ui text-[11px] leading-relaxed text-[var(--vsc-text-dim)]">
                  Additional dialogs proposed: <em>Import / Include schema</em>,{" "}
                  <em>Rename across schema</em>, <em>Extract to global type</em>,{" "}
                  <em>Edit annotation (rich)</em>.
                </div>
              </div>
            </Section>
          </div>
        </div>

        <NewElementDialog open={newOpen} onOpenChange={setNewOpen} />
        <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
      </div>
    </SchemaProvider>
  );
}
