import React, { useMemo, useState } from "react";
import { useSchema } from "@/state/schemaStore";
import NodeContextMenu from "./NodeContextMenu";

/**
 * Classic Altova-like XML schema diagram.
 * - White outlined rectangles
 * - Dashed border = optional (minOccurs=0)
 * - Stacked rectangles = repeating (maxOccurs > 1)
 * - Octagonal compositor connectors (sequence / choice / all)
 * - Tag-shape boxes for types
 * - Right-side cardinality labels
 *
 * SVG-rendered, draggable drop targets, right-click context menus.
 */

const NODE_W = 168;
const NODE_H = 44;
const COMP_W = 56;
const COMP_H = 36;
const HGAP = 88; // gap between columns
const VGAP = 18; // vertical gap between siblings

// ---- helpers --------------------------------------------------------------

function computeLayout(schema, nodeById, modern = false) {
  // Tree layout: walk root => children; each subtree gets its own slab of height
  const measureChildren = (id) => {
    const n = nodeById[id];
    if (!n) return 1;
    const expanded = n.expanded ?? true;
    if (!expanded || !n.children?.length) return 1;
    let total = 0;
    for (const c of n.children) total += measureChildren(c);
    return total;
  };

  const nodes = [];
  const links = [];

  const layout = (id, depth, top) => {
    const n = nodeById[id];
    if (!n) return { height: 0, midY: top };
    const span = measureChildren(id);
    const height = span * (NODE_H + VGAP);
    const midY = top + height / 2;
    const x = 24 + depth * (NODE_W + COMP_W + HGAP);
    nodes.push({ ...n, x, y: midY - NODE_H / 2, depth });

    const expanded = n.expanded ?? true;
    if (expanded && n.children?.length) {
      // compositor sits between this node and children
      const compX = x + NODE_W + 30;
      const compNodeId = `comp-${id}`;
      nodes.push({
        id: compNodeId,
        synthetic: true,
        compositor: n.compositor || (n.kind === "complexType" ? n.compositor || "sequence" : "sequence"),
        x: compX,
        y: midY - COMP_H / 2,
        depth,
      });

      // edge: node -> compositor
      links.push({
        from: { x: x + NODE_W, y: midY },
        to: { x: compX, y: midY },
      });

      let cursor = top;
      for (const cid of n.children) {
        const childSpan = measureChildren(cid);
        const childTop = cursor;
        const childRes = layout(cid, depth + 1, childTop);
        // edge: compositor -> child
        links.push({
          from: { x: compX + COMP_W, y: midY },
          to: { x: 24 + (depth + 1) * (NODE_W + COMP_W + HGAP), y: childRes.midY },
        });
        cursor += childSpan * (NODE_H + VGAP);
      }
    }
    return { height, midY };
  };

  const schemaNode = schema.nodes.find((n) => n.kind === "schema");
  if (!schemaNode) return { nodes, links, width: 800, height: 400 };

  // root
  const rootSpan = measureChildren(schemaNode.id);
  const rootHeight = rootSpan * (NODE_H + VGAP);
  layout(schemaNode.id, 0, 24);

  // bounds
  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + NODE_W), 0) + 120;
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + NODE_H), 0) + 80;

  return { nodes, links, width: Math.max(maxX, 900), height: Math.max(maxY, rootHeight + 80) };
}

// ---- compositor symbol ----------------------------------------------------

const Compositor = ({ x, y, kind = "sequence", modern }) => {
  const w = COMP_W;
  const h = COMP_H;
  // octagon-ish via polygon
  const cut = 8;
  const points = [
    [cut, 0],
    [w - cut, 0],
    [w, cut],
    [w, h - cut],
    [w - cut, h],
    [cut, h],
    [0, h - cut],
    [0, cut],
  ]
    .map((p) => p.join(","))
    .join(" ");

  const stroke = modern ? "#7aa6ff" : "#dcdcdc";
  const fill = modern ? "#1a2333" : "transparent";

  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points={points} fill={fill} stroke={stroke} strokeWidth="1.25" />
      {kind === "sequence" && (
        <g transform={`translate(${w / 2 - 12}, ${h / 2 - 1})`}>
          {[0, 8, 16].map((cx) => (
            <circle key={cx} cx={cx} cy={1} r="2" fill={stroke} />
          ))}
          <line x1="-2" y1="1" x2="20" y2="1" stroke={stroke} strokeWidth="1" />
        </g>
      )}
      {kind === "choice" && (
        <g
          transform={`translate(${w / 2}, ${h / 2})`}
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
        >
          <line x1="-10" y1="-7" x2="10" y2="-7" />
          <line x1="-10" y1="0" x2="10" y2="0" />
          <line x1="-10" y1="7" x2="10" y2="7" />
          <path d="M -8 -7 L 6 0 L -8 7" />
        </g>
      )}
      {kind === "all" && (
        <g
          transform={`translate(${w / 2 - 9}, ${h / 2 - 8})`}
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
        >
          <line x1="0" y1="0" x2="18" y2="0" />
          <line x1="0" y1="8" x2="18" y2="8" />
          <line x1="0" y1="16" x2="18" y2="16" />
          <text x="20" y="12" fontSize="10" fill={stroke} stroke="none">
            ∀
          </text>
        </g>
      )}
    </g>
  );
};

// ---- node rendering -------------------------------------------------------

const SchemaNodeShape = ({ node, selected, onClick, modern }) => {
  const w = NODE_W;
  const h = NODE_H;
  const optional = node.optional;
  const repeating = node.repeating;

  const isType = node.kind === "complexType" || node.kind === "simpleType";
  const isSchema = node.kind === "schema";

  // Color theming
  const palette = modern
    ? {
        element: { fill: "#1c2733", stroke: "#5b9dff", text: "#cfe2ff" },
        complexType: { fill: "#1f2a23", stroke: "#69c08a", text: "#cfead7" },
        simpleType: { fill: "#2a2620", stroke: "#d6a25e", text: "#f1dfc1" },
        schema: { fill: "#241f2e", stroke: "#b78ad9", text: "#e3d1f4" },
        attribute: { fill: "#1d2a2a", stroke: "#5fb3b3", text: "#cce8e8" },
      }
    : {
        element: { fill: "transparent", stroke: "#e7e7e7", text: "#f5f5f5" },
        complexType: { fill: "transparent", stroke: "#e7e7e7", text: "#f5f5f5" },
        simpleType: { fill: "transparent", stroke: "#e7e7e7", text: "#f5f5f5" },
        schema: { fill: "transparent", stroke: "#ffffff", text: "#ffffff" },
        attribute: { fill: "transparent", stroke: "#e7e7e7", text: "#f5f5f5" },
      };
  const c = palette[node.kind] || palette.element;

  const strokeDash = optional ? "4 3" : null;
  const labelFontWeight = isSchema ? "700" : modern ? "600" : "500";

  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer" }}
      data-testid={`schema-node-${node.id}`}
      className={selected ? "node-selected" : ""}
    >
      {/* Stack effect for repeating nodes */}
      {repeating && (
        <>
          <rect
            x="6"
            y="6"
            width={w}
            height={h}
            fill={c.fill}
            stroke={c.stroke}
            strokeWidth="1.25"
          />
          <rect
            x="3"
            y="3"
            width={w}
            height={h}
            fill={c.fill}
            stroke={c.stroke}
            strokeWidth="1.25"
          />
        </>
      )}

      {/* Type "tag" notch shape for complexType / simpleType */}
      {isType ? (
        <polygon
          points={`12,0 ${w},0 ${w},${h} 12,${h} 0,${h / 2}`}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth={selected ? "2" : "1.25"}
          strokeDasharray={strokeDash}
        />
      ) : (
        <rect
          x="0"
          y="0"
          width={w}
          height={h}
          fill={c.fill}
          stroke={selected ? "#3794ff" : c.stroke}
          strokeWidth={selected ? "2" : "1.25"}
          strokeDasharray={strokeDash}
          rx={modern ? 6 : 0}
        />
      )}

      {/* Selection glow ring */}
      {selected && (
        <rect
          x="-3"
          y="-3"
          width={w + 6}
          height={h + 6}
          fill="none"
          stroke="#3794ff"
          strokeOpacity="0.35"
          strokeWidth="2"
          rx={modern ? 9 : 2}
        />
      )}

      {/* Label */}
      <text
        x={isType ? (w + 12) / 2 : w / 2}
        y={h / 2 + 4}
        textAnchor="middle"
        fontFamily='"Segoe UI", Inter, sans-serif'
        fontSize="13"
        fontWeight={labelFontWeight}
        fill={c.text}
      >
        {node.name?.length > 18 ? node.name.slice(0, 16) + "…" : node.name}
      </text>

      {/* Modern: kind chip */}
      {modern && !isSchema && (
        <text
          x={isType ? 18 : 8}
          y="11"
          fontFamily='"JetBrains Mono", monospace'
          fontSize="8"
          fill={c.stroke}
          opacity="0.7"
        >
          {node.kind}
        </text>
      )}

      {/* Expand/collapse handle (right edge) */}
      {node.children?.length > 0 && (
        <g transform={`translate(${w - 4}, ${h / 2 - 6})`}>
          <rect width="12" height="12" fill={modern ? "#0e1116" : "#141416"} stroke={c.stroke} strokeWidth="1" />
          <text
            x="6"
            y="9"
            textAnchor="middle"
            fontSize="11"
            fontFamily='"Segoe UI", monospace'
            fill={c.stroke}
          >
            {(node.expanded ?? true) ? "−" : "+"}
          </text>
        </g>
      )}
    </g>
  );
};

// ---- main canvas ----------------------------------------------------------

export default function SchemaCanvas({ modern = false, zoom = 1, onZoomChange }) {
  const { schema, nodeById, selectedId, setSelectedId, toggleExpand, addChild } = useSchema();
  const [dragOver, setDragOver] = useState(null);

  const layout = useMemo(() => computeLayout(schema, nodeById, modern), [schema, nodeById, modern]);

  const onDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(id);
  };
  const onDrop = (e, id) => {
    e.preventDefault();
    setDragOver(null);
    const kind = e.dataTransfer.getData("application/x-xsd-component");
    if (kind) addChild(id, kind);
  };

  return (
    <div
      data-testid={modern ? "canvas-modern" : "canvas-classic"}
      className="thin-scroll relative h-full w-full overflow-auto"
      style={{
        background: modern
          ? "radial-gradient(ellipse at top left, #1a1f2b 0%, #0f1115 65%)"
          : "var(--vsc-bg)",
      }}
    >
      {/* dotted grid for modern */}
      {modern && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(120,150,200,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      )}
      <svg
        width={layout.width * zoom}
        height={layout.height * zoom}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        style={{ display: "block" }}
      >
        {/* Links */}
        {layout.links.map((l, i) => {
          const midX = (l.from.x + l.to.x) / 2;
          return (
            <path
              key={i}
              d={`M ${l.from.x} ${l.from.y} C ${midX} ${l.from.y}, ${midX} ${l.to.y}, ${l.to.x} ${l.to.y}`}
              className={modern ? "diagram-link-modern" : "diagram-link"}
            />
          );
        })}

        {/* Nodes */}
        {layout.nodes.map((n) => {
          if (n.synthetic) {
            return <Compositor key={n.id} x={n.x} y={n.y} kind={n.compositor} modern={modern} />;
          }
          const selected = n.id === selectedId;
          const dropping = dragOver === n.id;

          return (
            <NodeContextMenu key={n.id} node={n}>
              <g
                transform={`translate(${n.x},${n.y})`}
                onDragOver={(e) => onDragOver(e, n.id)}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => onDrop(e, n.id)}
              >
                {dropping && (
                  <rect
                    x="-4"
                    y="-4"
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    fill="none"
                    stroke="#3794ff"
                    strokeDasharray="6 4"
                    strokeWidth="1.5"
                    rx={modern ? 10 : 0}
                  />
                )}
                <SchemaNodeShape
                  node={n}
                  selected={selected}
                  modern={modern}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(n.id);
                  }}
                />
                {/* Cardinality label */}
                {n.cardinality && n.cardinality !== "1..1" && n.kind !== "schema" && (
                  <text
                    x={NODE_W + 6}
                    y={NODE_H - 2}
                    fontFamily='"JetBrains Mono", monospace'
                    fontSize="11"
                    fill={modern ? "#9bb3d3" : "#cfcfcf"}
                  >
                    {n.cardinality}
                  </text>
                )}
                {/* Expand toggle hit area */}
                {n.children?.length > 0 && (
                  <rect
                    x={NODE_W - 6}
                    y={NODE_H / 2 - 6}
                    width="14"
                    height="14"
                    fill="transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(n.id);
                    }}
                    style={{ cursor: "pointer" }}
                    data-testid={`toggle-${n.id}`}
                  />
                )}
              </g>
            </NodeContextMenu>
          );
        })}
      </svg>

      {/* Zoom badge */}
      <div className="pointer-events-none absolute right-3 top-3 rounded border border-[var(--vsc-border-strong)] bg-[var(--vsc-panel)]/90 px-2 py-0.5 font-mono text-[10px] text-[var(--vsc-text-dim)]">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
