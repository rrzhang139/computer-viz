// MiniNandView — thin wrapper that adapts the generic GATE_MODULE.renderMini
// to the latch's specific need to overlay parent-net labels (S̄/Q̄/Q etc.)
// and per-transistor anchors for e2e tests.
//
// All projection / transform / geometry lives in GATE_MODULE. Anything
// here is presentation glue specific to the latch's view of a NAND.

import { parchment } from './parchment';
import type { Point2 } from './nandConnections';
import { GATE_MODULE } from './gateModule';

type Bit = 0 | 1;

interface Props {
  cx: number;
  cy: number;
  w: number;
  h: number;
  a: Bit;
  b: Bit;
  netA: string;
  netB: string;
  netY: string;
  inputA: Point2;
  inputB: Point2;
  output: Point2;
  testid: string;
}

export function MiniNandView({
  cx, cy, w, h, a, b, netA, netB, netY, inputA, inputB, output, testid,
}: Props) {
  const y: Bit = a === 1 && b === 1 ? 0 : 1;
  const left = cx - w / 2;
  const top = cy - h / 2;
  const right = cx + w / 2;
  const bottom = cy + h / 2;

  const yColor = y === 1 ? parchment.gateOn : '#5c4438';
  const aColor = a === 1 ? parchment.gateOn : '#5c4438';
  const bColor = b === 1 ? parchment.gateOn : '#5c4438';

  return (
    // Outer wrapper has NO testid (just grouping). The canonical
    // `${testid}` element is the mini box itself, rendered by
    // GATE_MODULE.renderMini below — so existing tests that locate
    // `nand-1-detailed` and then look for `nand-1-detailed-scene`
    // inside continue to work.
    <g>
      {GATE_MODULE.renderMini({
        cx, cy, w, h,
        inputs: { A: a, B: b, Y: y },
        testid,
        frameStroke: `${parchment.ink}40`,
      })}

      {/* Parent-net labels at the latch endpoints. */}
      <text x={inputA.x - 4} y={inputA.y - 4} fontSize={11} fontWeight={700} fill={aColor} fontFamily="serif" textAnchor="end" data-testid={`${testid}-net-a`}>
        {netA}
      </text>
      <text x={inputB.x + 4} y={inputB.y - 4} fontSize={11} fontWeight={700} fill={bColor} fontFamily="serif" data-testid={`${testid}-net-b`}>
        {netB}
      </text>
      <text x={output.x + 6} y={output.y + 4} fontSize={11} fontWeight={700} fill={yColor} fontFamily="serif" data-testid={`${testid}-net-y`}>
        {netY}
      </text>

      {/* Per-transistor invisible anchors so the e2e contract still finds
          `${testid}-pmos-a` etc. The actual transistor meshes live inside
          the SVG scene; these stub rects are the locatable handles. */}
      <rect data-testid={`${testid}-pmos-a`} x={left + 4}  y={top + 6}     width={3} height={3} fill="transparent" />
      <rect data-testid={`${testid}-pmos-b`} x={right - 7} y={top + 6}     width={3} height={3} fill="transparent" />
      <rect data-testid={`${testid}-nmos-a`} x={cx - 1.5}  y={cy}          width={3} height={3} fill="transparent" />
      <rect data-testid={`${testid}-nmos-b`} x={cx - 1.5}  y={bottom - 10} width={3} height={3} fill="transparent" />
    </g>
  );
}
