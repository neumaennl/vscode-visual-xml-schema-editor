import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Trash2,
  ListPlus,
  Regex,
  Ruler,
  Hash,
  FileText,
  Settings2,
  Lock,
  Wand2,
} from "lucide-react";
import { useSchema } from "@/state/schemaStore";
import { xsdPrimitives } from "@/lib/sampleSchema";

const SectionHeader = ({ icon: Icon, children, action }) => (
  <div className="flex items-center justify-between border-b border-[var(--vsc-border)] px-3 py-1.5">
    <div className="flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-wider text-[var(--vsc-text-dim)]">
      {Icon ? <Icon size={11} /> : null}
      {children}
    </div>
    {action}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div className="space-y-1 px-3 py-2">
    <Label className="font-ui text-[11px] text-[var(--vsc-text-dim)]">{label}</Label>
    {children}
    {hint ? (
      <p className="font-ui text-[10px] text-[var(--vsc-text-faint)]">{hint}</p>
    ) : null}
  </div>
);

const inputCls =
  "h-7 border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[12px] text-[var(--vsc-text)] focus-visible:ring-1 focus-visible:ring-[var(--vsc-blue)] focus-visible:ring-offset-0";

export default function PropertiesPanel() {
  const { selectedNode, updateNode, deleteNode } = useSchema();

  if (!selectedNode) {
    return (
      <aside
        className="flex h-full flex-col items-center justify-center px-6 text-center"
        style={{ background: "var(--vsc-panel)" }}
      >
        <div
          className="mb-3 grid h-12 w-12 place-items-center rounded-full border"
          style={{ borderColor: "var(--vsc-border-strong)" }}
        >
          <Settings2 size={20} className="text-[var(--vsc-text-faint)]" />
        </div>
        <div className="font-ui text-sm text-[var(--vsc-text-dim)]">No selection</div>
        <p className="mt-1 font-ui text-[11px] leading-relaxed text-[var(--vsc-text-faint)]">
          Select a node in the diagram to edit its properties, or drag a component from the
          left palette to add a new node.
        </p>
      </aside>
    );
  }

  const n = selectedNode;
  const isElement = n.kind === "element";
  const isSimple = n.kind === "simpleType";
  const isComplex = n.kind === "complexType";
  const isAttribute = n.kind === "attribute";

  return (
    <aside
      data-testid="properties-panel"
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ background: "var(--vsc-panel)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: "var(--vsc-border)" }}
      >
        <div
          className="grid h-6 w-6 place-items-center rounded text-[10px] font-bold uppercase"
          style={{
            background: "var(--vsc-bg)",
            color: "var(--vsc-blue)",
            border: "1px solid var(--vsc-border-strong)",
          }}
        >
          {n.kind[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-ui text-[13px] text-[var(--vsc-text)]">Properties</div>
          <div className="truncate font-mono text-[10px] text-[var(--vsc-text-faint)]">
            {n.kind} · {n.id}
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => deleteNode(n.id)}
          data-testid="props-delete"
          className="h-7 w-7 p-0 text-[var(--vsc-red)] hover:bg-[var(--vsc-panel-2)] hover:text-[var(--vsc-red)]"
        >
          <Trash2 size={13} />
        </Button>
      </div>

      <Tabs defaultValue="general" className="flex flex-1 flex-col overflow-hidden">
        <TabsList
          className="h-8 w-full justify-start rounded-none border-b bg-transparent p-0"
          style={{ borderColor: "var(--vsc-border)" }}
        >
          {["general", "facets", "docs", "xml"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="h-8 rounded-none border-b-2 border-transparent bg-transparent px-3 font-ui text-[11px] uppercase tracking-wider text-[var(--vsc-text-dim)] data-[state=active]:border-[var(--vsc-blue)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--vsc-text)] data-[state=active]:shadow-none"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="thin-scroll flex-1 overflow-y-auto">
          <TabsContent value="general" className="m-0">
            <SectionHeader icon={FileText}>Identity</SectionHeader>
            <Field label="Name">
              <Input
                value={n.name || ""}
                onChange={(e) => updateNode(n.id, { name: e.target.value })}
                className={inputCls}
                data-testid="props-name"
              />
            </Field>

            <Field label="Kind">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[10px] text-[var(--vsc-blue)]"
                >
                  {n.kind}
                </Badge>
                <span className="font-ui text-[10px] text-[var(--vsc-text-faint)]">
                  Use refactor to convert
                </span>
              </div>
            </Field>

            {(isElement || isAttribute) && (
              <Field label="Type">
                <Select
                  value={n.type || "xs:string"}
                  onValueChange={(v) => updateNode(n.id, { type: v })}
                >
                  <SelectTrigger
                    data-testid="props-type"
                    className="h-7 border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[12px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-mono text-xs">
                    <div className="px-2 py-1 font-ui text-[10px] uppercase text-[var(--vsc-text-faint)]">
                      Primitives
                    </div>
                    {xsdPrimitives.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                    <div className="border-t border-[var(--vsc-border)] px-2 py-1 font-ui text-[10px] uppercase text-[var(--vsc-text-faint)]">
                      Custom
                    </div>
                    <SelectItem value="metaType">metaType</SelectItem>
                    <SelectItem value="productType">productType</SelectItem>
                    <SelectItem value="lengthRestricitionType">
                      lengthRestricitionType
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            {isSimple && (
              <Field label="Base type">
                <Select
                  value={n.base || "xs:string"}
                  onValueChange={(v) => updateNode(n.id, { base: v })}
                >
                  <SelectTrigger className="h-7 border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-mono text-xs">
                    {xsdPrimitives.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {isComplex && (
              <Field label="Compositor">
                <div className="flex gap-1">
                  {["sequence", "choice", "all"].map((c) => (
                    <button
                      key={c}
                      onClick={() => updateNode(n.id, { compositor: c })}
                      data-testid={`compositor-${c}`}
                      className={`flex-1 rounded border px-2 py-1 font-ui text-[11px] capitalize transition-colors ${
                        (n.compositor || "sequence") === c
                          ? "border-[var(--vsc-blue)] bg-[var(--vsc-blue)]/15 text-[var(--vsc-blue)]"
                          : "border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] text-[var(--vsc-text-dim)] hover:text-[var(--vsc-text)]"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            {(isElement || isAttribute) && (
              <>
                <SectionHeader icon={Hash}>Cardinality</SectionHeader>
                <div className="grid grid-cols-2 gap-2 px-3 py-2">
                  <div>
                    <Label className="font-ui text-[10px] text-[var(--vsc-text-dim)]">
                      minOccurs
                    </Label>
                    <Input defaultValue="1" className={inputCls} data-testid="props-min" />
                  </div>
                  <div>
                    <Label className="font-ui text-[10px] text-[var(--vsc-text-dim)]">
                      maxOccurs
                    </Label>
                    <Input defaultValue="1" className={inputCls} data-testid="props-max" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 px-3 pb-2">
                  {["0..1", "1..1", "0..∞", "1..∞", "2..4"].map((p) => (
                    <button
                      key={p}
                      onClick={() => updateNode(n.id, { cardinality: p })}
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                        n.cardinality === p
                          ? "border-[var(--vsc-blue)] bg-[var(--vsc-blue)]/15 text-[var(--vsc-blue)]"
                          : "border-[var(--vsc-border-strong)] text-[var(--vsc-text-dim)] hover:text-[var(--vsc-text)]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <SectionHeader icon={Lock}>Constraints</SectionHeader>
                <div className="space-y-2 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-ui text-[11px] text-[var(--vsc-text)]">
                      Nillable
                    </Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-ui text-[11px] text-[var(--vsc-text)]">
                      Abstract
                    </Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="font-ui text-[11px] text-[var(--vsc-text)]">
                      Mixed content
                    </Label>
                    <Switch checked={n.mixed || false} onCheckedChange={(v) => updateNode(n.id, { mixed: v })} />
                  </div>
                </div>

                <SectionHeader icon={Wand2}>Default & fixed</SectionHeader>
                <div className="grid grid-cols-2 gap-2 px-3 py-2">
                  <div>
                    <Label className="font-ui text-[10px] text-[var(--vsc-text-dim)]">
                      default
                    </Label>
                    <Input className={inputCls} placeholder="—" />
                  </div>
                  <div>
                    <Label className="font-ui text-[10px] text-[var(--vsc-text-dim)]">
                      fixed
                    </Label>
                    <Input className={inputCls} placeholder="—" />
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="facets" className="m-0">
            <SectionHeader
              icon={Ruler}
              action={
                <button
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 font-ui text-[10px] text-[var(--vsc-blue)] hover:bg-[var(--vsc-panel-2)]"
                  data-testid="add-facet"
                >
                  <Plus size={10} /> Add
                </button>
              }
            >
              Facets / Restrictions
            </SectionHeader>
            <div className="space-y-2 p-3">
              <FacetRow icon={Ruler} label="maxLength" defaultValue={n.restrictions?.maxLength ?? "—"} />
              <FacetRow icon={Ruler} label="minLength" defaultValue="—" />
              <FacetRow icon={Regex} label="pattern" defaultValue="—" />
              <FacetRow icon={Hash} label="totalDigits" defaultValue="—" />

              <div className="rounded border border-dashed border-[var(--vsc-border-strong)] p-2">
                <div className="mb-1 flex items-center gap-1.5 font-ui text-[10px] uppercase text-[var(--vsc-text-dim)]">
                  <ListPlus size={11} /> Enumeration
                </div>
                <div className="flex flex-wrap gap-1">
                  {(n.restrictions?.enumeration || ["DEBUG", "INFO", "WARN", "ERROR"]).map((v) => (
                    <span
                      key={v}
                      className="group inline-flex items-center gap-1 rounded border border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {v}
                      <X
                        size={10}
                        className="cursor-pointer text-[var(--vsc-text-faint)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--vsc-red)]"
                      />
                    </span>
                  ))}
                  <button className="rounded border border-dashed border-[var(--vsc-border-strong)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--vsc-text-dim)] hover:text-[var(--vsc-blue)]">
                    + value
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="m-0 p-3">
            <Label className="font-ui text-[11px] text-[var(--vsc-text-dim)]">
              xs:annotation / xs:documentation
            </Label>
            <Textarea
              value={n.doc || ""}
              onChange={(e) => updateNode(n.id, { doc: e.target.value })}
              data-testid="props-doc"
              rows={6}
              className="mt-1 resize-none border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[12px]"
              placeholder="Describe this node…"
            />
            <div className="mt-3 rounded border border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] p-2">
              <div className="mb-1 font-ui text-[10px] uppercase text-[var(--vsc-text-dim)]">
                xs:appinfo
              </div>
              <Textarea
                rows={3}
                placeholder="<custom-meta/>"
                className="resize-none border-0 bg-transparent p-0 font-mono text-[11px] focus-visible:ring-0"
              />
            </div>
          </TabsContent>

          <TabsContent value="xml" className="m-0 p-0">
            <pre className="thin-scroll overflow-auto p-3 font-mono text-[11px] leading-relaxed">
{`<xs:${n.kind === "complexType" ? "complexType" : n.kind}`}
{n.name ? ` name="${n.name}"` : ""}
{n.type ? ` type="${n.type}"` : ""}
{n.cardinality && n.cardinality !== "1..1" ? `\n  minOccurs="${n.cardinality.split("..")[0]}"\n  maxOccurs="${n.cardinality.split("..")[1].replace("∞", "unbounded")}"` : ""}
{`>`}
{n.doc ? `\n  <xs:annotation>\n    <xs:documentation>${n.doc}</xs:documentation>\n  </xs:annotation>` : ""}
{n.restrictions?.maxLength ? `\n  <xs:restriction base="${n.base || "xs:string"}">\n    <xs:maxLength value="${n.restrictions.maxLength}"/>\n  </xs:restriction>` : ""}
{`\n</xs:${n.kind === "complexType" ? "complexType" : n.kind}>`}
            </pre>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}

const FacetRow = ({ icon: Icon, label, defaultValue }) => (
  <div className="grid grid-cols-[110px_1fr_auto] items-center gap-1.5">
    <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--vsc-text-dim)]">
      <Icon size={11} className="text-[var(--vsc-blue)]" />
      {label}
    </div>
    <Input
      defaultValue={defaultValue}
      className="h-6 border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[11px]"
    />
    <button className="grid h-6 w-6 place-items-center rounded text-[var(--vsc-text-faint)] hover:bg-[var(--vsc-panel-2)] hover:text-[var(--vsc-red)]">
      <X size={11} />
    </button>
  </div>
);
