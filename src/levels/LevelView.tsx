// LevelView — both panes always mounted; cross-fade driven by `level`.
//
// Levels:
//   gate (depth 6)        — a logic gate built from 4 transistors (the row).
//   transistor (depth 7)  — a single MOSFET (the voltage-controlled switch).
//
// Interaction:
//   - On the Gate level, click any of the 4 transistor meshes (or its
//     data-testid="zoom-target-{i}" overlay button). LevelGate's CameraRig
//     flies the camera toward it; when close, onArrived fires and LevelView
//     switches level → 'transistor'; cross-fade transitions panes.
//   - Going back: Esc or "← back" button → setLevel('gate'), clears zoom
//     target + part highlight.

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LevelGate } from './LevelGate';
import { LevelTransistor } from './LevelTransistor';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import {
  gateSpotlight,
  partSpotlights,
  transistorDefaultSpotlight,
  type ElectronsPart,
} from './descriptions';

type LevelKey = 'gate' | 'transistor';

const LEVEL_META: Record<LevelKey, { title: string; subtitle: string; depth: number }> = {
  gate: {
    title: 'Gate',
    subtitle: 'a logic gate (4× [T])',
    depth: 6,
  },
  transistor: {
    title: 'Transistor',
    subtitle: 'a voltage-controlled switch ([T])',
    depth: 7,
  },
};

export function LevelView() {
  const [level, setLevel] = useState<LevelKey>('gate');
  const [zoomTarget, setZoomTarget] = useState<number | null>(null);
  const [transistorHighlight, setTransistorHighlight] = useState<ElectronsPart>(null);
  const stepCycle = useExecution((s) => s.stepCycle);
  const stepMicro = useExecution((s) => s.stepMicro);

  const handleZoomTo = useCallback((idx: number) => {
    setZoomTarget(idx);
  }, []);
  const handleArrived = useCallback(() => {
    setLevel('transistor');
  }, []);
  const handleBack = useCallback(() => {
    setLevel('gate');
    setZoomTarget(null);
    setTransistorHighlight(null);
  }, []);

  // Spotlight: level + (when on Transistor) part highlight.
  const spotlight =
    level === 'gate'
      ? gateSpotlight
      : transistorHighlight
        ? partSpotlights[transistorHighlight]
        : transistorDefaultSpotlight;
  const spotlightKey =
    level === 'gate' ? 'gate' : transistorHighlight ?? 'transistor-default';

  // Esc returns to gate (only meaningful when zoomed into a transistor).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && level === 'transistor') {
        handleBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [level, handleBack]);

  const meta = LEVEL_META[level];

  // Cross-fade: gate (outside) scales up when inactive ("we left it behind"),
  // transistor (inside) scales down when inactive ("we haven't reached it").
  const gateAnim = {
    opacity: level === 'gate' ? 1 : 0,
    scale: level === 'gate' ? 1 : 1.15,
    filter: level === 'gate' ? 'blur(0px)' : 'blur(6px)',
  };
  const transistorAnim = {
    opacity: level === 'transistor' ? 1 : 0,
    scale: level === 'transistor' ? 1 : 0.85,
    filter: level === 'transistor' ? 'blur(0px)' : 'blur(6px)',
  };
  const transition = { duration: 0.7, ease: [0.65, 0, 0.35, 1] as const };

  return (
    <div style={frameStyle}>
      <div style={canvasFrame}>
        <motion.div
          initial={false}
          animate={gateAnim}
          transition={transition}
          style={{ ...paneStyle, pointerEvents: level === 'gate' ? 'auto' : 'none' }}
          aria-hidden={level !== 'gate'}
          data-testid="level-pane-gate"
        >
          <LevelGate zoomTarget={zoomTarget} onZoomTo={handleZoomTo} onArrived={handleArrived} />
        </motion.div>
        <motion.div
          initial={false}
          animate={transistorAnim}
          transition={transition}
          style={{ ...paneStyle, pointerEvents: level === 'transistor' ? 'auto' : 'none' }}
          aria-hidden={level !== 'transistor'}
          data-testid="level-pane-transistor"
        >
          <LevelTransistor highlight={transistorHighlight} onHighlight={setTransistorHighlight} />
        </motion.div>
      </div>

      <aside style={asideStyle} aria-label="Level controls">
        <div data-testid="level-breadcrumb" style={breadcrumbStyle}>
          <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            level {meta.depth}
          </div>
          <div style={{ color: parchment.ink, fontSize: 16, fontWeight: 600 }}>{meta.title}</div>
          <div style={{ color: parchment.inkSoft, fontSize: 11 }}>{meta.subtitle}</div>
        </div>

        <button
          onClick={handleBack}
          disabled={level === 'gate'}
          aria-label="back / zoom out"
          data-testid="back"
          style={backBtn(level === 'gate')}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>←</span>
          <span style={{ fontSize: 11, marginTop: 2 }}>back</span>
          <kbd style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>Esc</kbd>
        </button>

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

        <div
          style={{ borderTop: `1px solid ${parchment.rule}`, paddingTop: 10 }}
          data-testid="spotlight"
        >
          <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            spotlight
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={spotlightKey}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <div
                style={{ color: parchment.ink, fontSize: 13, fontWeight: 600 }}
                data-testid="spotlight-title"
              >
                {spotlight.title}
              </div>
              <div
                style={{ color: parchment.gateOn, fontSize: 11, marginTop: 2, fontStyle: 'italic' }}
                data-testid="spotlight-subtitle"
              >
                {spotlight.subtitle}
              </div>
              <div
                style={{ color: parchment.inkSoft, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}
                data-testid="spotlight-body"
              >
                {spotlight.body}
              </div>
            </motion.div>
          </AnimatePresence>
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
  overflow: 'auto',
};

const breadcrumbStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  paddingBottom: 10,
  borderBottom: `1px solid ${parchment.rule}`,
};

function backBtn(disabled: boolean): React.CSSProperties {
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
    gap: 2,
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
