import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Eye, Layers, Sparkles, Home, Code2 } from "lucide-react";

const tabs = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/classic", label: "Classic editor", icon: Layers },
  { to: "/modern", label: "Modern variant", icon: Sparkles },
  { to: "/gallery", label: "UI spec gallery", icon: Eye },
  { to: "/codemap", label: "Code map", icon: Code2 },
];

export default function RouteTabs() {
  const { pathname } = useLocation();
  return (
    <div
      className="flex h-9 items-stretch border-b font-ui text-[12px]"
      style={{
        background: "linear-gradient(180deg,#101216 0%, #0c0e11 100%)",
        borderColor: "var(--vsc-border)",
      }}
    >
      <div className="flex items-center gap-2 px-4 text-[var(--vsc-blue)]">
        <span className="grid h-5 w-5 place-items-center rounded-sm bg-[var(--vsc-blue)] text-[10px] font-bold text-white">
          X
        </span>
        <span className="font-semibold tracking-wide text-[var(--vsc-text)]">
          XSD Editor — design proposal
        </span>
      </div>
      {tabs.map((t) => {
        const active = pathname === t.to;
        const Icon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            data-testid={`route-tab-${t.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={`flex items-center gap-1.5 border-b-2 px-3 transition-colors ${
              active
                ? "border-[var(--vsc-blue)] text-[var(--vsc-text)]"
                : "border-transparent text-[var(--vsc-text-dim)] hover:text-[var(--vsc-text)]"
            }`}
          >
            <Icon size={13} />
            {t.label}
          </Link>
        );
      })}
      <div className="ml-auto flex items-center gap-3 px-4 text-[10px] text-[var(--vsc-text-faint)]">
        <span>Prototype · 2026</span>
      </div>
    </div>
  );
}
