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
const NODE_H = 36;
const COMP_W = 44;
const COMP_H = 28;
const HGAP = 80; // gap between columns
const VGAP = 16; // vertical gap between siblings

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
    const hasChildren = n.children?.length > 0;
    const hasCompositor = hasChildren || n.kind === "complexType";

    if (hasCompositor) {
      // compositor sits between this node and children
      const compX = x + NODE_W + 16;
      const compNodeId = `comp-${id}`;
      nodes.push({
        id: compNodeId,
        synthetic: true,
        compositor:
          n.compositor ||
          (n.kind === "complexType" ? n.compositor || "sequence" : "sequence"),
        x: compX,
        y: midY - COMP_H / 2,
        depth,
      });

      // edge: node -> compositor
      links.push({
        from: { x: x + NODE_W, y: midY },
        to: { x: compX, y: midY },
      });

      if (expanded && hasChildren) {
        let cursor = top;
        for (const cid of n.children) {
          const childSpan = measureChildren(cid);
          const childTop = cursor;
          const childRes = layout(cid, depth + 1, childTop);
          // edge: compositor -> child
          links.push({
            from: { x: compX + COMP_W, y: midY },
            to: {
              x: 24 + (depth + 1) * (NODE_W + COMP_W + HGAP),
              y: childRes.midY,
            },
          });
          cursor += childSpan * (NODE_H + VGAP);
        }
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
// Mirrors webview-src/diagram/ShapeRenderers.ts → renderGroupShape() and
// renderGroupTypeIndicator(). Octagon with bevel = round(h * 0.3). Single
// shadow offset by SHADOW_OFFSET (3) when maxOccurs > 1.

const SHADOW_OFFSET = 3;

const Compositor = ({ x, y, kind = "sequence", modern, repeating = false }) => {
  const w = COMP_W;
  const h = COMP_H;
  const bevel = Math.round(h * 0.3);

  // Octagon points (matches renderGroupShape)
  const octPoints = (ox, oy) =>
    [
      [ox + bevel, oy],
      [ox + w - bevel, oy],
      [ox + w, oy + bevel],
      [ox + w, oy + h - bevel],
      [ox + w - bevel, oy + h],
      [ox + bevel, oy + h],
      [ox, oy + h - bevel],
      [ox, oy + bevel],
    ]
      .map((p) => p.join(","))
      .join(" ");

  const stroke = modern ? "#7aa6ff" : "#dcdcdc";
  const fill = modern ? "#1a2333" : "transparent";
  const symbolStroke = modern ? "#cfe0ff" : "#dcdcdc";
  const cx = w / 2;
  const cy = h / 2;

  return (
    <g transform={`translate(${x},${y})`} className={`compositor compositor--${kind}`} data-compositor={kind}>
      {repeating && (
        <polygon
          points={octPoints(SHADOW_OFFSET, SHADOW_OFFSET)}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.25"
          className="compositor-shadow"
        />
      )}
      <polygon
        points={octPoints(0, 0)}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.25"
        className="compositor-shape"
      />

      {kind === "sequence" && (() => {
        // 3 dots in a row + horizontal line through them
        const dotSize = 2;
        const spacing = dotSize * 3;
        return (
          <g>
            <line
              x1={cx - spacing * 2}
              y1={cy}
              x2={cx + spacing * 2}
              y2={cy}
              stroke={symbolStroke}
              strokeWidth="1"
            />
            {[-1, 0, 1].map((i) => (
              <circle
                key={i}
                cx={cx + i * spacing}
                cy={cy}
                r={dotSize}
                fill={symbolStroke}
              />
            ))}
          </g>
        );
      })()}

      {kind === "choice" && (() => {
        // Choice indicator: left lines, right bracket, three vertical dots
        const yU = cy - 4;
        const yD = cy + 4;
        const xL2 = cx - 4;
        const xL1 = xL2 - 4;
        const xL0 = xL1 - 4;
        const xR0 = cx + 4;
        const xR1 = xR0 + 4;
        const xR2 = xR1 + 4;
        const lineProps = { stroke: symbolStroke, strokeWidth: "1" };
        return (
          <g>
            <line x1={xL0} y1={cy} x2={xL1} y2={cy} {...lineProps} />
            <line x1={xL1} y1={cy} x2={xL2} y2={yU} {...lineProps} />
            <line x1={xR0} y1={yU} x2={xR1} y2={yU} {...lineProps} />
            <line x1={xR0} y1={cy} x2={xR2} y2={cy} {...lineProps} />
            <line x1={xR0} y1={yD} x2={xR1} y2={yD} {...lineProps} />
            <line x1={xR1} y1={yU} x2={xR1} y2={yD} {...lineProps} />
            <circle cx={cx} cy={yU} r={2} fill={symbolStroke} />
            <circle cx={cx} cy={cy} r={2} fill={symbolStroke} />
            <circle cx={cx} cy={yD} r={2} fill={symbolStroke} />
          </g>
        );
      })()}

      {kind === "all" && (() => {
        // All indicator: horizontal lines on both sides + brackets + 3 dots
        const yU = cy - 4;
        const yD = cy + 4;
        const xL2 = cx - 4;
        const xL1 = xL2 - 4;
        const xL0 = xL1 - 4;
        const xR0 = cx + 4;
        const xR1 = xR0 + 4;
        const xR2 = xR1 + 4;
        const lineProps = { stroke: symbolStroke, strokeWidth: "1" };
        return (
          <g>
            <line x1={xL2} y1={yU} x2={xL1} y2={yU} {...lineProps} />
            <line x1={xL2} y1={cy} x2={xL0} y2={cy} {...lineProps} />
            <line x1={xL2} y1={yD} x2={xL1} y2={yD} {...lineProps} />
            <line x1={xL1} y1={yU} x2={xL1} y2={yD} {...lineProps} />
            <line x1={xR0} y1={yU} x2={xR1} y2={yU} {...lineProps} />
            <line x1={xR0} y1={cy} x2={xR2} y2={cy} {...lineProps} />
            <line x1={xR0} y1={yD} x2={xR1} y2={yD} {...lineProps} />
            <line x1={xR1} y1={yU} x2={xR1} y2={yD} {...lineProps} />
            <circle cx={cx} cy={yU} r={2} fill={symbolStroke} />
            <circle cx={cx} cy={cy} r={2} fill={symbolStroke} />
            <circle cx={cx} cy={yD} r={2} fill={symbolStroke} />
          </g>
        );
      })()}
    </g>
  );
};

// ---- node rendering -------------------------------------------------------
// Mirrors webview-src/diagram/ShapeRenderers.ts:
//   - renderElementShape: simple rectangle, single shadow offset by 3 if multi-occur
//   - renderTypeShape:    hex with two LEFT chamfers (bevel = round(h * 0.2));
//                         simpleType (isSimpleContent) fills the left bevel area
//                         with the stroke color
// And TextRenderers.ts:
//   - renderText: bold, centered, font-family Arial, name + optional ": type"
//   - renderOccurrence: at (x + w + 5, y + h - 5)

const SchemaNodeShape = ({ node, selected, onClick, modern, showType }) => {
  const w = NODE_W;
  const h = NODE_H;
  const optional = node.optional;
  const repeating = node.repeating;

  const isType = node.kind === "complexType" || node.kind === "simpleType";
  const isSimpleContent = node.kind === "simpleType";
  const isSchema = node.kind === "schema";

  // Color theming. Classic = repo defaults (white/transparent). Modern is an
  // optional theme behind xmlSchemaVisualEditor.diagramTheme.
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
  const strokeDash = optional ? "3 3" : null;

  // Type hex points (renderTypeShape): bevel on the LEFT side only.
  const bevel = Math.round(h * 0.2);
  const typePoints = (ox = 0, oy = 0) =>
    [
      [ox + bevel, oy],
      [ox + w, oy],
      [ox + w, oy + h],
      [ox + bevel, oy + h],
      [ox, oy + h - bevel],
      [ox, oy + bevel],
    ]
      .map((p) => p.join(","))
      .join(" ");

  const bevelFillPoints = [
    [0, bevel],
    [bevel, 0],
    [bevel, h],
    [0, h - bevel],
  ]
    .map((p) => p.join(","))
    .join(" ");

  const labelText = (() => {
    let t = node.name || "";
    if (showType && node.type && !isType) t += `: ${node.type}`;
    return t.length > 22 ? t.slice(0, 20) + "…" : t;
  })();

  return (
    <g
      onClick={onClick}
      style={{ cursor: "pointer" }}
      data-testid={`schema-node-${node.id}`}
      data-item-id={node.id}
      data-kind={node.kind}
      data-optional={optional ? "true" : "false"}
      data-repeating={repeating ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      className={`diagram-item diagram-item--${node.kind}${
        selected ? " diagram-item--selected node-selected" : ""
      }${optional ? " diagram-item--optional" : ""}${
        repeating ? " diagram-item--repeating" : ""
      }`}
    >
      {/* SHADOW (single offset, matches SHADOW_OFFSET = 3) for multi-occur */}
      {repeating && !isType && (
        <rect
          x={SHADOW_OFFSET}
          y={SHADOW_OFFSET}
          width={w}
          height={h}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth="1.25"
          className="diagram-shadow"
        />
      )}
      {repeating && isType && (
        <polygon
          points={typePoints(SHADOW_OFFSET, SHADOW_OFFSET)}
          fill={c.fill}
          stroke={c.stroke}
          strokeWidth="1.25"
          className="diagram-shadow"
        />
      )}

      {/* MAIN SHAPE */}
      {isType ? (
        <polygon
          points={typePoints(0, 0)}
          fill={c.fill}
          stroke={selected ? "#3794ff" : c.stroke}
          strokeWidth={selected ? "2" : "1.25"}
          strokeDasharray={strokeDash}
          className="diagram-shape"
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
          className="diagram-shape"
        />
      )}

      {/* For simpleType (isSimpleContent) fill the LEFT bevel area with stroke colour */}
      {isType && isSimpleContent && (
        <polygon
          points={bevelFillPoints}
          fill={c.stroke}
          stroke="none"
          className="diagram-bevel-fill"
        />
      )}

      {/* Selection halo */}
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
        />
      )}

      {/* LABEL — TextRenderers.renderText: bold, centered, Arial-ish */}
      <text
        x={isType ? (w + bevel) / 2 : w / 2}
        y={h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Arial, sans-serif"
        fontSize="11"
        fontWeight="bold"
        fill={c.text}
        className="diagram-label"
      >
        {labelText}
      </text>

      {/* Modern only: tiny kind chip above the box for quick scanning */}
      {modern && !isSchema && (
        <text
          x={isType ? bevel + 2 : 4}
          y="8"
          fontFamily="Arial, sans-serif"
          fontSize="7"
          fill={c.stroke}
          opacity="0.8"
          className="diagram-kind-chip"
        >
          {node.kind}
        </text>
      )}

      {/* Expand/collapse box (just outside right edge) */}
      {node.children?.length > 0 && (
        <g transform={`translate(${w + 2}, ${h / 2 - 5})`} className="diagram-toggle">
          <rect
            width="10"
            height="10"
            fill={modern ? "#0e1116" : "#141416"}
            stroke={c.stroke}
            strokeWidth="1"
          />
          <text
            x="5"
            y="5"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fontFamily="Arial, sans-serif"
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
                data-item-id={n.id}
                data-drop-target="true"
                className="diagram-item-slot"
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
