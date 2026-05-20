// LatchSceneSvg — pure-SVG renderer of the SR latch, matching the actual
// LevelLatch layout (Vdd top, GND bottom, NAND1 top half, NAND2 bottom
// half, cross-coupled feedback wrapping around the right).
//
// World coords from latchWireGraph. Parent wraps in a transform that maps
// world → parent SVG (typically with y-flip). Text elements wrap in a
// local scale(1,-1) so they read right-side-up despite the flip.

import { parchment } from './parchment';
import { WIRES, WIRE_NODES, wirePoints, type Inputs } from './latchWireGraph';
import { SUPPLY, LOGIC } from './symbols';

const NET_HIGH = parchment.gateOn;
const NET_LOW = '#5c4438';
const RAIL_VDD = parchment.gateOn;
const RAIL_GND = parchment.ink;
const PULSE_COLOR = parchment.electronGlow;

function netColor(net: string, inputs: Inputs): string {
  switch (net) {
    case SUPPLY.Vdd: return RAIL_VDD;
    case SUPPLY.GND: return RAIL_GND;
    case 'S_bar': return inputs.sBar === 1 ? NET_HIGH : NET_LOW;
    case 'R_bar': return inputs.rBar === 1 ? NET_HIGH : NET_LOW;
    case LOGIC.Q: return inputs.q === 1 ? NET_HIGH : NET_LOW;
    case LOGIC.Qbar: return inputs.qBar === 1 ? NET_HIGH : NET_LOW;
    default: return NET_LOW;
  }
}

function polyToPath(pts: [number, number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

function NandSymbol({ cx, cy, w, h, label, testid }: { cx: number; cy: number; w: number; h: number; label: string; testid?: string }) {
  // D-shape with output bubble. Arc radius = halfH (semicircular right side).
  const halfW = w / 2;
  const halfH = h / 2;
  const arcStartX = cx + halfW - halfH;
  const d = `M ${cx - halfW} ${cy - halfH} L ${arcStartX} ${cy - halfH} A ${halfH} ${halfH} 0 0 1 ${arcStartX} ${cy + halfH} L ${cx - halfW} ${cy + halfH} Z`;
  return (
    <g data-testid={testid}>
      <path d={d} fill={parchment.bgDeep} stroke={parchment.ink} strokeWidth={0.05} />
      {/* output NOT bubble */}
      <circle cx={cx + halfW + 0.12} cy={cy} r={0.12} fill={parchment.bg} stroke={parchment.ink} strokeWidth={0.05} />
      {/* Label, y-flipped so it reads right-side up */}
      <g transform={`translate(${cx - 0.2}, ${cy}) scale(1, -1)`}>
        <text fontSize={0.35} fill={parchment.ink} textAnchor="middle" fontFamily="serif" fontWeight={700} dy={0.12}>
          {label}
        </text>
      </g>
    </g>
  );
}

interface Props {
  inputs: Inputs;
  testid?: string;
  /** When true (embedded as a child preview), suppress secondary labels
   * (Vdd / GND rail labels, supply rail signage) that would duplicate
   * the parent's already-visible labels. Signal labels (S̄, R̄, Q, Q̄)
   * stay because they map to parent nets. */
  embedded?: boolean;
}

export function LatchSceneSvg({ inputs, testid, embedded = false }: Props) {
  return (
    <g data-testid={testid}>
      {/* Wires + electron pulses */}
      {WIRES.map((w, i) => {
        const pts = wirePoints(w);
        const ptsStr = pts.map((p) => `${p[0]},${p[1]}`).join(' ');
        const color = netColor(w.net, inputs);
        const flowing = w.flowWhen?.(inputs) ?? false;
        const pathId = `${testid ?? 'latch-svg'}-wire-${i}`;
        return (
          <g key={i}>
            <polyline points={ptsStr} fill="none" stroke={color} strokeWidth={0.1} />
            {flowing && (
              <>
                <defs>
                  <path id={pathId} d={polyToPath(pts)} />
                </defs>
                <circle r={0.18} fill={PULSE_COLOR}>
                  <animateMotion dur="1.4s" repeatCount="indefinite">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              </>
            )}
          </g>
        );
      })}

      {/* NAND symbols — drawn above wires so they cover stubs at terminals. */}
      <NandSymbol cx={0.5} cy={1.5} w={3.5} h={2.0} label="NAND1" testid={`${testid}-nand-1`} />
      <NandSymbol cx={0.5} cy={-1.5} w={3.5} h={2.0} label="NAND2" testid={`${testid}-nand-2`} />

      {/* Rail labels at the right edge — suppressed when embedded so we
          don't duplicate the parent level's own Vdd/GND labels. */}
      {!embedded && (
        <>
          <g transform={`translate(${WIRE_NODES.Vdd_right[0] - 0.2}, ${WIRE_NODES.Vdd_right[1] + 0.05}) scale(1, -1)`}>
            <text fontSize={0.35} fill={RAIL_VDD} textAnchor="end" fontFamily="serif" fontWeight={700}>Vdd</text>
          </g>
          <g transform={`translate(${WIRE_NODES.GND_right[0] - 0.2}, ${WIRE_NODES.GND_right[1] - 0.25}) scale(1, -1)`}>
            <text fontSize={0.35} fill={RAIL_GND} textAnchor="end" fontFamily="serif" fontWeight={700}>GND</text>
          </g>
        </>
      )}

      {/* Signal labels — S̄, R̄, Q, Q̄ at the external terminals so the
          embedding parent's wires meet labeled endpoints. */}
      <g transform={`translate(${WIRE_NODES.S_in[0] + 0.4}, ${WIRE_NODES.S_in[1] + 0.05}) scale(1, -1)`}>
        <text fontSize={0.4} fill={netColor('S_bar', inputs)} textAnchor="start" fontFamily="serif" fontWeight={700}>S̄</text>
      </g>
      <g transform={`translate(${WIRE_NODES.R_in[0] + 0.4}, ${WIRE_NODES.R_in[1] + 0.05}) scale(1, -1)`}>
        <text fontSize={0.4} fill={netColor('R_bar', inputs)} textAnchor="start" fontFamily="serif" fontWeight={700}>R̄</text>
      </g>
      <g transform={`translate(${WIRE_NODES.Q_out[0] - 0.4}, ${WIRE_NODES.Q_out[1] + 0.05}) scale(1, -1)`}>
        <text fontSize={0.4} fill={netColor(LOGIC.Q, inputs)} textAnchor="end" fontFamily="serif" fontWeight={700}>Q</text>
      </g>
      <g transform={`translate(${WIRE_NODES.QB_out[0] - 0.4}, ${WIRE_NODES.QB_out[1] + 0.05}) scale(1, -1)`}>
        <text fontSize={0.4} fill={netColor(LOGIC.Qbar, inputs)} textAnchor="end" fontFamily="serif" fontWeight={700}>Q̄</text>
      </g>
    </g>
  );
}
