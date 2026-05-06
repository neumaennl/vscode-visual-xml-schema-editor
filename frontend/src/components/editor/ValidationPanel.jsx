import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronUp } from "lucide-react";

const items = [
  {
    sev: "warn",
    file: "example.xsd",
    line: 14,
    msg: "Element 'product' has unbounded maxOccurs but no key/keyref defined.",
  },
  {
    sev: "info",
    file: "example.xsd",
    line: 22,
    msg: "Compositor 'choice' contains a single particle — consider sequence.",
  },
];

const ICONS = {
  error: <XCircle size={12} className="text-[var(--vsc-red)]" />,
  warn: <AlertTriangle size={12} className="text-[#dcdcaa]" />,
  info: <Info size={12} className="text-[var(--vsc-blue)]" />,
  ok: <CheckCircle2 size={12} className="text-[var(--vsc-green)]" />,
};

export default function ValidationPanel({ collapsed, onToggle }) {
  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "var(--vsc-panel)", borderTop: "1px solid var(--vsc-border)" }}
    >
      <div
        className="flex items-center gap-3 border-b px-3 py-1 font-ui text-[11px] uppercase tracking-wider text-[var(--vsc-text-dim)]"
        style={{ borderColor: "var(--vsc-border)" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--vsc-text)]">Problems</span>
          <span className="rounded-sm bg-[var(--vsc-bg)] px-1 font-mono text-[10px]">
            {items.length}
          </span>
        </span>
        <span>Output</span>
        <span>Schema XML</span>
        <span>Sample XML</span>
        <button
          onClick={onToggle}
          data-testid="validation-toggle"
          className="ml-auto grid h-6 w-6 place-items-center rounded text-[var(--vsc-text-dim)] hover:bg-[var(--vsc-panel-2)] hover:text-[var(--vsc-text)]"
        >
          <ChevronUp size={12} className={collapsed ? "rotate-180 transition" : "transition"} />
        </button>
      </div>
      {!collapsed && (
        <div className="thin-scroll flex-1 overflow-y-auto font-mono text-[12px]">
          {items.map((it, i) => (
            <div
              key={i}
              className="flex items-center gap-2 border-b border-[var(--vsc-border)] px-3 py-1.5 hover:bg-[var(--vsc-panel-2)]"
            >
              {ICONS[it.sev]}
              <span className="text-[var(--vsc-text)]">{it.msg}</span>
              <span className="ml-auto text-[var(--vsc-text-faint)]">
                {it.file}:{it.line}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 text-[var(--vsc-text-faint)]">
            {ICONS.ok}
            <span>Schema is well-formed. 0 errors.</span>
          </div>
        </div>
      )}
    </div>
  );
}
