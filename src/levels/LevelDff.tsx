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
import { MiniSrLatch } from './MiniViews';

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

// SVG layout — viewBox is 700 wide × 420 tall.
const D_X = 40;
const DATA_Y = 240;
const CLK_X = 40;
const CLK_Y = 80;
const CLK_BRANCH_X = 130;            // tap point where CLK splits to inverter and slave
const INV_IN_X = 175;
const INV_OUT_X = 210;
const MASTER_X = 250;
const MASTER_Y = 200;
const MASTER_W = 130;
const MASTER_H = 110;
const SLAVE_X = 460;
const SLAVE_W = 130;
const SLAVE_H = 110;
const SLAVE_Y = 200;
const Q_X = 660;
const Q_Y = 230;
const QBAR_Y = 280;

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
        {/* D input wire: D pin → master.D */}
        <polyline
          data-testid="wire-d"
          points={`${D_X},${DATA_Y} ${MASTER_X},${DATA_Y}`}
          fill="none"
          stroke={dColor}
          strokeWidth={2.5}
        />

        {/* CLK pin → branch point at (CLK_BRANCH_X, CLK_Y) */}
        <polyline
          data-testid="wire-clk"
          points={`${CLK_X},${CLK_Y} ${CLK_BRANCH_X},${CLK_Y}`}
          fill="none"
          stroke={clkColor}
          strokeWidth={2.5}
        />

        {/* Branch 1 — CLK direct to slave: up over the top, then down to slave EN */}
        <polyline
          data-testid="wire-clk-to-slave"
          points={`${CLK_BRANCH_X},${CLK_Y} ${CLK_BRANCH_X},36 ${SLAVE_X + SLAVE_W / 2},36 ${SLAVE_X + SLAVE_W / 2},${SLAVE_Y}`}
          fill="none"
          stroke={clkColor}
          strokeWidth={2.5}
        />
        {/* Branch dot at the tap point */}
        <circle cx={CLK_BRANCH_X} cy={CLK_Y} r={3} fill={clkColor} />

        {/* Branch 2 — CLK into inverter, out as !CLK, down to master EN */}
        <polyline
          points={`${CLK_BRANCH_X},${CLK_Y} ${INV_IN_X},${CLK_Y}`}
          fill="none"
          stroke={clkColor}
          strokeWidth={2.5}
        />
        <Inverter inX={INV_IN_X} outX={INV_OUT_X} cy={CLK_Y} testid="dff-inverter" />
        <polyline
          data-testid="wire-not-clk-to-master"
          points={`${INV_OUT_X + 5},${CLK_Y} ${MASTER_X + MASTER_W / 2},${CLK_Y} ${MASTER_X + MASTER_W / 2},${MASTER_Y}`}
          fill="none"
          stroke={notClkColor}
          strokeWidth={2.5}
        />

        {/* Master.Q → Slave.D */}
        <polyline
          data-testid="wire-master-to-slave"
          points={`${MASTER_X + MASTER_W},${DATA_Y} ${SLAVE_X},${DATA_Y}`}
          fill="none"
          stroke={mColor}
          strokeWidth={2.5}
        />

        {/* Slave outputs */}
        <polyline
          data-testid="wire-q-out"
          points={`${SLAVE_X + SLAVE_W},${Q_Y} ${Q_X},${Q_Y}`}
          fill="none"
          stroke={qColor}
          strokeWidth={2.5}
        />
        <polyline
          data-testid="wire-qbar-out"
          points={`${SLAVE_X + SLAVE_W},${QBAR_Y} ${Q_X},${QBAR_Y}`}
          fill="none"
          stroke={qbColor}
          strokeWidth={2.5}
        />

        {/* Latch boxes — hovered → swap simple labeled box for MiniSrLatch
            (cross-coupled NAND pair) so the user sees what's INSIDE the
            latch, not just a label. */}
        {hoveredLatch === 'master' ? (
          <MiniSrLatch x={MASTER_X} y={MASTER_Y} w={MASTER_W} h={MASTER_H} testid="master-latch-detailed" />
        ) : (
          <LatchBox
            x={MASTER_X}
            y={MASTER_Y}
            w={MASTER_W}
            h={MASTER_H}
            label="MASTER latch"
            subtitle="EN = !CLK"
            contents={`held = ${state.masterHeld}`}
            enabled={state.clk === 0}
            testid="master-latch"
          />
        )}
        {hoveredLatch === 'slave' ? (
          <MiniSrLatch x={SLAVE_X} y={SLAVE_Y} w={SLAVE_W} h={SLAVE_H} testid="slave-latch-detailed" />
        ) : (
          <LatchBox
            x={SLAVE_X}
            y={SLAVE_Y}
            w={SLAVE_W}
            h={SLAVE_H}
            label="SLAVE latch"
            subtitle="EN = CLK"
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

        {/* Port labels stuck to the latch boxes */}
        <PortLabel x={MASTER_X - 4} y={DATA_Y - 6} text={LOGIC.D} />
        <PortLabel x={MASTER_X + MASTER_W + 4} y={DATA_Y - 6} text={LOGIC.Q} anchor="start" />
        <PortLabel x={MASTER_X + MASTER_W / 2 + 6} y={MASTER_Y - 4} text={LOGIC.EN} anchor="start" />
        <PortLabel x={SLAVE_X - 4} y={DATA_Y - 6} text={LOGIC.D} />
        <PortLabel x={SLAVE_X + SLAVE_W + 4} y={Q_Y - 6} text={LOGIC.Q} anchor="start" />
        <PortLabel x={SLAVE_X + SLAVE_W + 4} y={QBAR_Y - 6} text={LOGIC.Qbar} anchor="start" />
        <PortLabel x={SLAVE_X + SLAVE_W / 2 + 6} y={SLAVE_Y - 4} text={LOGIC.EN} anchor="start" />

        {/* Pin labels and value chips on the far edges */}
        <InputLabel x={D_X - 20} y={DATA_Y} text={LOGIC.D} value={state.d} testid="input-d" />
        <InputLabel x={CLK_X - 20} y={CLK_Y} text={LOGIC.CLK} value={state.clk} testid="input-clk" />
        <OutputLabel x={Q_X + 5} y={Q_Y} text={LOGIC.Q} value={state.q} testid="output-q" />
        <OutputLabel x={Q_X + 5} y={QBAR_Y} text={LOGIC.Qbar} value={state.qbar} testid="output-qbar" />
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

function PortLabel({
  x, y, text, anchor = 'end',
}: { x: number; y: number; text: string; anchor?: 'start' | 'end' | 'middle' }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={9}
      fill={parchment.inkSoft}
      fontFamily="serif"
    >
      {text}
    </text>
  );
}

function InputLabel({
  x, y, text, value, testid,
}: { x: number; y: number; text: string; value: Bit; testid: string }) {
  return (
    <g data-testid={testid}>
      <text
        x={x}
        y={y - 10}
        fontSize={14}
        fontWeight={700}
        fill={parchment.ink}
        fontFamily="serif"
      >
        {text}
      </text>
      <text
        x={x}
        y={y + 12}
        fontSize={11}
        fill={value === 1 ? NET_HIGH : NET_LOW}
        fontFamily="serif"
        data-testid={`${testid}-value`}
      >
        = {value}
      </text>
    </g>
  );
}

function OutputLabel({
  x, y, text, value, testid,
}: { x: number; y: number; text: string; value: Bit; testid: string }) {
  return (
    <g data-testid={testid}>
      <rect
        x={x - 8}
        y={y - 18}
        width={36}
        height={36}
        rx={4}
        fill={parchment.bg}
        stroke={value === 1 ? NET_HIGH : NET_LOW}
        strokeWidth={2}
      />
      <text
        x={x + 10}
        y={y - 4}
        textAnchor="middle"
        fontSize={13}
        fontWeight={700}
        fill={parchment.ink}
        fontFamily="serif"
      >
        {text}
      </text>
      <text
        x={x + 10}
        y={y + 11}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={value === 1 ? NET_HIGH : NET_LOW}
        fontFamily="serif"
        data-testid={`${testid}-value`}
      >
        {value}
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
