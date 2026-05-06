import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { xsdPrimitives } from "@/lib/sampleSchema";

const inputCls =
  "h-8 border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[12px]";

export function NewElementDialog({ open, onOpenChange }) {
  const [tab, setTab] = useState("element");
  const [name, setName] = useState("newElement");
  const [type, setType] = useState("xs:string");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] font-ui text-[var(--vsc-text)] sm:max-w-[560px]"
        data-testid="dialog-new-element"
      >
        <DialogHeader>
          <DialogTitle className="text-[14px]">New schema component</DialogTitle>
          <DialogDescription className="text-[12px] text-[var(--vsc-text-dim)]">
            Create a globally declared element, attribute, or type.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 bg-[var(--vsc-bg)]">
            {["element", "attribute", "complex", "simple"].map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                className="text-[11px] capitalize data-[state=active]:bg-[var(--vsc-panel-2)] data-[state=active]:text-[var(--vsc-blue)]"
              >
                {k} type
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="element" className="mt-4 space-y-3">
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className={inputCls}>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-[var(--vsc-text-dim)]">minOccurs</Label>
                <Input defaultValue="1" className={inputCls} />
              </div>
              <div>
                <Label className="text-[11px] text-[var(--vsc-text-dim)]">maxOccurs</Label>
                <Input defaultValue="1" className={inputCls} />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Documentation</Label>
              <Textarea
                rows={3}
                placeholder="Describe this element…"
                className="resize-none border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] font-mono text-[12px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="attribute" className="mt-4 space-y-3">
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Name</Label>
              <Input defaultValue="newAttribute" className={inputCls} />
            </div>
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Type</Label>
              <Select defaultValue="xs:string">
                <SelectTrigger className={inputCls}>
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
            </div>
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Use</Label>
              <Select defaultValue="optional">
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="optional">optional</SelectItem>
                  <SelectItem value="required">required</SelectItem>
                  <SelectItem value="prohibited">prohibited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="complex" className="mt-4 space-y-3">
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Name</Label>
              <Input defaultValue="NewComplexType" className={inputCls} />
            </div>
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Compositor</Label>
              <Select defaultValue="sequence">
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequence">sequence</SelectItem>
                  <SelectItem value="choice">choice</SelectItem>
                  <SelectItem value="all">all</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Derive from</Label>
              <Input placeholder="(none — base type)" className={inputCls} />
            </div>
          </TabsContent>

          <TabsContent value="simple" className="mt-4 space-y-3">
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Name</Label>
              <Input defaultValue="NewSimpleType" className={inputCls} />
            </div>
            <div>
              <Label className="text-[11px] text-[var(--vsc-text-dim)]">Base</Label>
              <Select defaultValue="xs:string">
                <SelectTrigger className={inputCls}>
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
            </div>
            <div className="rounded border border-dashed border-[var(--vsc-border-strong)] p-3 text-[11px] text-[var(--vsc-text-dim)]">
              You can add facets (pattern, length, enumeration…) after creation in the
              Properties → Facets tab.
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[var(--vsc-text-dim)] hover:bg-[var(--vsc-panel-2)] hover:text-[var(--vsc-text)]"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[var(--vsc-blue)] text-white hover:bg-[var(--vsc-blue-2)]"
            data-testid="dialog-create-btn"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PreviewDialog({ open, onOpenChange }) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/schema"
           elementFormDefault="qualified">

  <xs:element name="example">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="meta" type="metaType" minOccurs="0"/>
        <xs:element name="product" type="productType" minOccurs="0" maxOccurs="unbounded"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>

  <xs:complexType name="choiceType">
    <xs:choice>
      <xs:element name="either" type="xs:string"/>
      <xs:element name="or" type="xs:string" minOccurs="2" maxOccurs="4"/>
    </xs:choice>
  </xs:complexType>

  <xs:simpleType name="lengthRestricitionType">
    <xs:annotation>
      <xs:documentation>a simple string with a max length</xs:documentation>
    </xs:annotation>
    <xs:restriction base="xs:string">
      <xs:maxLength value="255"/>
    </xs:restriction>
  </xs:simpleType>

</xs:schema>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)] font-ui text-[var(--vsc-text)] sm:max-w-[720px]"
        data-testid="dialog-preview"
      >
        <DialogHeader>
          <DialogTitle className="text-[14px]">Generated XSD preview</DialogTitle>
          <DialogDescription className="text-[12px] text-[var(--vsc-text-dim)]">
            Live read-only view of the XML serialization.
          </DialogDescription>
        </DialogHeader>
        <pre className="thin-scroll max-h-[460px] overflow-auto rounded border border-[var(--vsc-border-strong)] bg-[var(--vsc-bg)] p-3 font-mono text-[11px] leading-relaxed text-[var(--vsc-text)]">
{xml}
        </pre>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[var(--vsc-text-dim)] hover:bg-[var(--vsc-panel-2)] hover:text-[var(--vsc-text)]"
          >
            Close
          </Button>
          <Button className="bg-[var(--vsc-blue)] text-white hover:bg-[var(--vsc-blue-2)]">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
