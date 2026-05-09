// LevelSummary — bottom-left card on every level. Answers four questions in
// labeled rows so a learner can ground themselves without reading prose:
//   WHAT  — what is this thing (one short sentence)
//   WHY   — why does it exist; why do we care
//   IN    — where do its inputs come from
//   OUT   — where does its output go and how is it transformed
//
// One source of truth per level/variant in `descriptions.ts`.

import type { CSSProperties } from 'react';
import type { LevelSummary as LevelSummaryData } from './descriptions';
import { parchment } from './parchment';

interface Props {
  summary: LevelSummaryData;
  testid?: string;
}

export function LevelSummary({ summary, testid = 'level-summary' }: Props) {
  return (
    <div data-testid={testid} style={cardStyle}>
      <div style={headerStyle}>summary</div>
      <Row label="WHAT" text={summary.what} testid={`${testid}-what`} />
      <Row label="WHY" text={summary.why} testid={`${testid}-why`} />
      <Row label="IN" text={summary.inputs} testid={`${testid}-in`} />
      <Row label="OUT" text={summary.outputs} testid={`${testid}-out`} />
    </div>
  );
}

function Row({ label, text, testid }: { label: string; text: string; testid: string }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={textStyle} data-testid={testid}>{text}</span>
    </div>
  );
}

const cardStyle: CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: 12,
  width: 280,
  padding: '8px 10px',
  background: 'rgba(241,231,205,0.95)',
  border: `1px solid ${parchment.rule}`,
  borderRadius: 6,
};

const headerStyle: CSSProperties = {
  color: parchment.inkSoft,
  fontSize: 9,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 4,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 4,
  alignItems: 'flex-start',
};

const labelStyle: CSSProperties = {
  color: parchment.gateOn,
  fontSize: 9,
  fontWeight: 700,
  width: 28,
  paddingTop: 2,
  letterSpacing: 0.5,
  flexShrink: 0,
};

const textStyle: CSSProperties = {
  color: parchment.ink,
  fontSize: 11,
  lineHeight: 1.45,
  flex: 1,
};
