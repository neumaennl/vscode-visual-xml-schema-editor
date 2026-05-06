import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PlayCircle,
  FileCode2,
  Plus,
  Sparkles,
  Search,
  Download,
  Eye,
} from "lucide-react";
import { useSchema } from "@/state/schemaStore";

const Btn = ({ onClick, label, children, testid, accent }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          data-testid={testid}
          className={`grid h-7 w-7 place-items-center rounded text-[var(--vsc-text-dim)] transition-colors hover:bg-[var(--vsc-panel-2)] hover:text-[var(--vsc-text)] ${
            accent ? "text-[var(--vsc-blue)]" : ""
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-ui text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const Sep = () => <div className="mx-1 h-5 w-px bg-[var(--vsc-border-strong)]" />;

export default function Toolbar({ onNew, onValidate, onPreview, onZoomIn, onZoomOut, onFit }) {
  const { undo, redo, canUndo, canRedo } = useSchema();
  return (
    <div
      className="flex items-center gap-0.5 border-b px-2 py-1"
      style={{ background: "var(--vsc-panel)", borderColor: "var(--vsc-border)" }}
    >
      <Btn label="New element / type" testid="toolbar-new" onClick={onNew} accent>
        <Plus size={15} />
      </Btn>
      <Btn label="Save (Ctrl+S)" testid="toolbar-save">
        <Save size={15} />
      </Btn>
      <Sep />
      <Btn
        label="Undo (Ctrl+Z)"
        testid="toolbar-undo"
        onClick={canUndo ? undo : undefined}
      >
        <Undo2 size={15} className={canUndo ? "" : "opacity-40"} />
      </Btn>
      <Btn
        label="Redo (Ctrl+Shift+Z)"
        testid="toolbar-redo"
        onClick={canRedo ? redo : undefined}
      >
        <Redo2 size={15} className={canRedo ? "" : "opacity-40"} />
      </Btn>
      <Sep />
      <Btn label="Zoom in" testid="toolbar-zoom-in" onClick={onZoomIn}>
        <ZoomIn size={15} />
      </Btn>
      <Btn label="Zoom out" testid="toolbar-zoom-out" onClick={onZoomOut}>
        <ZoomOut size={15} />
      </Btn>
      <Btn label="Fit view" testid="toolbar-fit" onClick={onFit}>
        <Maximize2 size={15} />
      </Btn>
      <Sep />
      <Btn label="Validate schema" testid="toolbar-validate" onClick={onValidate}>
        <PlayCircle size={15} />
      </Btn>
      <Btn label="Preview generated XSD" testid="toolbar-preview" onClick={onPreview}>
        <Eye size={15} />
      </Btn>
      <Btn label="View raw XSD" testid="toolbar-source">
        <FileCode2 size={15} />
      </Btn>
      <Sep />
      <Btn label="Refactor (rename / extract)" testid="toolbar-refactor">
        <Sparkles size={15} />
      </Btn>
      <Btn label="Find in schema (Ctrl+F)" testid="toolbar-find">
        <Search size={15} />
      </Btn>
      <Btn label="Export diagram (PNG/SVG)" testid="toolbar-export">
        <Download size={15} />
      </Btn>

      <div className="ml-auto font-ui text-[11px] text-[var(--vsc-text-faint)]">
        example.xsd · XSD 1.1 · UTF-8
      </div>
    </div>
  );
}
