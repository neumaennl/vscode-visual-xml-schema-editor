import React from "react";
import {
  Files,
  Search,
  GitBranch,
  Bug,
  Boxes,
  Settings,
  User,
  ChevronRight,
  ChevronDown,
  FileCode,
  Folder,
  FolderOpen,
  X,
  Circle,
  Rss,
} from "lucide-react";

const ActivityIcon = ({ icon: Icon, active, label }) => (
  <button
    title={label}
    className={`grid h-12 w-full place-items-center border-l-2 transition-colors ${
      active
        ? "border-[var(--vsc-blue)] text-[var(--vsc-text)]"
        : "border-transparent text-[var(--vsc-text-faint)] hover:text-[var(--vsc-text)]"
    }`}
  >
    <Icon size={20} />
  </button>
);

const TreeRow = ({ depth = 0, icon: Icon, label, color, active, expanded, onClick }) => (
  <div
    onClick={onClick}
    className={`flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[12px] hover:bg-[var(--vsc-panel-2)] ${
      active ? "bg-[var(--vsc-blue)]/20 text-[var(--vsc-text)]" : "text-[var(--vsc-text-dim)]"
    }`}
    style={{ paddingLeft: 8 + depth * 12 }}
  >
    {expanded === undefined ? (
      <span className="w-3" />
    ) : expanded ? (
      <ChevronDown size={11} />
    ) : (
      <ChevronRight size={11} />
    )}
    <Icon size={13} style={{ color }} />
    <span className="font-ui">{label}</span>
  </div>
);

export const Sidebar = () => (
  <div className="flex h-full">
    {/* Activity bar */}
    <div
      className="flex w-12 flex-col items-center pt-1"
      style={{ background: "var(--vsc-bg-deep)", borderRight: "1px solid var(--vsc-border)" }}
    >
      <ActivityIcon icon={Files} active label="Explorer" />
      <ActivityIcon icon={Search} label="Search" />
      <ActivityIcon icon={GitBranch} label="Source Control" />
      <ActivityIcon icon={Bug} label="Run & Debug" />
      <ActivityIcon icon={Boxes} label="Extensions" />
      <ActivityIcon icon={Rss} label="XML Schema" />
      <div className="mt-auto">
        <ActivityIcon icon={User} label="Account" />
        <ActivityIcon icon={Settings} label="Settings" />
      </div>
    </div>

    {/* Explorer */}
    <div
      className="flex w-56 flex-col"
      style={{ background: "var(--vsc-panel)", borderRight: "1px solid var(--vsc-border)" }}
    >
      <div className="border-b border-[var(--vsc-border)] px-3 py-2 font-ui text-[11px] uppercase tracking-wider text-[var(--vsc-text-dim)]">
        Explorer
      </div>
      <div className="flex items-center gap-1 px-2 py-1 font-ui text-[11px] uppercase tracking-wider text-[var(--vsc-text)]">
        <ChevronDown size={11} /> schemas-project
      </div>
      <div className="thin-scroll flex-1 overflow-y-auto pb-2">
        <TreeRow icon={FolderOpen} label="src" expanded depth={0} />
        <TreeRow icon={FolderOpen} label="schemas" expanded depth={1} />
        <TreeRow
          icon={Rss}
          color="var(--vsc-orange)"
          label="example.xsd"
          active
          depth={2}
        />
        <TreeRow icon={Rss} color="var(--vsc-orange)" label="orders.xsd" depth={2} />
        <TreeRow icon={Rss} color="var(--vsc-orange)" label="catalog.xsd" depth={2} />
        <TreeRow icon={Folder} label="generated" depth={1} />
        <TreeRow icon={Folder} label="samples" depth={1} />
        <TreeRow icon={FileCode} label="package.json" depth={0} />
        <TreeRow icon={FileCode} label="README.md" depth={0} />
      </div>
      <div className="border-t border-[var(--vsc-border)] px-3 py-1.5 font-ui text-[10px] uppercase text-[var(--vsc-text-dim)]">
        Outline · example.xsd
      </div>
      <div className="thin-scroll max-h-48 overflow-y-auto pb-2">
        <TreeRow icon={Circle} color="var(--vsc-blue)" label="example" depth={0} />
        <TreeRow icon={Circle} color="var(--vsc-green)" label="choiceType" depth={0} />
        <TreeRow icon={Circle} color="var(--vsc-green)" label="loggingType" depth={0} />
        <TreeRow icon={Circle} color="var(--vsc-yellow)" label="lengthRestricitionType" depth={0} />
      </div>
    </div>
  </div>
);

export const TabBar = () => (
  <div
    className="flex h-9 items-stretch"
    style={{ background: "var(--vsc-panel)", borderBottom: "1px solid var(--vsc-border)" }}
  >
    <div
      className="flex items-center gap-2 border-r px-3"
      style={{
        background: "var(--vsc-tab-active)",
        borderColor: "var(--vsc-border)",
        borderTop: "1px solid var(--vsc-blue)",
      }}
    >
      <Rss size={13} className="text-[var(--vsc-orange)]" />
      <span className="font-ui text-[12px] text-[var(--vsc-text)]">example.xsd</span>
      <X size={12} className="text-[var(--vsc-text-dim)] hover:text-[var(--vsc-text)]" />
    </div>
    <div
      className="flex items-center gap-2 border-r px-3"
      style={{ background: "var(--vsc-tab-inactive)", borderColor: "var(--vsc-border)" }}
    >
      <FileCode size={13} className="text-[var(--vsc-text-dim)]" />
      <span className="font-ui text-[12px] text-[var(--vsc-text-dim)]">orders.xsd</span>
      <X size={12} className="text-[var(--vsc-text-faint)]" />
    </div>
    <div className="flex flex-1" style={{ background: "var(--vsc-panel)" }} />
  </div>
);

export const TitleBar = ({ title = "Visual XML Schema Editor — example.xsd" }) => (
  <div
    className="flex h-8 items-center gap-2 px-3"
    style={{ background: "#3c3c3c", color: "var(--vsc-text)" }}
  >
    <div className="flex gap-1.5">
      <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
      <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
    </div>
    <div className="ml-3 font-ui text-[12px] text-[var(--vsc-text-dim)]">File Edit Selection View Go Run Terminal Help</div>
    <div className="mx-auto font-ui text-[12px]">{title}</div>
  </div>
);
