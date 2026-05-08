// LevelView — wraps the active level scene with a parchment frame and
// floating right-side zoom controls. State machine: 'transistor' | 'electrons'.
// Motion AnimatePresence crossfades + scales between levels so the user
// physically feels the zoom.
//
// Right-side toolbar:
//   ↑ zoom out   (disabled at top — transistor is the highest level for now)
//   ↓ zoom in    (disabled at bottom — electrons is the deepest)
// Below the buttons: a breadcrumb showing depth and current name.

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LevelTransistor } from './LevelTransistor';
import { LevelElectrons } from './LevelElectrons';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';

type LevelKey = 'transistor' | 'electrons';

const LEVEL_ORDER: readonly LevelKey[] = ['transistor', 'electrons'];

const LEVEL_META: Record<LevelKey, { title: string; subtitle: string; depth: number }> = {
  transistor: {
    title: 'Transistor',
    subtitle: 'a voltage-controlled switch ([T])',
    depth: 7,
  },
  electrons: {
    title: 'Electrons',
    subtitle: 'carrier drift through the channel',
    depth: 8,
  },
};

export function LevelView() {
  const [level, setLevel] = useState<LevelKey>('transistor');
  const stepCycle = useExecution((s) => s.stepCycle);
  const stepMicro = useExecution((s) => s.stepMicro);

  const idx = LEVEL_ORDER.indexOf(level);
  const canZoomOut = idx > 0;
  const canZoomIn = idx < LEVEL_ORDER.length - 1;

  const zoomIn = () => {
    if (canZoomIn) setLevel(LEVEL_ORDER[idx + 1]);
  };
  const zoomOut = () => {
    if (canZoomOut) setLevel(LEVEL_ORDER[idx - 1]);
  };

  const meta = LEVEL_META[level];

  return (
    <div style={frameStyle}>
      <div style={canvasFrame}>
        <AnimatePresence mode="wait">
          <motion.div
            key={level}
            initial={{ opacity: 0, scale: level === 'electrons' ? 0.9 : 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: level === 'electrons' ? 1.05 : 0.95 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', height: '100%' }}
            data-testid={`level-pane-${level}`}
          >
            {level === 'transistor' ? <LevelTransistor /> : <LevelElectrons />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right-side zoom toolbar */}
      <aside style={asideStyle} aria-label="Zoom controls">
        <div data-testid="level-breadcrumb" style={breadcrumbStyle}>
          <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            level {meta.depth}
          </div>
          <div style={{ color: parchment.ink, fontSize: 16, fontWeight: 600 }}>{meta.title}</div>
          <div style={{ color: parchment.inkSoft, fontSize: 11 }}>{meta.subtitle}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={zoomOut}
            disabled={!canZoomOut}
            aria-label="zoom out"
            data-testid="zoom-out"
            style={zoomBtn(!canZoomOut)}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>↑</span>
            <span style={{ fontSize: 11, marginTop: 2 }}>zoom out</span>
          </button>
          <button
            onClick={zoomIn}
            disabled={!canZoomIn}
            aria-label="zoom in"
            data-testid="zoom-in"
            style={zoomBtn(!canZoomIn)}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>↓</span>
            <span style={{ fontSize: 11, marginTop: 2 }}>zoom in</span>
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${parchment.rule}`, paddingTop: 10 }}>
          <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            clock
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={stepCycle} style={clockBtn} data-testid="step-cycle">
              tick
            </button>
            <button onClick={stepMicro} style={clockBtn} data-testid="step-micro">
              µ-tick
            </button>
          </div>
          <div style={{ color: parchment.inkSoft, fontSize: 10, marginTop: 8, lineHeight: 1.4 }}>
            tick: full cycle (gate flips)<br />
            µ-tick: sub-cycle ramp
          </div>
        </div>
      </aside>
    </div>
  );
}

const frameStyle: React.CSSProperties = {
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: '1fr 200px',
  gap: 16,
  padding: 14,
  background: parchment.bgDeep,
  border: `1px solid ${parchment.rule}`,
  borderRadius: 8,
  boxShadow: 'inset 0 0 0 6px rgba(255,255,255,0.4), inset 0 0 30px rgba(108,82,49,0.12)',
};

const canvasFrame: React.CSSProperties = {
  position: 'relative',
  height: 480,
  border: `1px solid ${parchment.rule}`,
  borderRadius: 6,
  overflow: 'hidden',
  background: parchment.bg,
  boxShadow: '0 2px 12px rgba(80,60,30,0.18)',
};

const asideStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: '12px 14px',
  background: parchment.bg,
  border: `1px solid ${parchment.rule}`,
  borderRadius: 6,
  height: 480,
};

const breadcrumbStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  paddingBottom: 10,
  borderBottom: `1px solid ${parchment.rule}`,
};

function zoomBtn(disabled: boolean): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 8px',
    background: disabled ? 'transparent' : parchment.bgDeep,
    border: `1px solid ${disabled ? parchment.rule : parchment.ink}`,
    borderRadius: 4,
    color: disabled ? parchment.rule : parchment.ink,
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit',
    opacity: disabled ? 0.4 : 1,
  };
}

const clockBtn: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px',
  background: parchment.bgDeep,
  border: `1px solid ${parchment.gateOn}`,
  borderRadius: 3,
  color: parchment.gateOn,
  cursor: 'pointer',
  fontSize: 11,
  fontFamily: 'inherit',
};
