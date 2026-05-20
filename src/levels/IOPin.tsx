// IOPin — STANDARD I/O symbol used at every SVG level. A circle around
// the pin name, with the current logical value displayed below it. The
// border color reflects the wire's logic level (HIGH = orange, LOW = ink).
//
// Use everywhere a named signal enters or exits a level: input pins
// (D, CLK, S̄, R̄) and output pins (Q, Q̄). One component → identical
// look across the whole stack.

import { parchment } from './parchment';
import { UI } from './ui_tokens';

type Bit = 0 | 1;

interface Props {
  /** Center of the pin in parent SVG coords. */
  cx: number;
  cy: number;
  /** The pin name shown inside the circle (e.g. "D", "CLK", "Q", "Q̄", "S̄"). */
  label: string;
  /** Current logical value, displayed BELOW the circle as "= 0" / "= 1". */
  value: Bit;
  /** Optional override for label color (defaults to wire-color from value). */
  labelColor?: string;
  testid?: string;
}

export function IOPin({ cx, cy, label, value, labelColor, testid }: Props) {
  const wireColor = value === 1 ? UI.NET_HIGH : UI.NET_LOW;
  const fill = labelColor ?? parchment.ink;
  return (
    <g data-testid={testid}>
      <circle
        cx={cx}
        cy={cy}
        r={UI.PIN_RADIUS}
        fill={parchment.bg}
        stroke={wireColor}
        strokeWidth={UI.PIN_STROKE}
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fontSize={UI.PIN_LABEL_SIZE}
        fontWeight={700}
        fill={fill}
        fontFamily="serif"
      >
        {label}
      </text>
      <text
        x={cx}
        y={cy + UI.PIN_RADIUS + 12}
        textAnchor="middle"
        fontSize={UI.PIN_VALUE_SIZE}
        fill={wireColor}
        fontFamily="serif"
        data-testid={testid ? `${testid}-value` : undefined}
      >
        = {value}
      </text>
    </g>
  );
}
