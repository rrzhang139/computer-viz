// Term — wraps a technical term with a hover tooltip showing its definition.
// Two usages:
//   <Term name="RAM">RAM</Term>                  // explicit
//   <TermText>The TLB caches recent translations.</TermText>  // auto-detect
//
// Auto-detect scans for known terms (longest-first, word-boundary) and wraps
// each match. Same term repeated in one block highlights only the first.

import { Fragment, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { dictionary, lookupTerm, termPattern, type TermDef } from '../data/dictionary';
import { colors } from '../ui_tokens';

const tipStyle = {
  position: 'absolute',
  bottom: 'calc(100% + 6px)',
  left: 0,
  zIndex: 100,
  background: '#1a1f26',
  border: `1px solid ${colors.edge}`,
  borderRadius: 4,
  padding: '8px 10px',
  width: 280,
  fontSize: 12,
  lineHeight: 1.45,
  color: colors.fg,
  boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
} as const;

const termStyle = {
  borderBottom: `1px dashed ${colors.data}`,
  cursor: 'help',
  position: 'relative',
  display: 'inline-block',
  color: 'inherit',
} as const;

function Tooltip({ def }: { def: TermDef }) {
  return (
    <span style={tipStyle as React.CSSProperties}>
      <strong style={{ color: colors.data }}>{def.name}</strong>
      {def.unit && (
        <span style={{ color: colors.edge, marginLeft: 6 }}>
          ({def.unit.scientific})
        </span>
      )}
      <br />
      <span>{def.definition}</span>
      {def.related && def.related.length > 0 && (
        <>
          <br />
          <span style={{ color: colors.edge, fontSize: 11 }}>
            related: {def.related.join(', ')}
          </span>
        </>
      )}
    </span>
  );
}

export function Term({ name, children }: { name: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const def = dictionary[name] ?? lookupTerm(name);
  if (!def) return <>{children ?? name}</>;

  return (
    <span
      style={termStyle as React.CSSProperties}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children ?? name}
      {open && <Tooltip def={def} />}
    </span>
  );
}

export function TermText({ children }: { children: string }) {
  const segments = useMemo(() => {
    const text = children;
    const matches = [...text.matchAll(termPattern)];
    if (matches.length === 0) return [{ kind: 'text' as const, value: text }];

    const out: ({ kind: 'text'; value: string } | { kind: 'term'; value: string })[] = [];
    let cursor = 0;
    const seenLower = new Set<string>();
    for (const m of matches) {
      const start = m.index!;
      if (start > cursor) out.push({ kind: 'text', value: text.slice(cursor, start) });
      const matched = m[1];
      const k = matched.toLowerCase();
      if (seenLower.has(k)) {
        out.push({ kind: 'text', value: matched });
      } else {
        seenLower.add(k);
        out.push({ kind: 'term', value: matched });
      }
      cursor = start + matched.length;
    }
    if (cursor < text.length) out.push({ kind: 'text', value: text.slice(cursor) });
    return out;
  }, [children]);

  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === 'term' ? (
          <Term key={i} name={seg.value}>{seg.value}</Term>
        ) : (
          <Fragment key={i}>{seg.value}</Fragment>
        )
      )}
    </>
  );
}
