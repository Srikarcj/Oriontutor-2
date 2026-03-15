import { useMemo, useState, useCallback, useEffect } from "react";
import type { MindMapData, MindMapNode, Notes } from "../lib/types";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import { toPng, toSvg } from "html-to-image";
import "reactflow/dist/style.css";

type RawMindMap =
  | MindMapData
  | { root: string; branches: Array<{ title: string; children?: Array<{ title: string }> }> };

type NodeMeta = {
  title: string;
  level: number;
  explanation?: string;
  timestamps?: string[];
  childrenCount: number;
};

const LEVEL_COLORS = ["#2563eb", "#6366f1", "#0ea5e9", "#64748b"];

function normalizeMindMap(notes?: Notes | null, summary?: string, mindmap?: RawMindMap | null): MindMapData {
  if (mindmap && (mindmap as MindMapData).main_topic) {
    return mindmap as MindMapData;
  }
  if (mindmap && (mindmap as any).root) {
    const legacy = mindmap as any;
    return {
      main_topic: legacy.root || notes?.title || "Mind Map",
      concepts: (legacy.branches || []).map((branch: any) => ({
        name: branch.title,
        explanation: "",
        timestamps: [],
        children: (branch.children || []).map((child: any) => ({
          name: child.title,
          explanation: "",
          timestamps: [],
          children: [],
        })),
      })),
    };
  }

  const main = (notes?.main_concepts || []).slice(0, 6);
  const takeaways = (notes?.key_takeaways || []).slice(0, 6);
  const branches = [...main, ...takeaways].filter(Boolean).slice(0, 8);
  return {
    main_topic: notes?.title || "Mind Map",
    concepts: branches.map((title) => ({
      name: title,
      explanation: summary || "",
      timestamps: [],
      children: [],
    })),
  };
}

function buildLayout(tree: MindMapData, collapsed: Set<string>) {
  const nodes: Node<NodeMeta>[] = [];
  const edges: Edge[] = [];
  const positions: Record<string, { x: number; y: number }> = {};

  const levelSpacing = 140;
  const siblingSpacing = 220;
  let maxX = 0;

  const walk = (node: MindMapNode, depth: number, parentId: string) => {
    const nodeId = `${parentId}-${node.name}-${depth}`;
    const children = node.children || [];
    const isCollapsed = collapsed.has(nodeId);
    const visibleChildren = isCollapsed ? [] : children;

    if (visibleChildren.length === 0) {
      maxX += siblingSpacing;
      positions[nodeId] = { x: maxX, y: depth * levelSpacing };
    } else {
      const firstX = maxX + siblingSpacing;
      visibleChildren.forEach((child) => walk(child, depth + 1, nodeId));
      const lastX = maxX;
      positions[nodeId] = { x: (firstX + lastX) / 2, y: depth * levelSpacing };
    }

    nodes.push({
      id: nodeId,
      position: positions[nodeId],
      data: {
        title: node.name,
        level: depth,
        explanation: node.explanation,
        timestamps: node.timestamps,
        childrenCount: children.length,
      },
      type: "mindmapNode",
    });

    edges.push({ id: `e-${parentId}-${nodeId}`, source: parentId, target: nodeId });
  };

  const rootId = "root";
  nodes.push({
    id: rootId,
    position: { x: 0, y: 0 },
    data: {
      title: tree.main_topic,
      level: 0,
      explanation: "",
      timestamps: [],
      childrenCount: tree.concepts.length,
    },
    type: "mindmapNode",
  });

  maxX = -siblingSpacing;
  tree.concepts.forEach((concept) => walk(concept, 1, rootId));

  // Normalize positions to keep root centered
  const xs = nodes.map((n) => n.position.x);
  const minX = Math.min(...xs);
  const maxXPos = Math.max(...xs);
  const offsetX = (minX + maxXPos) / 2;
  nodes.forEach((n) => {
    n.position = { x: n.position.x - offsetX, y: n.position.y };
  });

  return { nodes, edges };
}

function MindMapNodeView({ data }: { data: NodeMeta }) {
  const color = LEVEL_COLORS[Math.min(data.level, LEVEL_COLORS.length - 1)];
  return (
    <div className="mindmap-node" style={{ borderColor: color }}>
      <div className="mindmap-node-title">{data.title}</div>
      {data.childrenCount > 0 ? (
        <div className="mindmap-node-meta">{data.childrenCount} subtopics</div>
      ) : null}
    </div>
  );
}

export function MindMap({
  notes,
  summary,
  mindmap,
}: {
  notes?: Notes | null;
  summary?: string;
  mindmap?: RawMindMap | null;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<NodeMeta | null>(null);
  const [search, setSearch] = useState("");
  const tree = useMemo(() => normalizeMindMap(notes, summary, mindmap), [notes, summary, mindmap]);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildLayout(tree, collapsed), [tree, collapsed]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flowInstance, setFlowInstance] = useState<any>(null);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setEdges, setNodes]);

  const onNodeClick = useCallback((_: any, node: Node<NodeMeta>) => {
    if (node.id === "root") {
      setSelected(node.data);
      return;
    }
    setSelected(node.data);
    const next = new Set(collapsed);
    if (next.has(node.id)) {
      next.delete(node.id);
    } else if (node.data.childrenCount > 0) {
      next.add(node.id);
    }
    setCollapsed(next);
  }, [collapsed]);

  const collapseAll = () => {
    const next = new Set<string>();
    initialNodes.forEach((n) => {
      if (n.id !== "root") next.add(n.id);
    });
    setCollapsed(next);
  };

  const expandAll = () => {
    setCollapsed(new Set());
  };

  const focusSearch = () => {
    if (!search.trim()) return;
    const term = search.toLowerCase();
    const match = nodes.find((n) => n.data.title.toLowerCase().includes(term));
    if (!match) return;
    if (flowInstance?.setCenter) {
      flowInstance.setCenter(match.position.x, match.position.y, { zoom: 1.2, duration: 400 });
    }
    setSelected(match.data);
  };

  const exportPng = async () => {
    const wrapper = document.querySelector(".mindmap-canvas") as HTMLElement | null;
    if (!wrapper) return;
    const dataUrl = await toPng(wrapper);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "mindmap.png";
    link.click();
  };

  const exportSvg = async () => {
    const wrapper = document.querySelector(".mindmap-canvas") as HTMLElement | null;
    if (!wrapper) return;
    const dataUrl = await toSvg(wrapper);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "mindmap.svg";
    link.click();
  };

  const exportJson = async () => {
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mindmap.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mindmap">
      <div className="mindmap-toolbar">
        <div className="mindmap-search">
          <input
            type="text"
            placeholder="Search a concept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={focusSearch}>Find</button>
        </div>
        <div className="mindmap-actions">
          <button onClick={collapseAll}>Collapse All</button>
          <button onClick={expandAll}>Expand All</button>
          <button onClick={() => flowInstance?.fitView?.({ padding: 0.2, duration: 400 })}>Reset View</button>
          <button onClick={exportPng}>Export PNG</button>
          <button onClick={exportSvg}>Export SVG</button>
          <button onClick={exportJson}>Export JSON</button>
        </div>
      </div>
      <div className="mindmap-grid">
        <div className="mindmap-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={{ mindmapNode: MindMapNodeView }}
            fitView
            onInit={setFlowInstance}
          >
            <MiniMap />
            <Controls />
            <Background gap={18} color="#e2e8f0" />
          </ReactFlow>
        </div>
        <aside className="mindmap-detail">
          <h4>{selected?.title || "Concept Insight"}</h4>
          {selected ? (
            <>
              <p>{selected.explanation || "Select a node to see concept details."}</p>
              {selected.timestamps && selected.timestamps.length ? (
                <div className="mindmap-timestamps">
                  {selected.timestamps.map((ts) => (
                    <span key={ts}>{ts}</span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>Select a node to see concept details and timestamps.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
