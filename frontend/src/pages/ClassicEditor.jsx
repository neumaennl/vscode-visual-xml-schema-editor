import React, { useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Sidebar, TabBar, TitleBar } from "@/components/editor/VSCodeShell";
import Toolbar from "@/components/editor/Toolbar";
import Palette from "@/components/editor/Palette";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import SchemaCanvas from "@/components/editor/SchemaCanvas";
import StatusBar from "@/components/editor/StatusBar";
import ValidationPanel from "@/components/editor/ValidationPanel";
import { NewElementDialog, PreviewDialog } from "@/components/editor/Dialogs";
import { SchemaProvider } from "@/state/schemaStore";
import RouteTabs from "@/components/editor/RouteTabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function ClassicEditor({ modern = false }) {
  const [zoom, setZoom] = useState(1);
  const [validationCollapsed, setValidationCollapsed] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <SchemaProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <RouteTabs />
        <TitleBar
          title={`Visual XML Schema Editor — example.xsd${modern ? " (modern preview)" : ""}`}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TabBar />
            <Toolbar
              onNew={() => setNewOpen(true)}
              onPreview={() => setPreviewOpen(true)}
              onValidate={() => toast.success("Schema validated · 0 errors, 1 warning")}
              onZoomIn={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
              onZoomOut={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              onFit={() => setZoom(1)}
            />
            <div className="flex flex-1 overflow-hidden">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={18} minSize={12} maxSize={28}>
                  <Palette />
                </ResizablePanel>
                <ResizableHandle className="bg-[var(--vsc-border)]" />
                <ResizablePanel defaultSize={56}>
                  <ResizablePanelGroup direction="vertical">
                    <ResizablePanel defaultSize={72}>
                      <SchemaCanvas modern={modern} zoom={zoom} onZoomChange={setZoom} />
                    </ResizablePanel>
                    <ResizableHandle className="bg-[var(--vsc-border)]" />
                    <ResizablePanel
                      defaultSize={28}
                      minSize={validationCollapsed ? 4 : 14}
                      maxSize={50}
                    >
                      <ValidationPanel
                        collapsed={validationCollapsed}
                        onToggle={() => setValidationCollapsed((c) => !c)}
                      />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
                <ResizableHandle className="bg-[var(--vsc-border)]" />
                <ResizablePanel defaultSize={26} minSize={18} maxSize={40}>
                  <PropertiesPanel />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
            <StatusBar />
          </div>
        </div>
        <NewElementDialog open={newOpen} onOpenChange={setNewOpen} />
        <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--vsc-panel)",
              border: "1px solid var(--vsc-border-strong)",
              color: "var(--vsc-text)",
              fontFamily: "Segoe UI, Inter, sans-serif",
              fontSize: "12px",
            },
          }}
        />
      </div>
    </SchemaProvider>
  );
}
