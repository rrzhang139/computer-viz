// LevelLatch — SR latch (NAND-based, active LOW). The first stateful primitive.
//
// Two cross-coupled NAND gates. The output of each is wired back as one input
// of the other. That feedback loop is what gives birth to MEMORY: the circuit
// has two stable states (Q=0,Q̄=1 and Q=1,Q̄=0), and it stays in whichever one
// you last drove it into.
//
// Inputs (active LOW):
//   S̄  — pull to 0 to SET   (Q → 1)
//   R̄  — pull to 0 to RESET (Q → 0)
//   both 1 = HOLD (the latch remembers)
//   both 0 = FORBIDDEN (race condition; not visited in our cycle)
//
// Outputs:
//   Q, Q̄ — always opposite during normal operation.
//
// Click either NAND box to drill DOWN into the gate level.

import { useMemo } from 'react';
import { useExecution } from '../store/executionState';
import { parchment } from './parchment';
import { NAND_CONNECTIONS } from './nandConnections';
import { useHoveredChild } from './connectedHover';
import { MiniNandView } from './MiniNandView';
import { GATE_MODULE } from './gateModule';

type Bit = 0 | 1;

interface LatchState {
  sBar: Bit;
  rBar: Bit;
  Q: Bit;
  qBar: Bit;
}

// Drive sequence: hold → set → hold → reset, repeating. Q follows the most
// recent set/reset. Pure function of cycle so derived state stays consistent
// even after reset / step-back. Phase prose now lives in descriptions.ts
// (latchPhaseFor) and renders in the right-toolbar spotlight.
function latchStateFor(cycle: number): LatchState {
  const c = ((cycle % 4) + 4) % 4;
  if (c === 1) return { sBar: 0, rBar: 1, Q: 1, qBar: 0 };
  if (c === 3) return { sBar: 1, rBar: 0, Q: 0, qBar: 1 };
  if (c === 0) return { sBar: 1, rBar: 1, Q: 0, qBar: 1 };
  return { sBar: 1, rBar: 1, Q: 1, qBar: 0 };
}

interface Props {
  onZoomToGate: (which: 'nand-1' | 'nand-2') => void;
}

const NET_HIGH = parchment.gateOn;
const NET_LOW = '#5c4438';
const wireColor = (b: Bit): string => (b === 1 ? NET_HIGH : NET_LOW);

// SVG layout — viewBox is 600 wide × 400 tall.
const NAND1_CX = 320;
const NAND1_CY = 110;
const NAND2_CX = 320;
const NAND2_CY = 290;
// Each NAND's mini box (when hovered) has this footprint, centered on
// (NAND{1,2}_CX, NAND{1,2}_CY).
const MINI_W = 240;
const MINI_H = 140;
const MINI_MARGIN = 1.2;

// All terminal projections come from GATE_MODULE.projectTerminal — the
// SAME math the mini's scene transform uses. Latch wires terminate at
// the exact pixel the gate's internal A/B/Y/Vdd/GND lands on.
const N1 = GATE_MODULE.projectAllTerminals(NAND1_CX, NAND1_CY, MINI_W, MINI_H, MINI_MARGIN);
const N2 = GATE_MODULE.projectAllTerminals(NAND2_CX, NAND2_CY, MINI_W, MINI_H, MINI_MARGIN);

const N1_IN_S = N1.A_input;
const N1_IN_QB = N1.B_input;
const N1_OUT = N1.Y_out;
const N2_IN_R = N2.A_input;
const N2_IN_Q = N2.B_input;
const N2_OUT = N2.Y_out;

// Feedback wires wrap around the RIGHT edge of each NAND's mini box.
// FEEDBACK_Q_X / FEEDBACK_QB_X are wrap-around lanes — far enough past
// the mini's right edge (NAND_CX + MINI_W/2 = 440) to not visually
// overlap the mini, and offset from each other so the two feedback
// polylines don't run on top of each other.
const FEEDBACK_Q_X = NAND1_CX + MINI_W / 2 + 30;   // 470
const FEEDBACK_QB_X = NAND1_CX + MINI_W / 2 + 60;  // 500

// Each NAND mini's Vdd/GND rails project to a known y inside the latch
// SVG. We draw the LATCH's Vdd/GND rails at exactly these y's so they
// visually continue the mini's internal rails — one unbroken line from
// outside the mini THROUGH it. No T-junction stubs needed; the latch
// rail IS the supply rail the gate's internal taps connect to.
const NAND1_VDD_Y = N1.Vdd_rail_left.y;
const NAND2_VDD_Y = N2.Vdd_rail_left.y;
const NAND1_GND_Y = N1.GND_rail_left.y;
const NAND2_GND_Y = N2.GND_rail_left.y;
// X-range of each latch rail — span comfortably wider than the mini boxes
// so a label can sit at the edge and so the rails read as global buses.
const RAIL_X_LEFT = 30;
const RAIL_X_RIGHT = 570;
// Connecting wires between NAND1's rail-y and NAND2's rail-y run on the
// far-left side, just inside the SVG (outside both mini boxes).
const RAIL_BUS_X = 30;

export function LevelLatch({ onZoomToGate }: Props) {
  const cycle = useExecution((s) => s.cycle);
  const state = useMemo(() => latchStateFor(cycle), [cycle]);
  // Shared hover-state pattern (see connectedHover.ts). Same hook will
  // power the DFF→latch and any future register→DFF hover-swap.
  const { hovered: hoveredNand, enter: enterNand, leaveIf: leaveNand } =
    useHoveredChild<'nand-1' | 'nand-2'>();

  const sColor = wireColor(state.sBar);
  const rColor = wireColor(state.rBar);
  const qColor = wireColor(state.Q);
  const qbColor = wireColor(state.qBar);

  return (
    <div style={containerStyle} data-testid="latch-scene">
      <svg
        viewBox="0 0 600 400"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%' }}
      >
        {/* ===== Supply rails ===== Vdd and GND horizontal buses live at
            the SAME y as each NAND mini's internal Vdd/GND rail, so the
            latch rail visually CONTINUES the mini's rail (no gap, no
            T-junction stub). Two rails per supply because NAND1 and
            NAND2 are at different y's; a vertical bus on the left side
            connects each pair. */}
        <line x1={RAIL_X_LEFT} y1={NAND1_VDD_Y} x2={RAIL_X_RIGHT} y2={NAND1_VDD_Y} stroke={NET_HIGH} strokeWidth={2.5} data-testid="latch-vdd-rail-1" />
        <line x1={RAIL_X_LEFT} y1={NAND2_VDD_Y} x2={RAIL_X_RIGHT} y2={NAND2_VDD_Y} stroke={NET_HIGH} strokeWidth={2.5} data-testid="latch-vdd-rail-2" />
        <line x1={RAIL_BUS_X} y1={NAND1_VDD_Y} x2={RAIL_BUS_X} y2={NAND2_VDD_Y} stroke={NET_HIGH} strokeWidth={2.5} data-testid="latch-vdd-bus" />
        <line x1={RAIL_X_LEFT} y1={NAND1_GND_Y} x2={RAIL_X_RIGHT} y2={NAND1_GND_Y} stroke={parchment.ink} strokeWidth={2.5} data-testid="latch-gnd-rail-1" />
        <line x1={RAIL_X_LEFT} y1={NAND2_GND_Y} x2={RAIL_X_RIGHT} y2={NAND2_GND_Y} stroke={parchment.ink} strokeWidth={2.5} data-testid="latch-gnd-rail-2" />
        <line x1={RAIL_BUS_X} y1={NAND1_GND_Y} x2={RAIL_BUS_X} y2={NAND2_GND_Y} stroke={parchment.ink} strokeWidth={2.5} data-testid="latch-gnd-bus" />
        {/* Supply rail labels at the right edge of the latch */}
        <text x={RAIL_X_RIGHT + 4} y={NAND1_VDD_Y + 4} fontSize={11} fontWeight={700} fill={NET_HIGH} fontFamily="serif">Vdd</text>
        <text x={RAIL_X_RIGHT + 4} y={NAND2_GND_Y + 4} fontSize={11} fontWeight={700} fill={parchment.ink} fontFamily="serif">GND</text>

        {/* Cross-coupled feedback wires. Both outputs are on the right edge
            of their NAND; both feedback inputs are on the right edge of the
            OTHER NAND. So each feedback wire wraps out to the right, runs
            vertically past, and dips back left into the target NAND's right
            side at the B-input y.  */}

        {/* Q feedback: NAND1's output Q drives NAND2's B-input.
            Wraps out past the right edge of NAND1's mini, drops down past
            NAND2's mini, and re-enters at NAND2's B terminal. */}
        <polyline
          data-testid="wire-q-feedback"
          points={`${N1_OUT.x},${N1_OUT.y} ${FEEDBACK_Q_X},${N1_OUT.y} ${FEEDBACK_Q_X},${N2_IN_Q.y} ${N2_IN_Q.x},${N2_IN_Q.y}`}
          fill="none"
          stroke={qColor}
          strokeWidth={2.5}
        />

        {/* Q̄ feedback: NAND2's output Q̄ drives NAND1's B-input. */}
        <polyline
          data-testid="wire-qbar-feedback"
          points={`${N2_OUT.x},${N2_OUT.y} ${FEEDBACK_QB_X},${N2_OUT.y} ${FEEDBACK_QB_X},${N1_IN_QB.y} ${N1_IN_QB.x},${N1_IN_QB.y}`}
          fill="none"
          stroke={qbColor}
          strokeWidth={2.5}
        />

        {/* Input wires from far left */}
        <polyline
          data-testid="wire-s-bar"
          points={`30,${N1_IN_S.y} ${N1_IN_S.x},${N1_IN_S.y}`}
          fill="none"
          stroke={sColor}
          strokeWidth={2.5}
        />
        <polyline
          data-testid="wire-r-bar"
          points={`30,${N2_IN_R.y} ${N2_IN_R.x},${N2_IN_R.y}`}
          fill="none"
          stroke={rColor}
          strokeWidth={2.5}
        />

        {/* Output wires going to Q / Q̄ chips */}
        <polyline
          data-testid="wire-q-out"
          points={`${N1_OUT.x},${N1_OUT.y} 540,${N1_OUT.y}`}
          fill="none"
          stroke={qColor}
          strokeWidth={2.5}
        />
        <polyline
          data-testid="wire-qbar-out"
          points={`${N2_OUT.x},${N2_OUT.y} 540,${N2_OUT.y}`}
          fill="none"
          stroke={qbColor}
          strokeWidth={2.5}
        />

        {/* NAND symbols. Hover → swap the simple D-shape for a
            ConnectedNand whose A/B/Y terminals literally sit on the latch
            wires (S̄/R̄/Q/Q̄). The internals — 4 CMOS transistors + supply
            rails + electron pulses on the active branch — mirror the same
            level-1 hover style. Same nitty-gritty details, one layer up. */}
        {hoveredNand === 'nand-1' ? (
          <MiniNandView
            cx={NAND1_CX}
            cy={NAND1_CY}
            w={240}
            h={140}
            a={state.sBar}
            b={state.qBar}
            netA={NAND_CONNECTIONS['nand-1'].netA}
            netB={NAND_CONNECTIONS['nand-1'].netB}
            netY={NAND_CONNECTIONS['nand-1'].netY}
            inputA={NAND_CONNECTIONS['nand-1'].inputA}
            inputB={NAND_CONNECTIONS['nand-1'].inputB}
            output={NAND_CONNECTIONS['nand-1'].output}
            testid="nand-1-detailed"
          />
        ) : (
          <NandSymbol
            cx={NAND1_CX}
            cy={NAND1_CY}
            label="NAND1"
            subtitle="S̄ + Q̄ → Q"
          />
        )}
        {hoveredNand === 'nand-2' ? (
          <MiniNandView
            cx={NAND2_CX}
            cy={NAND2_CY}
            w={240}
            h={140}
            a={state.rBar}
            b={state.Q}
            netA={NAND_CONNECTIONS['nand-2'].netA}
            netB={NAND_CONNECTIONS['nand-2'].netB}
            netY={NAND_CONNECTIONS['nand-2'].netY}
            inputA={NAND_CONNECTIONS['nand-2'].inputA}
            inputB={NAND_CONNECTIONS['nand-2'].inputB}
            output={NAND_CONNECTIONS['nand-2'].output}
            testid="nand-2-detailed"
          />
        ) : (
          <NandSymbol
            cx={NAND2_CX}
            cy={NAND2_CY}
            label="NAND2"
            subtitle="R̄ + Q → Q̄"
          />
        )}
        {/* Click + hover hit areas — invisible, sit on top of either
            visual variant so the swap doesn't break the gesture. */}
        <NandHitArea
          cx={NAND1_CX}
          cy={NAND1_CY}
          testid="nand-1"
          onClick={() => onZoomToGate('nand-1')}
          onEnter={() => enterNand('nand-1')}
          onLeave={() => leaveNand('nand-1')}
        />
        <NandHitArea
          cx={NAND2_CX}
          cy={NAND2_CY}
          testid="nand-2"
          onClick={() => onZoomToGate('nand-2')}
          onEnter={() => enterNand('nand-2')}
          onLeave={() => leaveNand('nand-2')}
        />

        {/* Input labels (left) */}
        <InputLabel x={20} y={N1_IN_S.y} text="S̄" value={state.sBar} testid="input-s-bar" />
        <InputLabel x={20} y={N2_IN_R.y} text="R̄" value={state.rBar} testid="input-r-bar" />

        {/* Output labels (right) */}
        <OutputLabel x={555} y={N1_OUT.y} text="Q" value={state.Q} testid="output-q" />
        <OutputLabel x={555} y={N2_OUT.y} text="Q̄" value={state.qBar} testid="output-qbar" />
      </svg>
    </div>
  );
}

interface NandProps {
  cx: number;
  cy: number;
  label: string;
  subtitle: string;
}

function NandSymbol({ cx, cy, label, subtitle }: NandProps) {
  // D-shape sized to match the mini's 240×140 footprint so wire endpoints
  // (S̄/Q̄ on left+right, Q on right) align with the visible body in BOTH
  // states — simple symbol and mini-with-real-gate. Inputs at cy-27 and
  // (right side) cy-27; output at cy-9 on the right.
  const W = 240;
  const H = 140;
  const halfW = W / 2;
  const halfH = H / 2;
  const arcR = halfH;
  // D: rectangle from (cx-halfW, cy-halfH) extending right to where the arc
  // takes over, then semicircle to the right tip at (cx+halfW, cy), back to
  // the bottom-left corner.
  const arcStartX = cx + halfW - arcR;
  const path = `M ${cx - halfW} ${cy - halfH} L ${arcStartX} ${cy - halfH} A ${arcR} ${arcR} 0 0 1 ${arcStartX} ${cy + halfH} L ${cx - halfW} ${cy + halfH} Z`;
  return (
    <g>
      <path d={path} fill={parchment.bgDeep} stroke={parchment.ink} strokeWidth={2} />
      {/* Output bubble at the arc tip (right of body) */}
      <circle cx={cx + halfW + 5} cy={cy - 9} r={4} fill={parchment.bg} stroke={parchment.ink} strokeWidth={2} />
      <text x={cx - 30} y={cy + 4} textAnchor="middle" fontSize={20} fontWeight={700} fill={parchment.ink} fontFamily="serif">
        {label}
      </text>
      <text x={cx - 30} y={cy + 24} textAnchor="middle" fontSize={11} fill={parchment.inkSoft} fontStyle="italic" fontFamily="serif">
        {subtitle}
      </text>
    </g>
  );
}

// Invisible hover/click hit area sized to cover both NandSymbol and MiniNand
// footprints. Sits on top so swapping the visual underneath doesn't pop the
// hover state.
function NandHitArea({
  cx, cy, testid, onClick, onEnter, onLeave,
}: { cx: number; cy: number; testid: string; onClick: () => void; onEnter: () => void; onLeave: () => void }) {
  return (
    <rect
      data-testid={testid}
      x={cx - 120}
      y={cy - 70}
      width={245}
      height={140}
      fill="transparent"
      stroke="none"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: 'pointer' }}
    />
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

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  background: parchment.bg,
  overflow: 'hidden',
};
