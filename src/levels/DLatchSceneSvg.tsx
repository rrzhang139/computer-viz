// DLatchSceneSvg — pure-SVG renderer of the D latch (4-NAND + inverter).
// Renders at world coords; parent wraps in transform + y-flip.

import { parchment } from './parchment';
import { WIRES, WIRE_NODES, wirePoints, type Inputs } from './dLatchWireGraph';
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
    case LOGIC.D: return inputs.d === 1 ? NET_HIGH : NET_LOW;
    case 'D_bar': return inputs.d === 0 ? NET_HIGH : NET_LOW;
    case LOGIC.EN: return inputs.en === 1 ? NET_HIGH : NET_LOW;
    case 'S_bar': return !(inputs.d === 1 && inputs.en === 1) ? NET_HIGH : NET_LOW;
    case 'R_bar': return !(inputs.d === 0 && inputs.en === 1) ? NET_HIGH : NET_LOW;
    case LOGIC.Q: return inputs.q === 1 ? NET_HIGH : NET_LOW;
    case LOGIC.Qbar: return inputs.qBar === 1 ? NET_HIGH : NET_LOW;
    default: return NET_LOW;
  }
}

function polyToPath(pts: [number, number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

function NandSymbol({ cx, cy, w, h, label, testid }: { cx: number; cy: number; w: number; h: number; label: string; testid?: string }) {
  const halfW = w / 2;
  const halfH = h / 2;
  const arcStartX = cx + halfW - halfH;
  const d = `M ${cx - halfW} ${cy - halfH} L ${arcStartX} ${cy - halfH} A ${halfH} ${halfH} 0 0 1 ${arcStartX} ${cy + halfH} L ${cx - halfW} ${cy + halfH} Z`;
  return (
    <g data-testid={testid}>
      <path d={d} fill={parchment.bgDeep} stroke={parchment.ink} strokeWidth={0.04} />
      <circle cx={cx + halfW + 0.08} cy={cy} r={0.08} fill={parchment.bg} stroke={parchment.ink} strokeWidth={0.04} />
      <g transform={`translate(${cx - 0.15}, ${cy}) scale(1, -1)`}>
        <text fontSize={0.22} fill={parchment.ink} textAnchor="middle" fontFamily="serif" fontWeight={700} dy={0.08}>
          {label}
        </text>
      </g>
    </g>
  );
}

function InverterTriangle({ cx, cy, w, h, testid }: { cx: number; cy: number; w: number; h: number; testid?: string }) {
  const halfW = w / 2;
  const halfH = h / 2;
  const d = `M ${cx - halfW} ${cy - halfH} L ${cx + halfW - 0.1} ${cy} L ${cx - halfW} ${cy + halfH} Z`;
  return (
    <g data-testid={testid}>
      <path d={d} fill={parchment.bgDeep} stroke={parchment.ink} strokeWidth={0.04} />
      <circle cx={cx + halfW} cy={cy} r={0.08} fill={parchment.bg} stroke={parchment.ink} strokeWidth={0.04} />
    </g>
  );
}

interface Props {
  inputs: Inputs;
  testid?: string;
  /** When true (rendered inside a parent that provides its own Vdd/GND
   * pillars), suppress internal rail labels to avoid duplication. */
  embedded?: boolean;
}

export function DLatchSceneSvg({ inputs, testid, embedded = false }: Props) {
  return (
    <g data-testid={testid}>
      {/* Wires + electron pulses */}
      {WIRES.map((w, i) => {
        const pts = wirePoints(w);
        const ptsStr = pts.map((p) => `${p[0]},${p[1]}`).join(' ');
        const color = netColor(w.net, inputs);
        const flowing = w.flowWhen?.(inputs) ?? false;
        const pathId = `${testid ?? 'dlatch-svg'}-wire-${i}`;
        return (
          <g key={i}>
            <polyline points={ptsStr} fill="none" stroke={color} strokeWidth={0.08} />
            {flowing && (
              <>
                <defs>
                  <path id={pathId} d={polyToPath(pts)} />
                </defs>
                <circle r={0.15} fill={PULSE_COLOR}>
                  <animateMotion dur="1.4s" repeatCount="indefinite">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              </>
            )}
          </g>
        );
      })}

      {/* D-inverter */}
      <InverterTriangle cx={-4.5} cy={0} w={1.0} h={0.7} testid={`${testid}-inv`} />

      {/* 4 NANDs: 2 gating (left) + 2 SR-core (right) */}
      <NandSymbol cx={-2.5} cy={1.0} w={2.0} h={1.2} label="NS" testid={`${testid}-nand-gs`} />
      <NandSymbol cx={-2.5} cy={-1.0} w={2.0} h={1.2} label="NR" testid={`${testid}-nand-gr`} />
      <NandSymbol cx={2.0} cy={1.5} w={2.0} h={1.6} label="N1" testid={`${testid}-nand-1`} />
      <NandSymbol cx={2.0} cy={-1.5} w={2.0} h={1.6} label="N2" testid={`${testid}-nand-2`} />

      {/* Rail labels at the right edge — suppressed when embedded so we
          don't duplicate the parent's own Vdd/GND pillar labels. */}
      {!embedded && (
        <>
          <g transform={`translate(${WIRE_NODES.Vdd_right[0] - 0.2}, ${WIRE_NODES.Vdd_right[1] + 0.05}) scale(1, -1)`}>
            <text fontSize={0.3} fill={RAIL_VDD} textAnchor="end" fontFamily="serif" fontWeight={700}>Vdd</text>
          </g>
          <g transform={`translate(${WIRE_NODES.GND_right[0] - 0.2}, ${WIRE_NODES.GND_right[1] - 0.25}) scale(1, -1)`}>
            <text fontSize={0.3} fill={RAIL_GND} textAnchor="end" fontFamily="serif" fontWeight={700}>GND</text>
          </g>
        </>
      )}

      {/* Signal labels — D, EN, Q, Q̄ at external terminals. Suppressed
          when embedded; the parent Level<X>.tsx draws standardized
          <IOPin> circles around the scene instead. */}
      {!embedded && (
        <>
          <g transform={`translate(${WIRE_NODES.D_in[0] + 0.35}, ${WIRE_NODES.D_in[1] + 0.1}) scale(1, -1)`}>
            <text fontSize={0.35} fill={netColor(LOGIC.D, inputs)} textAnchor="start" fontFamily="serif" fontWeight={700}>D</text>
          </g>
          <g transform={`translate(${WIRE_NODES.EN_in[0]}, ${WIRE_NODES.EN_in[1] - 0.2}) scale(1, -1)`}>
            <text fontSize={0.3} fill={netColor(LOGIC.EN, inputs)} textAnchor="middle" fontFamily="serif" fontWeight={700}>EN</text>
          </g>
          <g transform={`translate(${WIRE_NODES.Q_out[0] - 0.35}, ${WIRE_NODES.Q_out[1] + 0.1}) scale(1, -1)`}>
            <text fontSize={0.35} fill={netColor(LOGIC.Q, inputs)} textAnchor="end" fontFamily="serif" fontWeight={700}>Q</text>
          </g>
          <g transform={`translate(${WIRE_NODES.QB_out[0] - 0.35}, ${WIRE_NODES.QB_out[1] + 0.1}) scale(1, -1)`}>
            <text fontSize={0.35} fill={netColor(LOGIC.Qbar, inputs)} textAnchor="end" fontFamily="serif" fontWeight={700}>Q̄</text>
          </g>
        </>
      )}
    </g>
  );
}
