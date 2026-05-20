// PinDot — small filled circle marking a connection point. Standard EE
// schematic convention for "this is wired, not a loose end." Same shape
// is used for T-junctions inside a wire and for external pin terminals.
//
// Use everywhere a wire MEETS another wire, a pillar, or a chip — so
// the user can visually confirm "connected" without inspecting pixel
// alignment.

import { parchment } from './parchment';

interface Props {
  cx: number;
  cy: number;
  /** Wire color this dot belongs to (matches the wire's stroke). */
  fill?: string;
  /** Pin radius in SVG units. Default 3 — small enough to not clutter
   * the diagram, big enough to be clearly visible. */
  r?: number;
  testid?: string;
}

export function PinDot({ cx, cy, fill = parchment.ink, r = 3, testid }: Props) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      stroke={parchment.bg}
      strokeWidth={0.5}
      data-testid={testid}
    />
  );
}
