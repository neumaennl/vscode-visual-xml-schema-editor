import React from "react";
import { Link } from "react-router-dom";
import RouteTabs from "@/components/editor/RouteTabs";
import {
  Layers,
  Sparkles,
  Eye,
  ArrowRight,
  MousePointerClick,
  Wand2,
  GitBranch,
  Boxes,
  ListTree,
  ShieldCheck,
} from "lucide-react";

const Card = ({ to, title, desc, icon: Icon, accent, badge }) => (
  <Link
    to={to}
    className="group relative flex flex-col overflow-hidden rounded-lg border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] p-5 transition-colors hover:border-[var(--vsc-blue)]"
    data-testid={`overview-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
  >
    <div className="mb-3 flex items-center justify-between">
      <div
        className="grid h-9 w-9 place-items-center rounded border"
        style={{ borderColor: accent, color: accent, background: `${accent}15` }}
      >
        <Icon size={18} />
      </div>
      {badge && (
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[10px]"
          style={{ background: `${accent}25`, color: accent }}
        >
          {badge}
        </span>
      )}
    </div>
    <div className="font-ui text-[15px] font-semibold text-[var(--vsc-text)]">{title}</div>
    <div className="mt-1 font-ui text-[12px] leading-relaxed text-[var(--vsc-text-dim)]">
      {desc}
    </div>
    <div className="mt-4 flex items-center gap-1.5 font-ui text-[11px] text-[var(--vsc-blue)]">
      Open <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
    </div>
  </Link>
);

const Feature = ({ icon: Icon, title, desc }) => (
  <div className="flex gap-3 rounded border border-[var(--vsc-border)] bg-[var(--vsc-panel)] p-3">
    <Icon size={18} className="mt-0.5 text-[var(--vsc-blue)]" />
    <div>
      <div className="font-ui text-[12px] font-semibold text-[var(--vsc-text)]">{title}</div>
      <div className="font-ui text-[11px] leading-relaxed text-[var(--vsc-text-dim)]">{desc}</div>
    </div>
  </div>
);

export default function Landing() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <RouteTabs />
      <div className="thin-scroll flex-1 overflow-y-auto">
        <div
          className="border-b px-10 py-12"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(55,148,255,0.10) 0%, transparent 60%)",
            borderColor: "var(--vsc-border)",
          }}
        >
          <div className="font-ui text-[11px] uppercase tracking-[0.3em] text-[var(--vsc-blue)]">
            VS Code extension · design proposal
          </div>
          <h1 className="mt-3 max-w-3xl font-ui text-[34px] font-bold leading-[1.1] text-[var(--vsc-text)]">
            Editing the schema, not just looking at it.
          </h1>
          <p className="mt-3 max-w-2xl font-ui text-[14px] leading-relaxed text-[var(--vsc-text-dim)]">
            A proposal for adding full editing capabilities to{" "}
            <span className="text-[var(--vsc-text)]">vscode-visual-xml-schema-editor</span>.
            Component palette, in-place editing, context menus, refactor actions, dialogs and
            a richer properties panel — all native to the VS Code dark aesthetic, while staying
            faithful to the Altova-style diagram you already render.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] text-[var(--vsc-text-dim)]">
            <span className="rounded-full border border-[var(--vsc-border-strong)] px-2 py-0.5">
              example.xsd
            </span>
            <span className="rounded-full border border-[var(--vsc-border-strong)] px-2 py-0.5">
              XSD 1.1
            </span>
            <span className="rounded-full border border-[var(--vsc-border-strong)] px-2 py-0.5">
              dark theme
            </span>
            <span className="rounded-full border border-[var(--vsc-border-strong)] px-2 py-0.5">
              shadcn/ui
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 px-10 py-8 md:grid-cols-3">
          <Card
            to="/classic"
            title="Classic editor"
            desc="The current Altova-style diagram with full editing scaffolding layered on. Drag from palette, edit in panel, right-click for actions."
            icon={Layers}
            accent="#3794ff"
            badge="recommended"
          />
          <Card
            to="/modern"
            title="Modern variant"
            desc="Same layout, refined visuals: color-coded node types, soft glow selection, dotted grid background. A non-destructive evolution."
            icon={Sparkles}
            accent="#c586c0"
            badge="exploration"
          />
          <Card
            to="/gallery"
            title="UI spec gallery"
            desc="Close-ups of every editing surface: palette, properties (4 tabs), context menus, dialogs, validation panel and inline editing."
            icon={Eye}
            accent="#dcdcaa"
          />
        </div>

        <div className="px-10 pb-12">
          <h2 className="mb-3 font-ui text-[14px] font-semibold uppercase tracking-wider text-[var(--vsc-text-dim)]">
            What this proposal adds
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Feature icon={Boxes} title="Component Palette" desc="Drag-source list of elements, attributes, compositors, types and facets — searchable, grouped, hot-key friendly." />
            <Feature icon={MousePointerClick} title="Right-click everywhere" desc="Add child, refactor (extract/inline), change cardinality, reorder, find usages, go to definition." />
            <Feature icon={ListTree} title="Editable Properties" desc="Tabs for General · Facets · Docs · XML. Inline cardinality chips, primitive picker, default/fixed, nillable/abstract toggles." />
            <Feature icon={Wand2} title="Refactor actions" desc="Extract anonymous type to global, inline a global type, convert sequence ⇄ choice, rename across schema." />
            <Feature icon={GitBranch} title="Inline editing" desc="F2 to rename nodes on the diagram, click cardinality to cycle, drag to reorder siblings." />
            <Feature icon={ShieldCheck} title="Live validation" desc="Bottom panel with errors, warnings, info. Click to jump. Hover diagram to see issues per node." />
          </div>
        </div>
      </div>
    </div>
  );
}
