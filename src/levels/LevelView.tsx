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
import { motion } from 'motion/react';
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

  // Both panes stay mounted (so WebGL contexts and OrbitControls state survive
  // the transition) and we cross-fade with scale + blur. Transistor is the
  // "outside" view (scale 1.15 when inactive — we left it behind), Electrons
  // is the "inside" view (scale 0.85 when inactive — we haven't reached it).
  // This makes the zoom feel symmetric in both directions without needing
  // direction tracking.
  const transistorAnim = {
    opacity: level === 'transistor' ? 1 : 0,
    scale: level === 'transistor' ? 1 : 1.15,
    filter: level === 'transistor' ? 'blur(0px)' : 'blur(6px)',
  };
  const electronsAnim = {
    opacity: level === 'electrons' ? 1 : 0,
    scale: level === 'electrons' ? 1 : 0.85,
    filter: level === 'electrons' ? 'blur(0px)' : 'blur(6px)',
  };
  const transition = { duration: 1.0, ease: [0.65, 0, 0.35, 1] as const };

  return (
    <div style={frameStyle}>
      <div style={canvasFrame}>
        <motion.div
          initial={false}
          animate={transistorAnim}
          transition={transition}
          style={{
            ...paneStyle,
            pointerEvents: level === 'transistor' ? 'auto' : 'none',
          }}
          aria-hidden={level !== 'transistor'}
          data-testid="level-pane-transistor"
        >
          <LevelTransistor />
        </motion.div>
        <motion.div
          initial={false}
          animate={electronsAnim}
          transition={transition}
          style={{
            ...paneStyle,
            pointerEvents: level === 'electrons' ? 'auto' : 'none',
          }}
          aria-hidden={level !== 'electrons'}
          data-testid="level-pane-electrons"
        >
          <LevelElectrons />
        </motion.div>
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

const paneStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
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
