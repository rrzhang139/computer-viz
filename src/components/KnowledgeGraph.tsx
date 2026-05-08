// KnowledgeGraph — modal showing the full level tree.
// Two views:
//   - Tree (default): clickable hierarchical list of all 115 levels, with search.
//   - Graph: react-flow canvas with parent→child edges. Cross-cutting edges
//            (defined-in / referenced-by) populate as Phase 1 specs land.
//
// Open: click the graph button (upper-right) or press Cmd+K (Mac) / Ctrl+K.
// Close: X button, Esc, click backdrop.

import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { levels, childrenOf, type LevelNode } from '../data/levels';
import { colors } from '../ui_tokens';

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

type View = 'tree' | 'graph';

export function KnowledgeGraph({ open, onClose, onNavigate }: Props) {
  const [view, setView] = useState<View>('tree');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Knowledge graph"
      style={backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modalStyle}>
        <header style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Knowledge graph</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setView('tree')}
              style={tabBtn(view === 'tree')}
            >
              tree
            </button>
            <button
              onClick={() => setView('graph')}
              style={tabBtn(view === 'graph')}
            >
              graph
            </button>
            <input
              autoFocus
              placeholder="search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={searchStyle}
            />
            <button onClick={onClose} aria-label="close" style={closeBtn}>×</button>
          </div>
        </header>
        <div style={contentStyle}>
          {view === 'tree' ? (
            <TreeView query={query} onNavigate={onNavigate} />
          ) : (
            <GraphView onNavigate={onNavigate} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tree view ─────────────────────────────────────────────────────────

function TreeView({ query, onNavigate }: { query: string; onNavigate: (id: string) => void }) {
  const lower = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!lower) return null;
    const ids = new Set<string>();
    for (const l of levels) {
      if (l.name.toLowerCase().includes(lower) || l.id.toLowerCase().includes(lower)) {
        let cur: LevelNode | undefined = l;
        while (cur) {
          ids.add(cur.id);
          cur = cur.parent ? levels.find((x) => x.id === cur!.parent) : undefined;
        }
      }
    }
    return ids;
  }, [lower]);

  return (
    <ul style={treeRootStyle}>
      {childrenOf(null).map((root) => (
        <TreeNode key={root.id} node={root} matches={matches} onNavigate={onNavigate} />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  matches,
  onNavigate,
}: {
  node: LevelNode;
  matches: Set<string> | null;
  onNavigate: (id: string) => void;
}) {
  const children = childrenOf(node.id);
  const visible = !matches || matches.has(node.id);
  if (!visible) return null;
  const isConnector = node.isConnector;

  return (
    <li style={{ marginLeft: node.depth * 12 }}>
      <button
        onClick={() => onNavigate(node.id)}
        style={{
          ...nodeBtn,
          color: isConnector ? colors.control : colors.fg,
          fontStyle: isConnector ? 'italic' : 'normal',
        }}
        title={node.id}
      >
        {isConnector ? '─' : '•'} {node.name}
      </button>
      {children.length > 0 && (
        <ul style={treeRootStyle}>
          {children.map((c) => (
            <TreeNode key={c.id} node={c} matches={matches} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Graph view ────────────────────────────────────────────────────────

function GraphView({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { nodes, edges } = useMemo(() => buildGraph(), []);
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        onNodeClick={(_, node) => onNavigate(node.id)}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2a3340" />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div style={graphHintStyle}>
        Tree edges only for now. Cross-cutting refs (e.g. MMU↔core, syscall↔kernel) populate as Phase 1 spec.md / interface.md files fill in.
      </div>
    </div>
  );
}

function buildGraph(): { nodes: Node[]; edges: Edge[] } {
  // Simple layered layout: depth = column, sibling-index = row.
  const byDepth = new Map<number, LevelNode[]>();
  for (const l of levels) {
    const arr = byDepth.get(l.depth) ?? [];
    arr.push(l);
    byDepth.set(l.depth, arr);
  }

  const COL_W = 220;
  const ROW_H = 36;

  const nodes: Node[] = levels.map((l) => {
    const col = byDepth.get(l.depth) ?? [];
    const row = col.indexOf(l);
    return {
      id: l.id,
      data: { label: l.name },
      position: { x: l.depth * COL_W, y: row * ROW_H - (col.length * ROW_H) / 2 },
      style: {
        background: l.isConnector ? '#2a1a1a' : '#1a2330',
        border: `1px solid ${l.isConnector ? colors.control : colors.edge}`,
        color: colors.fg,
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 3,
        width: 180,
      },
    };
  });

  const edges: Edge[] = [];
  for (const l of levels) {
    if (l.parent) {
      edges.push({
        id: `${l.parent}->${l.id}`,
        source: l.parent,
        target: l.id,
        style: { stroke: colors.edge, strokeWidth: 1 },
      });
    }
  }

  return { nodes, edges };
}

// ── Styles ────────────────────────────────────────────────────────────

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  width: 'min(1100px, 92vw)',
  height: 'min(720px, 86vh)',
  background: colors.bg,
  border: `1px solid ${colors.edge}`,
  borderRadius: 8,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 14px',
  borderBottom: `1px solid ${colors.edge}`,
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 12,
};

const treeRootStyle: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

const nodeBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  padding: '3px 6px',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  background: active ? colors.data : 'transparent',
  color: active ? colors.bg : colors.fg,
  border: `1px solid ${colors.data}`,
  padding: '4px 10px',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 12,
});

const searchStyle: React.CSSProperties = {
  background: '#1a1f26',
  border: `1px solid ${colors.edge}`,
  color: colors.fg,
  padding: '5px 8px',
  borderRadius: 3,
  fontSize: 12,
  width: 180,
  outline: 'none',
};

const closeBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: colors.fg,
  fontSize: 22,
  cursor: 'pointer',
  width: 28,
  height: 28,
  lineHeight: 1,
  padding: 0,
};

const graphHintStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: 24,
  background: 'rgba(26,31,38,0.85)',
  border: `1px solid ${colors.edge}`,
  borderRadius: 4,
  padding: '6px 10px',
  fontSize: 11,
  color: colors.edge,
  maxWidth: 360,
  pointerEvents: 'none',
};

// ── Hook for global Cmd+K / Ctrl+K ─────────────────────────────────────

export function useGraphHotkey(onOpen: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpen]);
}
