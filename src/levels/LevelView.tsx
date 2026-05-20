// LevelView — all panes always mounted; cross-fade driven by `level`.
//
// Tree (top → bottom of the abstraction stack):
//   dff (depth 3)         — a D flip-flop built from 2 latches (clocked storage).
//   latch (depth 2)       — an SR latch from 2 cross-coupled NANDs (1 stored bit).
//   gate (depth 1)        — one NAND gate built from 4 transistors.
//   transistor (depth 0)  — a single MOSFET (voltage-controlled switch).
//
// Default landing is `gate` to keep existing tests + the user's current
// muscle memory steady; you reach the higher levels via the back button.
//
// Interaction:
//   - On Gate, click any of the 4 transistor meshes to fly into one transistor.
//   - On Latch, click NAND1 or NAND2 to drill into the gate level.
//   - On DFF,   click MASTER or SLAVE latch box to drill into the latch level.
//   - Back / Esc walks UP one level. From DFF, back is disabled (top of tree).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LevelDff } from './LevelDff';
import { LevelDLatch } from './LevelDLatch';
import { LevelGate } from './LevelGate';
import { LevelLatch } from './LevelLatch';
import { LevelSummary } from './LevelSummary';
import { LevelTransistor } from './LevelTransistor';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import {
  compareLevelSummary,
  dffLevelSummary,
  dffPhaseFor,
  dffSpotlight,
  dlatchLevelSummary,
  dlatchSpotlight,
  masterDLatchSpotlight,
  slaveDLatchSpotlight,
  gateLevelSummary,
  gatePhaseFor,
  gateSpotlight,
  latchLevelSummary,
  latchPhaseFor,
  latchSpotlight,
  masterLatchSpotlight,
  nand1Spotlight,
  nand2Spotlight,
  nmosLevelSummary,
  nmosSpotlight,
  partSpotlights,
  pmosLevelSummary,
  pmosSpotlight,
  slaveLatchSpotlight,
  transistorDefaultSpotlight,
  type ElectronsPart,
  type LevelSummary as LevelSummaryData,
  type PhaseSpotlight,
  type Spotlight,
} from './descriptions';
import { TRANSISTOR_TYPE } from './symbols';

type TransistorVariant = typeof TRANSISTOR_TYPE.NMOS | typeof TRANSISTOR_TYPE.PMOS | null;
type LatchEntry = 'master' | 'slave' | null;

type LevelKey = 'dff' | 'dlatch' | 'latch' | 'gate' | 'transistor';

// Depth = abstraction rung. 0 = lowest (transistor); higher = more composite.
const LEVEL_META: Record<LevelKey, { title: string; subtitle: string; depth: number }> = {
  transistor: {
    title: 'Transistor',
    subtitle: 'a voltage-controlled switch ([T])',
    depth: 0,
  },
  gate: {
    title: 'Gate',
    subtitle: 'a logic gate (4× [T])',
    depth: 1,
  },
  latch: {
    title: 'Latch',
    subtitle: 'an SR latch (2× NAND, cross-coupled)',
    depth: 2,
  },
  dlatch: {
    title: 'D Latch',
    subtitle: '1 SR latch + 2 gating NANDs + inverter (gated by EN)',
    depth: 3,
  },
  dff: {
    title: 'D Flip-Flop',
    subtitle: 'master + slave D latches, edge-triggered by CLK',
    depth: 4,
  },
};

function transistorTitleFor(variant: TransistorVariant): string {
  if (variant === TRANSISTOR_TYPE.PMOS) return 'Transistor · PMOS branch';
  if (variant === TRANSISTOR_TYPE.NMOS) return 'Transistor · NMOS branch';
  return 'Transistor';
}

export function LevelView() {
  const [level, setLevel] = useState<LevelKey>('gate');
  const [zoomTarget, setZoomTarget] = useState<number | null>(null);
  // The "branch" of the tree we drilled into — PMOS or NMOS.
  const [variant, setVariant] = useState<TransistorVariant>(null);
  // Which NAND of the latch was clicked to drill into the gate level.
  const [activeNand, setActiveNand] = useState<'nand-1' | 'nand-2' | null>(null);
  // Which latch of the DFF was clicked to drill into the latch level.
  const [activeLatch, setActiveLatch] = useState<LatchEntry>(null);
  const [transistorHighlight, setTransistorHighlight] = useState<ElectronsPart>(null);
  const [playing, setPlaying] = useState(false);
  const stepCycle = useExecution((s) => s.stepCycle);
  const reset = useExecution((s) => s.reset);

  const handleZoomTo = useCallback((idx: number, kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS) => {
    setZoomTarget(idx);
    setVariant(kind);
  }, []);
  const handleArrived = useCallback(() => {
    setLevel('transistor');
  }, []);
  const handleZoomToGate = useCallback((which: 'nand-1' | 'nand-2') => {
    setActiveNand(which);
    setLevel('gate');
  }, []);
  // DFF clicks → drill into D LATCH (not directly into the SR latch).
  const handleZoomToDLatch = useCallback((which: 'master' | 'slave') => {
    setActiveLatch(which);
    setLevel('dlatch');
  }, []);
  // D-latch clicks → drill into the SR latch (its inner core).
  const handleZoomToLatch = useCallback(() => {
    setLevel('latch');
  }, []);
  // "back" goes UP one level: transistor → gate → latch → dlatch → dff.
  // From dff it's disabled.
  const handleBack = useCallback(() => {
    setLevel((prev) => {
      if (prev === 'transistor') {
        setZoomTarget(null);
        setVariant(null);
        setTransistorHighlight(null);
        return 'gate';
      }
      if (prev === 'gate') {
        setActiveNand(null);
        return 'latch';
      }
      if (prev === 'latch') {
        return 'dlatch';
      }
      if (prev === 'dlatch') {
        setActiveLatch(null);
        return 'dff';
      }
      return prev;
    });
  }, []);

  // Auto-step the clock when "playing" — one tick every 900ms so the user
  // can see each toggle. Stops when paused or reset.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => stepCycle(), 900);
    return () => window.clearInterval(id);
  }, [playing, stepCycle]);

  const handleReset = useCallback(() => {
    setPlaying(false);
    reset();
  }, [reset]);

  // Spotlight: level → variant / activeNand / activeLatch → highlight.
  // Tree: dff ┬→ master ─┐
  //           └→ slave  ─┴→ latch ┬→ nand-1 ─┐
  //                                └→ nand-2 ─┴→ gate ┬→ pmos ─┬─ part highlight
  //                                                   └→ nmos ─┴─ part highlight
  const cycle = useExecution((s) => s.cycle);

  const defaultSpotlight: Spotlight = useMemo(() => {
    if (level === 'dff') return dffSpotlight;
    if (level === 'dlatch') {
      return activeLatch === 'master'
        ? masterDLatchSpotlight
        : activeLatch === 'slave'
          ? slaveDLatchSpotlight
          : dlatchSpotlight;
    }
    if (level === 'latch') {
      return activeLatch === 'master'
        ? masterLatchSpotlight
        : activeLatch === 'slave'
          ? slaveLatchSpotlight
          : latchSpotlight;
    }
    if (level === 'gate') {
      return activeNand === 'nand-1'
        ? nand1Spotlight
        : activeNand === 'nand-2'
          ? nand2Spotlight
          : gateSpotlight;
    }
    if (transistorHighlight) return partSpotlights[transistorHighlight];
    if (variant === TRANSISTOR_TYPE.PMOS) return pmosSpotlight;
    if (variant === TRANSISTOR_TYPE.NMOS) return nmosSpotlight;
    return transistorDefaultSpotlight;
  }, [level, activeLatch, activeNand, variant, transistorHighlight]);

  // Phase spotlight (cycle > 0 ⇒ override the default with the current
  // phase explainer for this level). Transistor level has no phase cycling
  // — its spotlight is always the default. Same for transistor-part highlights.
  const phaseSpotlight: PhaseSpotlight | null = useMemo(() => {
    if (cycle === 0) return null;
    if (transistorHighlight) return null;
    if (level === 'gate') return gatePhaseFor(cycle);
    if (level === 'latch') return latchPhaseFor(cycle);
    if (level === 'dff') return dffPhaseFor(cycle);
    return null;
  }, [cycle, level, transistorHighlight]);

  // What actually renders in the spotlight panel.
  const spotlight: Spotlight = phaseSpotlight ?? defaultSpotlight;
  const spotlightKey =
    phaseSpotlight
      ? `${level}-phase-${cycle}`
      : level === 'dff'
        ? 'dff'
        : level === 'latch'
          ? `latch-${activeLatch ?? 'default'}`
          : level === 'gate'
            ? `gate-${activeNand ?? 'default'}`
            : transistorHighlight ?? `transistor-${variant ?? 'default'}`;

  // LevelSummary card content — same per-level summary that used to live
  // inside each scene; now hoisted into the right toolbar so the canvas can
  // be just the diagram.
  const summary: LevelSummaryData = useMemo(() => {
    if (level === 'dff') return dffLevelSummary;
    if (level === 'dlatch') return dlatchLevelSummary;
    if (level === 'latch') return latchLevelSummary;
    if (level === 'gate') return gateLevelSummary;
    if (variant === TRANSISTOR_TYPE.PMOS) return pmosLevelSummary;
    if (variant === TRANSISTOR_TYPE.NMOS) return nmosLevelSummary;
    return compareLevelSummary;
  }, [level, variant]);

  // Esc goes one level UP (the same as the back button) when there's somewhere
  // to go. From the dff (top of tree) it's a no-op.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && level !== 'dff' /* depth 4 is top */) {
        handleBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [level, handleBack]);

  const meta = LEVEL_META[level];

  // Cross-fade.
  // Conceptually: the abstraction tree is dff (top) > latch > gate > transistor.
  // When we're below a level, that level scales UP (zoomed past, blurred away).
  // When we're above a level, that level scales DOWN (we haven't reached it yet).
  const depthOf: Record<LevelKey, number> = { dff: 4, dlatch: 3, latch: 2, gate: 1, transistor: 0 };
  const currentDepth = depthOf[level];
  const paneAnim = (paneLevel: LevelKey) => {
    const pd = depthOf[paneLevel];
    const isActive = paneLevel === level;
    return {
      opacity: isActive ? 1 : 0,
      scale: isActive ? 1 : pd > currentDepth ? 1.15 : 0.85,
      filter: isActive ? 'blur(0px)' : 'blur(6px)',
    };
  };
  const dffAnim = paneAnim('dff');
  const dlatchAnim = paneAnim('dlatch');
  const latchAnim = paneAnim('latch');
  const gateAnim = paneAnim('gate');
  const transistorAnim = paneAnim('transistor');
  const transition = { duration: 0.7, ease: [0.65, 0, 0.35, 1] as const };

  return (
    <div style={frameStyle}>
      <div style={canvasFrame}>
        <motion.div
          initial={false}
          animate={dffAnim}
          transition={transition}
          style={{ ...paneStyle, pointerEvents: level === 'dff' ? 'auto' : 'none' }}
          aria-hidden={level !== 'dff'}
          data-testid="level-pane-dff"
        >
          <LevelDff onZoomToLatch={handleZoomToDLatch} />
        </motion.div>
        <motion.div
          initial={false}
          animate={dlatchAnim}
          transition={transition}
          style={{ ...paneStyle, pointerEvents: level === 'dlatch' ? 'auto' : 'none' }}
          aria-hidden={level !== 'dlatch'}
          data-testid="level-pane-dlatch"
        >
          <LevelDLatch
            onZoomToLatch={handleZoomToLatch}
            onZoomToGate={() => setLevel('gate')}
          />
        </motion.div>
        <motion.div
          initial={false}
          animate={latchAnim}
          transition={transition}
          style={{ ...paneStyle, pointerEvents: level === 'latch' ? 'auto' : 'none' }}
          aria-hidden={level !== 'latch'}
          data-testid="level-pane-latch"
        >
          <LevelLatch onZoomToGate={handleZoomToGate} />
        </motion.div>
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
          <LevelTransistor variant={variant} highlight={transistorHighlight} onHighlight={setTransistorHighlight} />
        </motion.div>
      </div>

      <aside style={asideStyle} aria-label="Level controls">
        <div data-testid="level-breadcrumb" style={breadcrumbStyle}>
          <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
            level {meta.depth}
          </div>
          <div style={{ color: parchment.ink, fontSize: 16, fontWeight: 600 }}>
            {level === 'transistor' ? transistorTitleFor(variant) : meta.title}
          </div>
          <div style={{ color: parchment.inkSoft, fontSize: 11 }}>{meta.subtitle}</div>
        </div>

        <button
          onClick={handleBack}
          disabled={level === 'dff'}
          aria-label="back / zoom out"
          data-testid="back"
          style={backBtn(level === 'dff')}
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
            <button
              onClick={() => setPlaying((p) => !p)}
              style={clockBtn}
              data-testid="play-pause"
              aria-pressed={playing}
            >
              {playing ? '⏸ pause' : '▶ play'}
            </button>
            <button onClick={stepCycle} style={clockBtn} data-testid="step-cycle">
              ⏭ step
            </button>
          </div>
          <button
            onClick={handleReset}
            style={{ ...clockBtn, marginTop: 6, width: '100%' }}
            data-testid="reset-clock"
          >
            ↺ reset
          </button>
          <div style={{ color: parchment.inkSoft, fontSize: 10, marginTop: 8, lineHeight: 1.4 }}>
            ▶ play: auto-step every 0.9 s.<br />
            ⏭ step: advance one cycle.<br />
            Each cycle the gate flips on/off.
          </div>
        </div>

        <div
          style={{ borderTop: `1px solid ${parchment.rule}`, paddingTop: 10 }}
          data-testid="spotlight"
        >
          <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            {phaseSpotlight ? `phase · cycle ${cycle}` : 'spotlight'}
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
              {spotlight.parentMap && (
                <div
                  style={{
                    color: parchment.inkSoft,
                    fontSize: 10,
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: `1px dashed ${parchment.inkSoft}40`,
                    opacity: 0.7,
                    fontStyle: 'italic',
                  }}
                  data-testid="spotlight-parent-map"
                >
                  {spotlight.parentMap}
                </div>
              )}
              {phaseSpotlight && (
                <div style={metersRowStyle} data-testid="spotlight-meters">
                  {phaseSpotlight.meters.map((m) => (
                    <span key={m.label} style={meterChipStyle} data-testid={`meter-${m.label}`}>
                      {m.label}={m.value}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          style={{ borderTop: `1px solid ${parchment.rule}`, paddingTop: 10 }}
          data-testid="level-summary-card"
        >
          <div style={{ color: parchment.inkSoft, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            this level
          </div>
          <LevelSummary summary={summary} testid="level-summary" />
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

// Parchment frame grows with the viewport. The clamp keeps it tall enough on
// laptops and lets it use most of a desktop screen instead of sitting in a
// 480-pixel postcard. The aside matches via the grid row.
const canvasFrame: React.CSSProperties = {
  position: 'relative',
  height: 'clamp(480px, calc(100vh - 220px), 1100px)',
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
  height: 'clamp(480px, calc(100vh - 220px), 1100px)',
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

const metersRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 8,
  paddingTop: 6,
  borderTop: `1px dashed ${parchment.rule}`,
};

const meterChipStyle: React.CSSProperties = {
  padding: '2px 6px',
  background: parchment.bgDeep,
  border: `1px solid ${parchment.rule}`,
  borderRadius: 3,
  color: parchment.ink,
  fontSize: 10,
  fontFamily: 'ui-monospace, monospace',
};

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
