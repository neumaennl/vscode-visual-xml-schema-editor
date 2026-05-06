import React from "react";
import {
  Activity,
  Bell,
  Check,
  GitBranch,
  Wifi,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function StatusBar({ message = "XML schema parsed in 12ms", errors = 0, warnings = 1 }) {
  return (
    <div
      className="font-ui flex h-[22px] items-stretch text-[11px]"
      style={{ background: "var(--vsc-status)", color: "white" }}
    >
      <div className="flex items-center gap-1.5 px-2">
        <GitBranch size={12} />
        <span>main</span>
      </div>
      <div className="flex items-center gap-1.5 border-l border-white/15 px-2">
        <Activity size={12} />
        <span>0 ↓ 0 ↑</span>
      </div>
      <div className="flex items-center gap-1.5 border-l border-white/15 px-2">
        {errors > 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
        <span data-testid="status-errors">{errors} errors</span>
        <span className="opacity-70">·</span>
        <span data-testid="status-warnings">{warnings} warnings</span>
      </div>
      <div className="flex flex-1 items-center px-3 opacity-90">
        <span data-testid="status-message">{message}</span>
      </div>
      <div className="flex items-center gap-1.5 border-l border-white/15 px-2">
        <span>UTF-8</span>
      </div>
      <div className="flex items-center gap-1.5 border-l border-white/15 px-2">
        <span>XSD 1.1</span>
      </div>
      <div className="flex items-center gap-1.5 border-l border-white/15 px-2">
        <Check size={12} />
        <span>Schema Editor</span>
      </div>
      <div className="flex items-center gap-1.5 border-l border-white/15 px-2">
        <Bell size={12} />
      </div>
    </div>
  );
}
