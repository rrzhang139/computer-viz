// LevelView — both panes always mounted; cross-fade driven by `level`.
//
// Interaction model:
//   - User clicks a MOSFET in LevelTransistor (or its data-testid="zoom-target-{i}"
//     overlay button).
//   - LevelTransistor's CameraRig animates camera toward that MOSFET.
//   - When camera is close (~0.6 units), CameraRig fires onArrived(idx).
//   - LevelView switches level → 'electrons'; cross-fade transitions panes.
//
// Going back:
//   - Press Escape, OR click the "← back" button in the right toolbar.
//   - LevelView sets level → 'transistor', clears zoomTarget.
//   - Cross-fade reverses; transistor's CameraRig animates camera back home.

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LevelTransistor } from './LevelTransistor';
import { LevelElectrons } from './LevelElectrons';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';

type LevelKey = 'transistor' | 'electrons';

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
  const [zoomTarget, setZoomTarget] = useState<number | null>(null);
  const stepCycle = useExecution((s) => s.stepCycle);
  const stepMicro = useExecution((s) => s.stepMicro);

  const handleZoomTo = useCallback((idx: number) => {
    setZoomTarget(idx);
  }, []);
  const handleArrived = useCallback(() => {
    setLevel('electrons');
  }, []);
  const handleBack = useCallback(() => {
    setLevel('transistor');
    setZoomTarget(null);
  }, []);

  // Esc returns to transistor row.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && level === 'electrons') {
        handleBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [level, handleBack]);

  const meta = LEVEL_META[level];

  // Both panes mounted; only one is "active" (opaque, fully scaled). The other
  // is faded + scaled away. Transistor scales UP when inactive (we left it
  // behind), Electrons scales DOWN when inactive (we haven't reached it).
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
  const transition = { duration: 0.7, ease: [0.65, 0, 0.35, 1] as const };

  return (
    <div style={frameStyle}>
      <div style={canvasFrame}>
        <motion.div
          initial={false}
          animate={transistorAnim}
          transition={transition}
          style={{ ...paneStyle, pointerEvents: level === 'transistor' ? 'auto' : 'none' }}
          aria-hidden={level !== 'transistor'}
          data-testid="level-pane-transistor"
        >
          <LevelTransistor
            zoomTarget={zoomTarget}
            onZoomTo={handleZoomTo}
            onArrived={handleArrived}
          />
        </motion.div>
        <motion.div
          initial={false}
          animate={electronsAnim}
          transition={transition}
          style={{ ...paneStyle, pointerEvents: level === 'electrons' ? 'auto' : 'none' }}
          aria-hidden={level !== 'electrons'}
          data-testid="level-pane-electrons"
        >
          <LevelElectrons />
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
          disabled={level === 'transistor'}
          aria-label="back / zoom out"
          data-testid="back"
          style={backBtn(level === 'transistor')}
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

        <div style={{ borderTop: `1px solid ${parchment.rule}`, paddingTop: 10, color: parchment.inkSoft, fontSize: 11, lineHeight: 1.45 }}>
          <strong style={{ color: parchment.ink }}>How to navigate</strong>
          <div style={{ marginTop: 4 }}>
            Hover any [T] in the row → it lights up. Click → camera flies in,
            then the carrier-physics view fades on top.
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
