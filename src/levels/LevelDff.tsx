// LevelDff — D flip-flop, master-slave, positive-edge-triggered.
//
// Two SR latches stacked, gated by complementary clock phases. The master is
// transparent while CLK = 0 (its EN is driven by !CLK), so it tracks D. The
// slave is transparent while CLK = 1 (its EN is driven by CLK directly), so
// it forwards whatever the master last froze.
//
// On the rising edge:
//   - the master locks the value of D at that instant
//   - the slave begins forwarding that locked value to Q
// → Q updates exactly once per clock tick, on the rising edge.
//
// Why this matters:
//   A bare latch is "transparent" — its output follows its input the whole
//   time it's enabled. That makes a synchronous machine of thousands of
//   latches a timing nightmare (signals can race through chains of latches
//   in one tick). A DFF freezes its output between edges, so the entire CPU
//   advances in lockstep on every tick. THIS is the storage element of every
//   register, every pipeline stage latch, every architectural state bit.
//
// Click either latch box to drill DOWN into the latch level.

import { useMemo, useState, type CSSProperties } from 'react';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import { LOGIC } from './symbols';
import { D_LATCH_MODULE } from './dLatchModule';
import { PinDot } from './PinDot';
import { IOPin } from './IOPin';

type Bit = 0 | 1;

interface DffState {
  clk: Bit;
  d: Bit;
  masterHeld: Bit;
  q: Bit;
  qbar: Bit;
}

// Steady-state, deterministic from cycle. The 4-step demo cycles through:
//   0 → CLK low,  D = 0  → master tracking 0 ; Q held = 1 (last edge captured 1)
//   1 → CLK high, D = 0  → rising edge → master snapshot 0 → Q = 0
//   2 → CLK low,  D = 1  → master tracking 1 ; Q STILL 0  ← key insight
//   3 → CLK high, D = 1  → rising edge → master snapshot 1 → Q = 1
// Phase prose lives in descriptions.ts (dffPhaseFor) and renders in the
// right-toolbar spotlight, NOT inside the viz canvas.
function dffStateFor(cycle: number): DffState {
  const c = ((cycle % 4) + 4) % 4;
  if (c === 0) return { clk: 0, d: 0, masterHeld: 0, q: 1, qbar: 0 };
  if (c === 1) return { clk: 1, d: 0, masterHeld: 0, q: 0, qbar: 1 };
  if (c === 2) return { clk: 0, d: 1, masterHeld: 1, q: 0, qbar: 1 };
  return { clk: 1, d: 1, masterHeld: 1, q: 1, qbar: 0 };
}

interface Props {
  onZoomToLatch: (which: 'master' | 'slave') => void;
}

const NET_HIGH = parchment.gateOn;
const NET_LOW = '#5c4438';
const wireColor = (b: Bit): string => (b === 1 ? NET_HIGH : NET_LOW);

// SVG layout — viewBox is 700 wide × 420 tall. Latch placement first.
const MASTER_X = 250;
const MASTER_Y = 200;
const MASTER_W = 130;
const MASTER_H = 110;
const SLAVE_X = 460;
const SLAVE_W = 130;
const SLAVE_H = 110;
const SLAVE_Y = 200;

// LevelModule pattern: each latch is now a D LATCH (1 SR latch + 2
// gating NANDs + inverter). Its external interface is the textbook
// D-latch: D_in, EN_in, Q_out, QB_out, Vdd, GND. CLK lands on EN_in.
const MASTER_CX = MASTER_X + MASTER_W / 2;
const MASTER_CY = MASTER_Y + MASTER_H / 2;
const DLATCH_MASTER = D_LATCH_MODULE.projectAllTerminals(MASTER_CX, MASTER_CY, MASTER_W, MASTER_H);
const SLAVE_CX = SLAVE_X + SLAVE_W / 2;
const SLAVE_CY = SLAVE_Y + SLAVE_H / 2;
const DLATCH_SLAVE = D_LATCH_MODULE.projectAllTerminals(SLAVE_CX, SLAVE_CY, SLAVE_W, SLAVE_H);

// One straight data line: D → master.D_in → master.Q_out → slave.D_in
// → slave.Q_out → Q chip. Since D_in and Q_out share the same world y
// inside D_LATCH_MODULE, projections collapse to one line at DATA_Y.
const DATA_Y = DLATCH_MASTER.D_in.y;
const Q_Y = DLATCH_SLAVE.Q_out.y;
const QBAR_Y = DLATCH_SLAVE.QB_out.y;

const D_X = 40;
const CLK_X = 40;
const CLK_Y = 80;
const CLK_BRANCH_X = 130;
const INV_IN_X = 175;
const INV_OUT_X = 210;
const Q_X = 660;

const DFF_VDD_Y = DLATCH_MASTER.Vdd_left.y;
const DFF_GND_Y = DLATCH_MASTER.GND_left.y;

export function LevelDff({ onZoomToLatch }: Props) {
  const cycle = useExecution((s) => s.cycle);
  const state = useMemo(() => dffStateFor(cycle), [cycle]);
  const [hoveredLatch, setHoveredLatch] = useState<'master' | 'slave' | null>(null);

  const dColor = wireColor(state.d);
  const clkColor = wireColor(state.clk);
  const notClkColor = wireColor((1 - state.clk) as Bit);
  const mColor = wireColor(state.masterHeld);
  const qColor = wireColor(state.q);
  const qbColor = wireColor(state.qbar);

  return (
    <div style={containerStyle} data-testid="dff-scene">
      <svg
        viewBox="0 0 700 420"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {/* ===== Supply rails =====
            VERTICAL supply PILLARS on the FAR LEFT (Vdd) and FAR RIGHT
            (GND) of the canvas — they run top-to-bottom and never get
            cut off by anything inside the scene. The legacy HORIZONTAL
            rails (one at the master/slave Vdd y, one at the GND y) are
            preserved as supply distribution INSIDE each latch mini, and
            they T-junction into the vertical pillars at the edges.

            ┌── Vdd (vertical, left)            GND (vertical, right) ──┐
            │   ┝══════════════════════════════════════════════╕       │
            │   ┃        horizontal Vdd row supply              │       │
            │   ┝══════════════════════════════════════════════╕       │
            │            ... scene ...                                  │
            │   ┝══════════════════════════════════════════════╕       │
            │   ┃        horizontal GND row supply              │       │
            │   ┕══════════════════════════════════════════════╛       │
            └─────────────────────────────────────────────────────────────*/}
        {/* Vertical Vdd pillar — left edge */}
        <line x1={20} y1={20} x2={20} y2={400} stroke={NET_HIGH} strokeWidth={3} data-testid="dff-vdd-pillar" />
        <text x={6} y={14} fontSize={12} fontWeight={700} fill={NET_HIGH} fontFamily="serif">Vdd</text>
        {/* Vertical GND pillar — right edge */}
        <line x1={680} y1={20} x2={680} y2={400} stroke={parchment.ink} strokeWidth={3} data-testid="dff-gnd-pillar" />
        <text x={668} y={14} fontSize={12} fontWeight={700} fill={parchment.ink} fontFamily="serif">GND</text>

        {/* Horizontal in-row supplies — connect to the pillars at the
            edges; pass through each latch mini at the projected y. */}
        <line x1={20} y1={DFF_VDD_Y} x2={675} y2={DFF_VDD_Y} stroke={NET_HIGH} strokeWidth={2.5} data-testid="dff-vdd-rail" />
        <line x1={25} y1={DFF_GND_Y} x2={680} y2={DFF_GND_Y} stroke={parchment.ink} strokeWidth={2.5} data-testid="dff-gnd-rail" />
        {/* Pin dots at rail ↔ pillar T-junctions */}
        <PinDot cx={20} cy={DFF_VDD_Y} fill={NET_HIGH} testid="dff-vdd-pillar-junction" />
        <PinDot cx={680} cy={DFF_GND_Y} fill={parchment.ink} testid="dff-gnd-pillar-junction" />

        {/* === Data + clock wires ===
            Each latch is a D LATCH (D_LATCH_MODULE) with REAL D and EN
            terminals, so the DFF has exactly one D wire per latch and
            CLK / !CLK physically terminate at each latch's EN_in. The
            inverter that produces !D lives INSIDE the D latch (not in
            the DFF), so no external !D wire. */}

        {/* D → master.D_in. Single horizontal line. Pin dot at the
            external D pin (where the wire enters the canvas). */}
        <polyline
          data-testid="wire-d"
          points={`${D_X},${DATA_Y} ${DLATCH_MASTER.D_in.x},${DLATCH_MASTER.D_in.y}`}
          fill="none"
          stroke={dColor}
          strokeWidth={2.5}
        />
        <PinDot cx={D_X} cy={DATA_Y} fill={dColor} testid="dff-d-pin" />

        {/* CLK gating. CLK enters → branches: one tap goes through an
            inverter to produce !CLK (master.EN), the other goes directly
            to slave.EN. Both CLK and !CLK terminate at REAL EN_in
            terminals on each D latch. */}
        <polyline
          data-testid="wire-clk"
          points={`${CLK_X},${CLK_Y} ${CLK_BRANCH_X},${CLK_Y}`}
          fill="none"
          stroke={clkColor}
          strokeWidth={2.5}
        />
        <PinDot cx={CLK_X} cy={CLK_Y} fill={clkColor} testid="dff-clk-pin" />
        <circle cx={CLK_BRANCH_X} cy={CLK_Y} r={3} fill={clkColor} />
        <polyline
          points={`${CLK_BRANCH_X},${CLK_Y} ${INV_IN_X},${CLK_Y}`}
          fill="none"
          stroke={clkColor}
          strokeWidth={2.5}
        />
        <Inverter inX={INV_IN_X} outX={INV_OUT_X} cy={CLK_Y} testid="dff-inverter" />
        {/* !CLK → master.EN_in (drops down into the D latch's real EN). */}
        <polyline
          data-testid="wire-not-clk-to-master"
          points={`${INV_OUT_X + 5},${CLK_Y} ${DLATCH_MASTER.EN_in.x},${CLK_Y} ${DLATCH_MASTER.EN_in.x},${DLATCH_MASTER.EN_in.y}`}
          fill="none"
          stroke={notClkColor}
          strokeWidth={2.5}
        />
        {/* CLK direct → slave.EN_in (also a real terminal). */}
        <polyline
          data-testid="wire-clk-to-slave"
          points={`${CLK_BRANCH_X},${CLK_Y} ${CLK_BRANCH_X},${CLK_Y - 28} ${DLATCH_SLAVE.EN_in.x},${CLK_Y - 28} ${DLATCH_SLAVE.EN_in.x},${DLATCH_SLAVE.EN_in.y}`}
          fill="none"
          stroke={clkColor}
          strokeWidth={2.5}
        />

        {/* Master.Q_out → Slave.D_in. */}
        <polyline
          data-testid="wire-master-to-slave"
          points={`${DLATCH_MASTER.Q_out.x},${DLATCH_MASTER.Q_out.y} ${DLATCH_SLAVE.D_in.x},${DLATCH_SLAVE.D_in.y}`}
          fill="none"
          stroke={mColor}
          strokeWidth={2.5}
        />

        {/* Slave outputs — wires START at the D latch's Q_out / QB_out
            projected terminals. */}
        <polyline
          data-testid="wire-q-out"
          points={`${DLATCH_SLAVE.Q_out.x},${DLATCH_SLAVE.Q_out.y} ${Q_X},${DLATCH_SLAVE.Q_out.y}`}
          fill="none"
          stroke={qColor}
          strokeWidth={2.5}
        />
        <polyline
          data-testid="wire-qbar-out"
          points={`${DLATCH_SLAVE.QB_out.x},${DLATCH_SLAVE.QB_out.y} ${Q_X},${DLATCH_SLAVE.QB_out.y}`}
          fill="none"
          stroke={qbColor}
          strokeWidth={2.5}
        />

        {/* Latch boxes — hovered → swap simple labeled box for MiniSrLatch
            (cross-coupled NAND pair) so the user sees what's INSIDE the
            latch, not just a label. */}
        {hoveredLatch === 'master' ? (
          D_LATCH_MODULE.renderMini({
            cx: MASTER_X + MASTER_W / 2,
            cy: MASTER_Y + MASTER_H / 2,
            w: MASTER_W,
            h: MASTER_H,
            inputs: {
              d: state.d,
              en: state.clk === 0 ? 1 : 0,  // master EN = !CLK
              q: state.masterHeld,
              qBar: (1 - state.masterHeld) as Bit,
            },
            testid: 'master-latch-detailed',
            frameStroke: `${parchment.ink}40`,
          })
        ) : (
          <LatchBox
            x={MASTER_X}
            y={MASTER_Y}
            w={MASTER_W}
            h={MASTER_H}
            label="MASTER latch"
            subtitle=""
            contents={`held = ${state.masterHeld}`}
            enabled={state.clk === 0}
            testid="master-latch"
          />
        )}
        {hoveredLatch === 'slave' ? (
          D_LATCH_MODULE.renderMini({
            cx: SLAVE_X + SLAVE_W / 2,
            cy: SLAVE_Y + SLAVE_H / 2,
            w: SLAVE_W,
            h: SLAVE_H,
            inputs: {
              d: state.masterHeld,           // slave's D is master's Q
              en: state.clk === 1 ? 1 : 0,    // slave EN = CLK
              q: state.q,
              qBar: state.qbar,
            },
            testid: 'slave-latch-detailed',
            frameStroke: `${parchment.ink}40`,
          })
        ) : (
          <LatchBox
            x={SLAVE_X}
            y={SLAVE_Y}
            w={SLAVE_W}
            h={SLAVE_H}
            label="SLAVE latch"
            subtitle=""
            contents={`out = ${state.q}`}
            enabled={state.clk === 1}
            testid="slave-latch"
          />
        )}
        {/* Click + hover hit areas — invisible, sit on top so swapping the
            visual underneath doesn't break the gesture. */}
        <LatchHitArea
          x={MASTER_X} y={MASTER_Y} w={MASTER_W} h={MASTER_H}
          testid="master-latch"
          onClick={() => onZoomToLatch('master')}
          onEnter={() => setHoveredLatch('master')}
          onLeave={() => setHoveredLatch((p) => (p === 'master' ? null : p))}
        />
        <LatchHitArea
          x={SLAVE_X} y={SLAVE_Y} w={SLAVE_W} h={SLAVE_H}
          testid="slave-latch"
          onClick={() => onZoomToLatch('slave')}
          onEnter={() => setHoveredLatch('slave')}
          onLeave={() => setHoveredLatch((p) => (p === 'slave' ? null : p))}
        />

        {/* Pin labels and value chips on the far edges. */}
        <IOPin cx={D_X} cy={DATA_Y} label={LOGIC.D} value={state.d} testid="input-d" />
        <IOPin cx={CLK_X} cy={CLK_Y} label={LOGIC.CLK} value={state.clk} testid="input-clk" />
        <IOPin cx={Q_X + 15} cy={Q_Y} label={LOGIC.Q} value={state.q} testid="output-q" />
        <IOPin cx={Q_X + 15} cy={QBAR_Y} label={LOGIC.Qbar} value={state.qbar} testid="output-qbar" />
      </svg>
    </div>
  );
}

interface LatchBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  subtitle: string;
  contents: string;
  enabled: boolean;
  testid: string;
}

function LatchBox({ x, y, w, h, label, subtitle, contents, enabled, testid }: LatchBoxProps) {
  const stroke = enabled ? parchment.gateOn : parchment.ink;
  const strokeWidth = enabled ? 2.5 : 1.5;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={parchment.bgDeep}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <text
        x={x + w / 2}
        y={y + 24}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill={parchment.ink}
        fontFamily="serif"
      >
        {label}
      </text>
      <text
        x={x + w / 2}
        y={y + 42}
        textAnchor="middle"
        fontSize={10}
        fill={parchment.inkSoft}
        fontStyle="italic"
        fontFamily="serif"
      >
        {subtitle}
      </text>
      <text
        x={x + w / 2}
        y={y + 70}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={enabled ? parchment.gateOn : parchment.inkSoft}
        fontFamily="monospace"
        data-testid={`${testid}-contents`}
      >
        {contents}
      </text>
      <text
        x={x + w / 2}
        y={y + 90}
        textAnchor="middle"
        fontSize={9}
        fill={parchment.inkSoft}
        fontFamily="serif"
        data-testid={`${testid}-state`}
      >
        {enabled ? 'transparent' : 'frozen'}
      </text>
    </g>
  );
}

// Invisible hover/click hit area covering the latch box footprint. Sits on
// top of either visual variant (LatchBox or MiniSrLatch) so swapping the
// underneath visual doesn't break the gesture.
function LatchHitArea({
  x, y, w, h, testid, onClick, onEnter, onLeave,
}: {
  x: number; y: number; w: number; h: number; testid: string;
  onClick: () => void; onEnter: () => void; onLeave: () => void;
}) {
  return (
    <rect
      data-testid={testid}
      x={x}
      y={y}
      width={w}
      height={h}
      fill="transparent"
      stroke="none"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: 'pointer' }}
    />
  );
}

interface InverterProps {
  inX: number;
  outX: number;
  cy: number;
  testid: string;
}

function Inverter({ inX, outX, cy, testid }: InverterProps) {
  // Triangle pointing right + bubble at the tip.
  const tipX = outX;
  const points = `${inX},${cy - 14} ${inX},${cy + 14} ${tipX},${cy}`;
  return (
    <g data-testid={testid}>
      <polygon
        points={points}
        fill={parchment.bg}
        stroke={parchment.ink}
        strokeWidth={1.5}
      />
      <circle
        cx={tipX + 4}
        cy={cy}
        r={4}
        fill={parchment.bg}
        stroke={parchment.ink}
        strokeWidth={1.5}
      />
      <text
        x={inX + 12}
        y={cy + 3}
        fontSize={9}
        fill={parchment.inkSoft}
        fontFamily="serif"
      >
        NOT
      </text>
    </g>
  );
}

const containerStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: parchment.bg,
  overflow: 'hidden',
};
