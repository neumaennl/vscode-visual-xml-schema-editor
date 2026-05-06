import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { paletteGroups } from "@/lib/sampleSchema";
import {
  Square,
  AtSign,
  Group,
  Asterisk,
  AlignJustify,
  GitBranch,
  LayoutList,
  Boxes,
  Type,
  PlusSquare,
  MinusSquare,
  List,
  Regex,
  Ruler,
  MoveHorizontal,
  Search,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from "lucide-react";

const iconMap = {
  Square, AtSign, Group, Asterisk, AlignJustify, GitBranch, LayoutList,
  Boxes, Type, PlusSquare, MinusSquare, List, Regex, Ruler, MoveHorizontal,
};

const PaletteItem = ({ item }) => {
  const Icon = iconMap[item.icon] || Square;
  const onDragStart = (e) => {
    e.dataTransfer.setData("application/x-xsd-component", item.id);
    e.dataTransfer.effectAllowed = "copy";
  };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      data-testid={`palette-item-${item.id}`}
      className="group flex cursor-grab items-center gap-2 rounded px-2 py-1.5 text-[12px] text-[var(--vsc-text)] transition-colors hover:bg-[var(--vsc-panel-2)] active:cursor-grabbing"
      title={item.desc}
    >
      <GripVertical size={11} className="text-[var(--vsc-text-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
      <Icon size={14} className="text-[var(--vsc-blue)]" />
      <span className="font-ui">{item.name}</span>
      <span className="ml-auto truncate font-ui text-[10px] text-[var(--vsc-text-faint)]">
        {item.desc}
      </span>
    </div>
  );
};

export default function Palette() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(() =>
    Object.fromEntries(paletteGroups.map((g) => [g.label, true]))
  );

  const filtered = paletteGroups.map((g) => ({
    ...g,
    items: g.items.filter((it) =>
      (it.name + it.desc).toLowerCase().includes(query.toLowerCase())
    ),
  }));

  return (
    <aside
      data-testid="component-palette"
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--vsc-panel)" }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-2 font-ui text-[11px] uppercase tracking-wider text-[var(--vsc-text-dim)]"
        style={{ borderColor: "var(--vsc-border)" }}
      >
        <span>Components</span>
        <span className="text-[10px] text-[var(--vsc-text-faint)]">drag onto canvas</span>
      </div>
      <div className="px-2 pt-2">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--vsc-text-faint)]"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            data-testid="palette-search"
            className="h-7 border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] pl-7 font-ui text-xs placeholder:text-[var(--vsc-text-faint)]"
          />
        </div>
      </div>

      <div className="thin-scroll mt-2 flex-1 overflow-y-auto px-1 pb-3">
        {filtered.map((group) => (
          <div key={group.label} className="mb-1">
            <button
              onClick={() => setOpen((s) => ({ ...s, [group.label]: !s[group.label] }))}
              className="flex w-full items-center gap-1 px-2 py-1 font-ui text-[11px] uppercase tracking-wide text-[var(--vsc-text-dim)] hover:text-[var(--vsc-text)]"
            >
              {open[group.label] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {group.label}
              <span className="ml-auto text-[10px] text-[var(--vsc-text-faint)]">
                {group.items.length}
              </span>
            </button>
            {open[group.label] && (
              <div className="space-y-0.5">
                {group.items.map((it) => (
                  <PaletteItem key={it.id} item={it} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="border-t px-3 py-2 font-ui text-[10px] leading-relaxed text-[var(--vsc-text-faint)]"
        style={{ borderColor: "var(--vsc-border)" }}
      >
        Tip: drag onto a node to add as child, drop on empty canvas to declare globally.
      </div>
    </aside>
  );
}
