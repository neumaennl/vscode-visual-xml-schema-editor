import React from "react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import {
  Plus,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  Edit3,
  ArrowUpDown,
  Repeat,
  Asterisk,
  Wand2,
  Eye,
  ExternalLink,
  RefreshCw,
  GitBranch,
} from "lucide-react";
import { useSchema } from "@/state/schemaStore";

export default function NodeContextMenu({ children, node }) {
  const { addChild, deleteNode, updateNode } = useSchema();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className="w-64 border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] font-ui text-[12px] text-[var(--vsc-text)]"
        data-testid={`ctx-menu-${node.id}`}
      >
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 focus:bg-[var(--vsc-panel-2)]">
            <Plus size={12} className="text-[var(--vsc-blue)]" />
            Add child
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] font-ui text-[12px]">
            <ContextMenuItem
              onSelect={() => addChild(node.id, "element", "newElement")}
              data-testid="ctx-add-element"
              className="focus:bg-[var(--vsc-panel-2)]"
            >
              Element
              <ContextMenuShortcut>⌘E</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => addChild(node.id, "attribute", "newAttribute")} className="focus:bg-[var(--vsc-panel-2)]">
              Attribute
              <ContextMenuShortcut>⌘A</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => addChild(node.id, "group", "newGroup")} className="focus:bg-[var(--vsc-panel-2)]">
              Group reference
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-[var(--vsc-border)]" />
            <ContextMenuItem onSelect={() => addChild(node.id, "sequence", "sequence")} className="focus:bg-[var(--vsc-panel-2)]">
              Sequence compositor
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => addChild(node.id, "choice", "choice")} className="focus:bg-[var(--vsc-panel-2)]">
              Choice compositor
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => addChild(node.id, "all", "all")} className="focus:bg-[var(--vsc-panel-2)]">
              All compositor
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <Edit3 size={12} /> Rename inline
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 focus:bg-[var(--vsc-panel-2)]">
            <Repeat size={12} /> Cardinality
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] font-mono text-[12px]">
            {["0..1", "1..1", "0..∞", "1..∞", "2..4"].map((c) => (
              <ContextMenuItem
                key={c}
                onSelect={() => updateNode(node.id, { cardinality: c, optional: c.startsWith("0"), repeating: c.endsWith("∞") || c.endsWith("4") })}
                className="focus:bg-[var(--vsc-panel-2)]"
              >
                {c}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <ArrowUpDown size={12} /> Reorder…
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-[var(--vsc-border)]" />

        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2 focus:bg-[var(--vsc-panel-2)]">
            <Wand2 size={12} className="text-[var(--vsc-purple)]" /> Refactor
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] font-ui text-[12px]">
            <ContextMenuItem className="focus:bg-[var(--vsc-panel-2)]">Extract as global type</ContextMenuItem>
            <ContextMenuItem className="focus:bg-[var(--vsc-panel-2)]">Inline anonymous type</ContextMenuItem>
            <ContextMenuItem className="focus:bg-[var(--vsc-panel-2)]">Convert sequence ⇄ choice</ContextMenuItem>
            <ContextMenuItem className="focus:bg-[var(--vsc-panel-2)]">Promote to root element</ContextMenuItem>
            <ContextMenuSeparator className="bg-[var(--vsc-border)]" />
            <ContextMenuItem className="focus:bg-[var(--vsc-panel-2)]">Rename across schema…</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <GitBranch size={12} /> Find usages
          <ContextMenuShortcut>⇧F12</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <ExternalLink size={12} /> Go to definition
          <ContextMenuShortcut>F12</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-[var(--vsc-border)]" />

        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <Scissors size={12} /> Cut <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <Copy size={12} /> Copy <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <ClipboardPaste size={12} /> Paste as child{" "}
          <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-[var(--vsc-border)]" />

        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <Eye size={12} /> Preview XSD fragment
        </ContextMenuItem>
        <ContextMenuItem className="gap-2 focus:bg-[var(--vsc-panel-2)]">
          <RefreshCw size={12} /> Regenerate sample XML
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-[var(--vsc-border)]" />

        <ContextMenuItem
          onSelect={() => deleteNode(node.id)}
          data-testid="ctx-delete"
          className="gap-2 text-[var(--vsc-red)] focus:bg-[var(--vsc-red)]/15 focus:text-[var(--vsc-red)]"
        >
          <Trash2 size={12} /> Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
