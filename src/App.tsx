import { useState, type CSSProperties } from 'react';
import { useExecution } from './store/executionState';
import { colors, fontSize } from './ui_tokens';
import { KnowledgeGraph, useGraphHotkey } from './components/KnowledgeGraph';
import { TermText, Term } from './components/Term';
import { Unit } from './components/Unit';
import { LevelView } from './levels/LevelView';
import './App.css';

function App() {
  const cycle = useExecution((s) => s.cycle);
  const retired = useExecution((s) => s.retiredInstrs);
  const step = useExecution((s) => s.step);
  const stepCycle = useExecution((s) => s.stepCycle);
  const reset = useExecution((s) => s.reset);

  const [graphOpen, setGraphOpen] = useState(false);
  useGraphHotkey(() => setGraphOpen(true));

  return (
    <main style={{ background: colors.bg, color: colors.fg, minHeight: '100vh', padding: 32 }}>
      <button
        onClick={() => setGraphOpen(true)}
        title="Open knowledge graph (Cmd/Ctrl+K)"
        style={graphBtnStyle}
        aria-label="Open knowledge graph"
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>⊞</span>
        <span style={{ fontSize: 11 }}>graph</span>
        <kbd style={kbdStyle}>⌘K</kbd>
      </button>

      <header style={{ borderBottom: `1px solid ${colors.edge}`, paddingBottom: 16, marginBottom: 24, paddingRight: 160 }}>
        <h1 style={{ fontSize: 28, margin: 0, color: colors.fg }}>computer-viz</h1>
        <p style={{ color: colors.edge, fontSize: fontSize.label, margin: '4px 0 0' }}>
          Phase 0+ scaffold. Click-to-zoom levels, store, and routing wire up in Phase 5.
        </p>
      </header>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, color: colors.control, margin: '0 0 12px' }}>
          Levels (parchment view) — bottom of the stack
        </h2>
        <LevelView />
        <p style={{ color: colors.edge, fontSize: 12, marginTop: 10 }}>
          Click any of the four MOSFETs in the gate (level 1) to fly the camera into one transistor (level 0).
          Use ▶ play to auto-cycle the inputs through the NAND truth table, or ⏭ step one cycle at a time.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, color: colors.data, margin: '0 0 8px' }}>Execution state (stub)</h2>
        <pre style={{ color: colors.fg, background: '#1a1f26', padding: 12, borderRadius: 6, fontSize: fontSize.label }}>
{`cycle:           ${cycle}
retiredInstrs:   ${retired}`}
        </pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={step} style={btn(colors.active)}>step instr</button>
          <button onClick={stepCycle} style={btn(colors.data)}>step cycle</button>
          <button onClick={reset} style={btn(colors.passive)}>reset</button>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, color: colors.control, margin: '0 0 8px' }}>Term + Unit demo</h2>
        <p style={{ color: colors.fg, lineHeight: 1.7, maxWidth: 760 }}>
          <TermText>
            A program runs as a process inside its private virtual address space. Each instruction is fetched by the core, decoded, and executed by the ALU; results are written back to a register or pushed through the cache hierarchy (L1, L2, L3) toward RAM. A TLB miss triggers an MMU walk through the page table; a cache miss falls through to DRAM. When userspace asks the kernel for something, it issues a syscall.
          </TermText>{' '}
          A typical L1 hit takes <Unit value={1} unit="ns" />, a DRAM access <Unit value={100} unit="ns" />, an SSD read <Unit value={100} unit="µs" />, and a context switch <Unit value={1} unit="µs" />.
        </p>
        <p style={{ color: colors.edge, fontSize: 12, marginTop: 8 }}>
          Hover any underlined term or unit. Dictionary in <code>src/data/dictionary.ts</code>; explicit usage:{' '}
          <Term name="MESI">MESI</Term>, <Term name="branch predictor">branch predictor</Term>, <Term name="DMA">DMA</Term>.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 16, color: colors.storage, margin: '0 0 8px' }}>Repo status</h2>
        <ul style={{ color: colors.fg, lineHeight: 1.8 }}>
          <li>115 level/connector folders scaffolded under <code>levels/</code></li>
          <li>Root docs: INVARIANTS, EXECUTION_SCHEMA (draft), TIME_AXIS, GLOSSARY, COORDINATOR_LOG</li>
          <li>Three rendering tiers wired (1=photo, 2=react-three-fiber, 3=stylized SVG); symbolic = toggleable overlay</li>
          <li>Knowledge graph modal (top-right or ⌘K), dictionary + Term/Unit components</li>
          <li>Next: Phase 1 spec agents fan out, leaves first</li>
        </ul>
      </section>

      <KnowledgeGraph
        open={graphOpen}
        onClose={() => setGraphOpen(false)}
        onNavigate={(id) => {
          // Phase 5 will route here. For now: log and close.
          console.log('navigate to', id);
          setGraphOpen(false);
        }}
      />
    </main>
  );
}

function btn(color: string): CSSProperties {
  return {
    background: 'transparent',
    border: `1px solid ${color}`,
    color,
    padding: '8px 14px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
  };
}

const graphBtnStyle: CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: '#1a1f26',
  color: colors.fg,
  border: `1px solid ${colors.edge}`,
  padding: '6px 10px',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const kbdStyle: CSSProperties = {
  background: colors.bg,
  border: `1px solid ${colors.edge}`,
  borderRadius: 3,
  padding: '1px 5px',
  fontSize: 10,
  fontFamily: 'ui-monospace, monospace',
};

export default App;
