import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { sampleSchema } from "@/lib/sampleSchema";

const SchemaContext = createContext(null);

export const SchemaProvider = ({ children }) => {
  const [schema, setSchema] = useState(sampleSchema);
  const [selectedId, setSelectedId] = useState("st-lengthRestriction");
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const nodeById = useMemo(() => {
    const m = {};
    schema.nodes.forEach((n) => (m[n.id] = n));
    return m;
  }, [schema]);

  const selectedNode = nodeById[selectedId] || null;

  const commit = useCallback(
    (next) => {
      setHistory((h) => [...h, schema].slice(-50));
      setFuture([]);
      setSchema(next);
    },
    [schema]
  );

  const updateNode = useCallback(
    (id, patch) => {
      const next = {
        ...schema,
        nodes: schema.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      };
      commit(next);
    },
    [schema, commit]
  );

  const toggleExpand = useCallback(
    (id) => {
      setSchema((s) => ({
        ...s,
        nodes: s.nodes.map((n) =>
          n.id === id ? { ...n, expanded: !(n.expanded ?? true) } : n
        ),
      }));
    },
    []
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [schema, ...f]);
      setSchema(prev);
      return h.slice(0, -1);
    });
  }, [schema]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, schema]);
      setSchema(next);
      return f.slice(1);
    });
  }, [schema]);

  const addChild = useCallback(
    (parentId, kind, name) => {
      const id = `${kind}-${Math.random().toString(36).slice(2, 7)}`;
      const newNode = {
        id,
        kind,
        name: name || `new${kind[0].toUpperCase()}${kind.slice(1)}`,
        type: kind === "element" ? "xs:string" : undefined,
        cardinality: "1..1",
        children: [],
        doc: "",
      };
      const next = {
        ...schema,
        nodes: [
          ...schema.nodes.map((n) =>
            n.id === parentId ? { ...n, children: [...(n.children || []), id], expanded: true } : n
          ),
          newNode,
        ],
      };
      commit(next);
      setSelectedId(id);
    },
    [schema, commit]
  );

  const deleteNode = useCallback(
    (id) => {
      const next = {
        ...schema,
        nodes: schema.nodes
          .filter((n) => n.id !== id)
          .map((n) => ({ ...n, children: (n.children || []).filter((c) => c !== id) })),
      };
      commit(next);
      setSelectedId(null);
    },
    [schema, commit]
  );

  const value = {
    schema,
    nodeById,
    selectedId,
    setSelectedId,
    selectedNode,
    updateNode,
    toggleExpand,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    addChild,
    deleteNode,
  };

  return <SchemaContext.Provider value={value}>{children}</SchemaContext.Provider>;
};

export const useSchema = () => {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error("useSchema must be used within SchemaProvider");
  return ctx;
};
