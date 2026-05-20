// NandSceneSvg — pure-SVG rendering of the gate scene.
//
// Reads the SAME data as the 3D LevelGate scene (WIRES from nandWireGraph,
// transistor positions, the same color palette, the same flowWhen
// predicates) but renders as native SVG primitives so it composes cleanly
// inside the parent latch's SVG. This sidesteps the foreignObject+Canvas
// resize quirks that caused the mini to clip the scene at larger viewports.
//
// Coordinate convention: this component renders in WORLD coords (matching
// nandWireGraph's WIRE_NODES table). The PARENT is expected to wrap it in
// a <g transform="translate(...) scale(s, -s)"> that maps world → parent
// SVG coords. The negative y-scale flips world-Y (up) to SVG-Y (down). To
// avoid mirrored text, every <text> is wrapped in `<g transform="scale(1,-1)">`
// at the text's anchor point so it renders right-side-up.
//
// Animations: electron pulses use SVG <animateMotion> along a hidden
// <path> matching the wire's polyline. No JS frame loop required.

import { parchment } from './parchment';
import { TRANSISTOR_ROLE, TRANSISTOR_TYPE, LOGIC, SUPPLY, type TransistorRole } from './symbols';
import { WIRES, wirePoints, type Inputs } from './nandWireGraph';

const NET_HIGH = parchment.gateOn;
const NET_LOW = '#5c4438';
const RAIL_VDD = parchment.gateOn;
const RAIL_GND = parchment.ink;
const PULSE_COLOR = parchment.electronGlow;

interface TransistorSpec {
  role: TransistorRole;
  kind: typeof TRANSISTOR_TYPE.PMOS | typeof TRANSISTOR_TYPE.NMOS;
  input: typeof LOGIC.A | typeof LOGIC.B;
  x: number;
  y: number;
}

const TRANSISTORS: readonly TransistorSpec[] = [
  { role: TRANSISTOR_ROLE.P_A, kind: TRANSISTOR_TYPE.PMOS, input: LOGIC.A, x: -1.6, y: 1.5 },
  { role: TRANSISTOR_ROLE.P_B, kind: TRANSISTOR_TYPE.PMOS, input: LOGIC.B, x:  1.6, y: 1.5 },
  { role: TRANSISTOR_ROLE.N_A, kind: TRANSISTOR_TYPE.NMOS, input: LOGIC.A, x:  0,   y: -0.6 },
  { role: TRANSISTOR_ROLE.N_B, kind: TRANSISTOR_TYPE.NMOS, input: LOGIC.B, x:  0,   y: -2.4 },
];

function isOn(t: TransistorSpec, inputs: Inputs): boolean {
  const v = inputs[t.input];
  return t.kind === TRANSISTOR_TYPE.PMOS ? v === 0 : v === 1;
}

function netColor(net: string, inputs: Inputs): string {
  switch (net) {
    case SUPPLY.Vdd: return RAIL_VDD;
    case SUPPLY.GND: return RAIL_GND;
    case LOGIC.A: return inputs.A === 1 ? NET_HIGH : NET_LOW;
    case LOGIC.B: return inputs.B === 1 ? NET_HIGH : NET_LOW;
    case LOGIC.Y: return inputs.Y === 1 ? NET_HIGH : NET_LOW;
    case 'mid': return inputs.A === 1 && inputs.B === 1 ? RAIL_GND : NET_LOW;
    default: return NET_LOW;
  }
}

// Build an SVG path from a polyline. Used as the animateMotion track.
function polyToPath(pts: [number, number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

interface Props {
  inputs: Inputs;
  /** Multiplier applied to text font sizes (after the parent's world→svg
   * scale flip). Lets the embedding parent control text legibility. */
  textScale?: number;
  testid?: string;
}

export function NandSceneSvg({ inputs, textScale = 1, testid }: Props) {
  return (
    <g data-testid={testid}>
      {/* Wires + electron pulses */}
      {WIRES.map((w, i) => {
        const pts = wirePoints(w);
        const ptsStr = pts.map((p) => `${p[0]},${p[1]}`).join(' ');
        const color = netColor(w.net, inputs);
        const flowing = w.flowWhen?.(inputs) ?? false;
        const pathId = `${testid ?? 'nand-svg'}-wire-${i}`;
        return (
          <g key={i}>
            <polyline points={ptsStr} fill="none" stroke={color} strokeWidth={0.06} />
            {flowing && (
              <>
                <defs>
                  <path id={pathId} d={polyToPath(pts)} />
                </defs>
                <circle r={0.13} fill={PULSE_COLOR}>
                  <animateMotion dur="1.4s" repeatCount="indefinite">
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              </>
            )}
          </g>
        );
      })}

      {/* Transistors. Each is a small rectangle with role/state labels.
          Body color = parchment.bgDeep (same as the latch's NAND body fill) so
          the gate's transistor symbols read as the same visual family as
          the NAND symbol they live inside. */}
      {TRANSISTORS.map((t) => {
        const on = isOn(t, inputs);
        const bodyFill = parchment.bgDeep;
        const fs = textScale;
        return (
          <g key={t.role} transform={`translate(${t.x}, ${t.y})`}>
            {/* Body slab */}
            <rect
              x={-0.35}
              y={-0.25}
              width={0.7}
              height={0.5}
              fill={bodyFill}
              stroke={parchment.ink}
              strokeWidth={0.02}
              opacity={on ? 1 : 0.85}
            />
            {/* Gate stub */}
            <rect
              x={t.kind === TRANSISTOR_TYPE.PMOS && t.x < 0 ? -0.55 : 0.36}
              y={-0.05}
              width={0.2}
              height={0.1}
              fill={parchment.gate}
            />
            {/* Glow channel when conducting */}
            {on && (
              <rect
                x={-0.04}
                y={-0.2}
                width={0.08}
                height={0.4}
                fill={PULSE_COLOR}
                opacity={0.6}
              >
                <animate attributeName="opacity" values="0.35;0.85;0.35" dur="1.1s" repeatCount="indefinite" />
              </rect>
            )}

            {/* Role label centered INSIDE the body. Each <text> is wrapped
                in scale(1, -1) so it renders right-side-up despite the
                parent's negative-y scale flipping the world Y axis. */}
            <g transform={`translate(0, ${0.05}) scale(1, -1)`}>
              <text
                fontSize={0.18 * fs}
                fill={parchment.ink}
                textAnchor="middle"
                fontFamily="serif"
                fontWeight={700}
              >
                {t.role}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
