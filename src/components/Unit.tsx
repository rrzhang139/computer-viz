// Unit — renders a numeric value with its unit and a tooltip explaining what
// the unit means + a relative anchor (e.g. "1 ns = ~30 cm of light").
//
// Use sparingly. INVARIANTS rule: prefer relative comparisons ("100× slower
// than L1") over raw absolute units ("100 ns") when the absolute value adds
// no intuition. When you DO use a unit, route it through this component.

import { useState } from 'react';
import { dictionary } from '../data/dictionary';
import { colors } from '../ui_tokens';

const wrapStyle = {
  borderBottom: `1px dotted ${colors.control}`,
  cursor: 'help',
  position: 'relative',
  display: 'inline-block',
  fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace',
} as const;

const tipStyle = {
  position: 'absolute',
  bottom: 'calc(100% + 6px)',
  left: 0,
  zIndex: 100,
  background: '#1a1f26',
  border: `1px solid ${colors.edge}`,
  borderRadius: 4,
  padding: '8px 10px',
  width: 240,
  fontSize: 12,
  lineHeight: 1.45,
  color: colors.fg,
  boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
  fontFamily: 'inherit',
} as const;

type UnitName = 'ps' | 'ns' | 'µs' | 'us' | 'ms' | 's' | 'cycle' | 'instr' | 'B' | 'KB' | 'MB' | 'GB' | 'bit';

const fallbacks: Partial<Record<UnitName, { long: string; sci: string; anchor?: string }>> = {
  s: { long: 'second', sci: 's', anchor: 'human reaction time ~200 ms' },
  instr: { long: 'instruction', sci: '1 instr', anchor: 'modern CPU retires ~3 instrs/cycle' },
  B: { long: 'byte', sci: '8 bits' },
  KB: { long: 'kilobyte', sci: '10³ bytes', anchor: '1 KB ≈ a few sentences of text' },
  MB: { long: 'megabyte', sci: '10⁶ bytes', anchor: '1 MB ≈ a high-res photo' },
  GB: { long: 'gigabyte', sci: '10⁹ bytes', anchor: '1 GB ≈ ~250 songs' },
  bit: { long: 'bit', sci: 'one binary digit' },
};

export function Unit({ value, unit }: { value: number | string; unit: UnitName }) {
  const [open, setOpen] = useState(false);
  const dictKey = unit === 'us' ? 'µs' : unit;
  const def = dictionary[dictKey];
  const fallback = fallbacks[unit];
  const long = def?.unit?.longName ?? fallback?.long ?? unit;
  const sci = def?.unit?.scientific ?? fallback?.sci ?? '';
  const anchor = def?.unit?.anchor ?? fallback?.anchor;
  const definition = def?.definition;

  return (
    <span
      style={wrapStyle as React.CSSProperties}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      tabIndex={0}
    >
      {value} {unit}
      {open && (
        <span style={tipStyle as React.CSSProperties}>
          <strong style={{ color: colors.control }}>{long}</strong>
          {sci && <span style={{ color: colors.edge, marginLeft: 6 }}>({sci})</span>}
          {definition && (
            <>
              <br />
              <span>{definition}</span>
            </>
          )}
          {anchor && !definition && (
            <>
              <br />
              <span style={{ color: colors.edge }}>anchor: {anchor}</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
