// LevelDLatch — full-size view of the D latch (4 NANDs + inverter).
//
// Hit zones (CLAUDE.md rule #21):
//   1. SR-core (right pair: N1, N2) — connected-hover with LATCH mini.
//      SR latch's external terminals (S̄, R̄, Q, Q̄) line up with the
//      D-latch's wires, so the preview composes cleanly. Click → latch.
//   2. NS / NR (gating NANDs) — HIGHLIGHT ONLY on hover. The gate's
//      A/B/Y terminals don't topologically match NS's (D, EN) → S̄
//      mapping, so a connected-hover preview would render the gate's
//      A on the LEFT and B on the RIGHT, neither of which matches the
//      D-latch wires entering NS. Click → gate (full detail there).

import { useMemo } from 'react';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import { IOPin } from './IOPin';
import { D_LATCH_MODULE } from './dLatchModule';
import { LATCH_MODULE } from './latchModule';
import { DLATCH_GEOMETRY, WIRE_NODES as D_NODES } from './dLatchWireGraph';
import { projectSceneToMini } from './MiniLevelView';
import { useHoveredChild } from './connectedHover';

type Bit = 0 | 1;
type HoverId = 'sr-core' | 'ns' | 'nr';

function dLatchStateFor(cycle: number): { d: Bit; en: Bit; q: Bit; qBar: Bit } {
  const c = ((cycle % 4) + 4) % 4;
  const drive: [Bit, Bit][] = [[0, 0], [0, 1], [1, 1], [1, 0]];
  const [d, en] = drive[c];
  let q: Bit = 0;
  for (let i = 0; i <= c; i++) {
    const [di, ei] = drive[i];
    if (ei === 1) q = di;
  }
  return { d, en, q, qBar: (1 - q) as Bit };
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  background: parchment.bg,
  border: `1px solid ${parchment.ink}30`,
  borderRadius: 6,
  overflow: 'hidden',
};

interface Props {
  onZoomToLatch: () => void;
  onZoomToGate: () => void;
}

// Hit-zone bounding boxes IN WORLD coords (must match positions drawn
// by DLatchSceneSvg). SR-core covers the right pair of NANDs + feedback
// wraparound area. NS/NR cover each gating NAND tightly.
const SR_CORE_WORLD = { minX: 0.7, maxX: 5.5, minY: -3.0, maxY: 3.0 };
const NS_WORLD = { minX: -3.5, maxX: -1.5, minY: 0.3, maxY: 1.7 };
const NR_WORLD = { minX: -3.5, maxX: -1.5, minY: -1.7, maxY: -0.3 };

const VIEW_W = 600;
const VIEW_H = 400;

export function LevelDLatch({ onZoomToLatch, onZoomToGate }: Props) {
  const cycle = useExecution((s) => s.cycle);
  const state = useMemo(() => dLatchStateFor(cycle), [cycle]);
  const { hovered, enter, leaveAll } = useHoveredChild<HoverId>();

  // Project a world point into D-latch SVG coords.
  const project = (wx: number, wy: number) =>
    projectSceneToMini(wx, wy, VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, DLATCH_GEOMETRY, 1.1);

  const boxFromWorld = (b: { minX: number; maxX: number; minY: number; maxY: number }) => {
    const tl = project(b.minX, b.maxY);
    const br = project(b.maxX, b.minY);
    return {
      x: tl.x,
      y: tl.y,
      w: br.x - tl.x,
      h: br.y - tl.y,
      cx: (tl.x + br.x) / 2,
      cy: (tl.y + br.y) / 2,
    };
  };
  const srBox = boxFromWorld(SR_CORE_WORLD);
  const nsBox = boxFromWorld(NS_WORLD);
  const nrBox = boxFromWorld(NR_WORLD);

  // SR-latch derived state.
  const sBar: Bit = state.en === 1 ? ((1 - state.d) as Bit) : 1;
  const rBar: Bit = state.en === 1 ? state.d : 1;

  return (
    <div style={containerStyle} data-testid="dlatch-scene">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Vertical supply PILLARS — Vdd on the LEFT edge, GND on the RIGHT.
            Drawn FIRST so the scene below renders on top of them; they
            are visible only where no other content overlaps. Labels at
            the top so they never get cut off. */}
        <line x1={15} y1={20} x2={15} y2={VIEW_H - 15} stroke={parchment.gateOn} strokeWidth={3} data-testid="dlatch-vdd-pillar" />
        <text x={2} y={14} fontSize={11} fontWeight={700} fill={parchment.gateOn} fontFamily="serif">Vdd</text>
        <line x1={VIEW_W - 15} y1={20} x2={VIEW_W - 15} y2={VIEW_H - 15} stroke={parchment.ink} strokeWidth={3} data-testid="dlatch-gnd-pillar" />
        <text x={VIEW_W - 30} y={14} fontSize={11} fontWeight={700} fill={parchment.ink} fontFamily="serif">GND</text>

        {/* Full D-latch scene — base layer. `embedded: true` suppresses
            the internal Vdd/GND rail labels (the level's own vertical
            pillars provide them, so labeling both would duplicate). */}
        {D_LATCH_MODULE.renderMini({
          cx: VIEW_W / 2,
          cy: VIEW_H / 2,
          w: VIEW_W,
          h: VIEW_H,
          inputs: state,
          testid: 'dlatch-full',
          margin: 1.1,
          embedded: true,
        })}

        {/* Hover preview overlays — only one is rendered at a time. */}
        {hovered === 'sr-core' && (
          <g data-testid="dlatch-sr-preview">
            {LATCH_MODULE.renderMini({
              cx: srBox.cx,
              cy: srBox.cy,
              w: srBox.w,
              h: srBox.h,
              inputs: { sBar, rBar, q: state.q, qBar: state.qBar },
              testid: 'dlatch-sr-preview-mini',
              frameStroke: parchment.gateOn,
              margin: 1.15,
              embedded: true,
            })}
          </g>
        )}
        {/* NS / NR get a HIGHLIGHT-ONLY hover (no connected preview —
            see file header for the topology mismatch). The highlight is
            a stroke-only rect on the same box as the hit area. */}
        {hovered === 'ns' && (
          <rect
            data-testid="dlatch-ns-highlight"
            x={nsBox.x} y={nsBox.y} width={nsBox.w} height={nsBox.h}
            fill="none" stroke={parchment.gateOn} strokeWidth={2} rx={4}
            pointerEvents="none"
          />
        )}
        {hovered === 'nr' && (
          <rect
            data-testid="dlatch-nr-highlight"
            x={nrBox.x} y={nrBox.y} width={nrBox.w} height={nrBox.h}
            fill="none" stroke={parchment.gateOn} strokeWidth={2} rx={4}
            pointerEvents="none"
          />
        )}

        {/* Standardized I/O pin circles for external terminals (matches latch + dff style). */}
        {(() => {
          const dp = project(D_NODES.D_in[0], D_NODES.D_in[1]);
          const ep = project(D_NODES.EN_in[0], D_NODES.EN_in[1]);
          const qp = project(D_NODES.Q_out[0], D_NODES.Q_out[1]);
          const qbp = project(D_NODES.QB_out[0], D_NODES.QB_out[1]);
          return (
            <>
              <IOPin cx={dp.x + 15} cy={dp.y} label="D" value={state.d} testid="dlatch-input-d" />
              <IOPin cx={ep.x} cy={ep.y - 15} label="EN" value={state.en} testid="dlatch-input-en" />
              <IOPin cx={qp.x - 15} cy={qp.y} label="Q" value={state.q} testid="dlatch-output-q" />
              <IOPin cx={qbp.x - 15} cy={qbp.y} label="Q̄" value={state.qBar} testid="dlatch-output-qbar" />
            </>
          );
        })()}

        {/* Hit areas — drawn last (on top) so hover/click are reliable. */}
        <rect
          data-testid="dlatch-sr-core"
          x={srBox.x} y={srBox.y} width={srBox.w} height={srBox.h}
          fill="rgba(0,0,0,0.001)" stroke="none"
          onMouseEnter={() => enter('sr-core')}
          onMouseLeave={() => leaveAll()}
          onClick={onZoomToLatch}
          style={{ cursor: 'pointer' }}
        />
        <rect
          data-testid="dlatch-ns"
          x={nsBox.x} y={nsBox.y} width={nsBox.w} height={nsBox.h}
          fill="rgba(0,0,0,0.001)" stroke="none"
          onMouseEnter={() => enter('ns')}
          onMouseLeave={() => leaveAll()}
          onClick={onZoomToGate}
          style={{ cursor: 'pointer' }}
        />
        <rect
          data-testid="dlatch-nr"
          x={nrBox.x} y={nrBox.y} width={nrBox.w} height={nrBox.h}
          fill="rgba(0,0,0,0.001)" stroke="none"
          onMouseEnter={() => enter('nr')}
          onMouseLeave={() => leaveAll()}
          onClick={onZoomToGate}
          style={{ cursor: 'pointer' }}
        />

        <text x={12} y={20} textAnchor="start" fontSize={11} fill={parchment.inkSoft} fontStyle="italic">
          (hover NS, NR, or the SR core for a preview · click to drill in)
        </text>
      </svg>
    </div>
  );
}
