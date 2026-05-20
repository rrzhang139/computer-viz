// MiniViews — reduced-scale renderings of the CHILD level inside a parent's
// component footprint. Used as the hover-state visual: instead of opening a
// popover, the parent swaps the simple block IN PLACE for a tiny version of
// the child level using the SAME color palette as if the user had drilled
// in (substrate sepia/teal, doped slate-blue/coral, gate ink-brown).
//
// Conventions:
//   - All MiniXxx are SVG <g> groups positioned by an (x, y) origin.
//   - Color-coding mirrors LevelTransistor.tsx (NMOS_THEME / PMOS_THEME).
//   - No modal/popover chrome; the parent renders these directly inside its
//     own SVG so the visual feels like the block "expanded".

import { parchment } from './parchment';

// Color palette. The transistor-level 3D view gets directional+ambient
// light that brightens the materials by ~30%; flat 2D SVG with the raw
// hex codes reads MUCH duller. We pick a SATURATED palette that reads
// distinctly at hover scale — the PMOS/NMOS distinction must be immediate
// without reading any labels.
const NMOS_SUBSTRATE = '#c8a87a';   // warm sepia (saturated)
const NMOS_DOPED = '#5d7fa8';       // slate-blue (saturated)
const PMOS_SUBSTRATE = '#4ea59a';   // teal (clearly green-blue, NOT gray)
const PMOS_DOPED = '#d4674a';       // coral (saturated)
const POLY_GATE = parchment.gate;   // ink-brown polysilicon

// ── MiniMosfet ────────────────────────────────────────────────────────────
// One transistor at (x,y), w × h footprint. Renders substrate slab + 2
// doped rectangles + gate strip on top. Mirrors the cross-section view
// from LevelTransistor.

interface MiniMosfetProps {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'pmos' | 'nmos';
  testid?: string;
}

export function MiniMosfet({ x, y, w, h, kind, testid }: MiniMosfetProps) {
  const isPmos = kind === 'pmos';
  const substrate = isPmos ? PMOS_SUBSTRATE : NMOS_SUBSTRATE;
  const doped = isPmos ? PMOS_DOPED : NMOS_DOPED;
  const dopedW = w * 0.18;
  const dopedH = h * 0.4;
  const dopedY = y + h * 0.45;
  return (
    <g data-testid={testid}>
      {/* Substrate slab */}
      <rect x={x} y={y} width={w} height={h} rx={2} fill={substrate} stroke={parchment.ink} strokeWidth={0.6} />
      {/* Source (left doped) and drain (right doped) */}
      <rect x={x + w * 0.08} y={dopedY} width={dopedW} height={dopedH} fill={doped} />
      <rect x={x + w - w * 0.08 - dopedW} y={dopedY} width={dopedW} height={dopedH} fill={doped} />
      {/* Polysilicon gate strip on top */}
      <rect x={x + w * 0.32} y={y - 1} width={w * 0.36} height={3} fill={POLY_GATE} />
    </g>
  );
}

// ── MiniNand ──────────────────────────────────────────────────────────────
// 4 MOSFETs (2 PMOS top, 2 NMOS bottom) inside a D-shape outline matching
// the simple NAND symbol's footprint. Same shape, but the inside is no
// longer empty — you see WHAT the NAND is made of.

interface MiniNandProps {
  cx: number;
  cy: number;
  testid?: string;
}

export function MiniNand({ cx, cy, testid }: MiniNandProps) {
  // D-shape (same path as the simple NandSymbol).
  const path = `M ${cx - 40} ${cy - 30} L ${cx + 5} ${cy - 30} A 30 30 0 0 1 ${cx + 5} ${cy + 30} L ${cx - 40} ${cy + 30} Z`;
  // 2x2 grid of mini transistors fits inside the rect part of the D.
  const tw = 18;
  const th = 18;
  const gap = 3;
  const left = cx - 38;
  const top = cy - 26;
  const midX = left + tw + gap;
  const midY = cy - 4;
  return (
    <g data-testid={testid}>
      <path d={path} fill={parchment.bgDeep} stroke={parchment.gateOn} strokeWidth={2.5} />
      <circle cx={cx + 40} cy={cy} r={5} fill={parchment.bg} stroke={parchment.gateOn} strokeWidth={2} />
      {/* PMOS pair on top */}
      <MiniMosfet x={left} y={top} w={tw} h={th} kind="pmos" testid={testid ? `${testid}-pmos-a` : undefined} />
      <MiniMosfet x={midX} y={top} w={tw} h={th} kind="pmos" testid={testid ? `${testid}-pmos-b` : undefined} />
      {/* NMOS pair on bottom */}
      <MiniMosfet x={left} y={midY} w={tw} h={th} kind="nmos" testid={testid ? `${testid}-nmos-a` : undefined} />
      <MiniMosfet x={midX} y={midY} w={tw} h={th} kind="nmos" testid={testid ? `${testid}-nmos-b` : undefined} />
    </g>
  );
}

// ── MiniSrLatch ───────────────────────────────────────────────────────────
// 2 cross-coupled mini-NANDs inside a rectangle footprint. Used as the
// hover state of a DFF latch box: instead of a labeled box, the user sees
// the actual SR-latch wiring (2 NANDs feeding back into each other).

interface MiniSrLatchProps {
  x: number;
  y: number;
  w: number;
  h: number;
  testid?: string;
}

export function MiniSrLatch({ x, y, w, h, testid }: MiniSrLatchProps) {
  // Two mini NANDs stacked vertically with cross-coupling lines between
  // their outputs and inputs.
  const cx = x + w / 2;
  const n1cy = y + h * 0.28;
  const n2cy = y + h * 0.72;
  const nandHalfW = 22;
  const nandHalfH = 14;
  // Mini D-shape paths (smaller than the latch-level NAND).
  const mini = (mcx: number, mcy: number, key: string) => {
    const p = `M ${mcx - nandHalfW} ${mcy - nandHalfH} L ${mcx} ${mcy - nandHalfH} A ${nandHalfH} ${nandHalfH} 0 0 1 ${mcx} ${mcy + nandHalfH} L ${mcx - nandHalfW} ${mcy + nandHalfH} Z`;
    return (
      <g key={key}>
        <path d={p} fill={parchment.bg} stroke={parchment.ink} strokeWidth={1.2} />
        <circle cx={mcx + nandHalfH + 3} cy={mcy} r={2.5} fill={parchment.bg} stroke={parchment.ink} strokeWidth={1.2} />
      </g>
    );
  };
  return (
    <g data-testid={testid}>
      {/* Outer container box. INK outline (not orange) so the feedback
          wires inside don't visually merge with the box border. */}
      <rect x={x} y={y} width={w} height={h} rx={6} fill={parchment.bgDeep} stroke={parchment.ink} strokeWidth={1.5} />
      {/* Cross-coupling feedback lines — drawn first so NANDs sit on top.
          Two distinct paths well-spaced so they read as TWO wires (not one
          fat line). Q (orange) uses the OUTER right channel; Qbar (dark
          sepia) uses an INNER right channel. */}
      <polyline
        data-testid={testid ? `${testid}-feedback-q` : undefined}
        points={`${cx + nandHalfH + 6},${n1cy} ${x + w - 8},${n1cy} ${x + w - 8},${n2cy + nandHalfH - 4} ${cx - nandHalfW - 4},${n2cy + nandHalfH - 4}`}
        fill="none"
        stroke={parchment.gateOn}
        strokeWidth={2.5}
      />
      <polyline
        data-testid={testid ? `${testid}-feedback-qbar` : undefined}
        points={`${cx + nandHalfH + 6},${n2cy} ${x + w - 24},${n2cy} ${x + w - 24},${n1cy - nandHalfH + 4} ${cx - nandHalfW - 4},${n1cy - nandHalfH + 4}`}
        fill="none"
        stroke="#5c4438"
        strokeWidth={2.5}
      />
      {mini(cx, n1cy, 'n1')}
      {mini(cx, n2cy, 'n2')}
      {/* Tiny labels */}
      <text x={cx - 8} y={n1cy + 3} fontSize={7} fill={parchment.ink} fontFamily="serif" textAnchor="middle" fontWeight={700}>N1</text>
      <text x={cx - 8} y={n2cy + 3} fontSize={7} fill={parchment.ink} fontFamily="serif" textAnchor="middle" fontWeight={700}>N2</text>
    </g>
  );
}

// ── MosfetCrossSection (HTML, used inside drei <Html> on the 3D gate) ─────
// VERTICAL cross-section that mirrors how the transistor sits inside the
// NAND gate: top terminal goes to Vdd or Y, bottom goes to GND or mid, and
// the gate stub sticks out the LEFT (the side the A or B wire enters from).
// Color palette matches LevelTransistor exactly so a hover preview is the
// same visual the user would see if they drilled in.
//
// Per-role nets are looked up from TRANSISTOR_NETS so the label text shows
// the actual parent-level connection (e.g., "Vdd" at the top of P_A,
// "GND" at the bottom of N_B, "A" at the gate stub of P_A).

import type { TransistorRole } from './symbols';

interface NetLabels {
  top: string;     // upper terminal's parent net
  bottom: string;  // lower terminal's parent net
  side: string;    // gate stub's parent net (the A or B input)
}

// Per-transistor wiring inside the NAND gate. Single source of truth here
// so the hover preview always matches the actual diagram.
export const TRANSISTOR_NETS: Record<TransistorRole, NetLabels> = {
  P_A: { top: 'Vdd', bottom: 'Y', side: 'A' },
  P_B: { top: 'Vdd', bottom: 'Y', side: 'B' },
  N_A: { top: 'Y', bottom: 'mid', side: 'A' },
  N_B: { top: 'mid', bottom: 'GND', side: 'B' },
};

interface MosfetCrossSectionProps {
  kind: 'pmos' | 'nmos';
  role: TransistorRole;
  testid?: string;
}

export function MosfetCrossSection({ kind, role, testid }: MosfetCrossSectionProps) {
  const isPmos = kind === 'pmos';
  const substrate = isPmos ? PMOS_SUBSTRATE : NMOS_SUBSTRATE;
  const doped = isPmos ? PMOS_DOPED : NMOS_DOPED;
  const nets = TRANSISTOR_NETS[role];
  // For PMOS: source is on top (tied to Vdd), drain on bottom (drives Y).
  // For NMOS: drain on top (Y or mid), source on bottom (mid or GND).
  const topTerm = isPmos ? 'S' : 'D';
  const bottomTerm = isPmos ? 'D' : 'S';

  // Vertical layout: w narrower than h. Gate stub on the LEFT.
  // Bigger than before so the colored slabs read clearly at hover scale.
  // Doped chips sit INSIDE the substrate slab as small inset blocks so the
  // substrate color is dominant (the substrate IS the bulk silicon — the
  // dopes are tiny implant regions at the surface).
  const w = 130;
  const h = 180;
  const subX = 44;
  const subY = 22;
  const subW = 56;
  const subH = h - 44;
  const dopedW = 18;
  const dopedH = 16;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} data-testid={testid} style={{ pointerEvents: 'none' }}>
      {/* Outer card */}
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={5} fill={parchment.bg} stroke={parchment.gateOn} strokeWidth={1.5} />

      {/* Substrate slab (vertical) */}
      <rect x={subX} y={subY} width={subW} height={subH} rx={2} fill={substrate} stroke={parchment.ink} strokeWidth={0.6} />

      {/* Top doped chip (S for PMOS, D for NMOS) — small implant near top */}
      <rect x={subX + (subW - dopedW) / 2} y={subY + 6} width={dopedW} height={dopedH} fill={doped} stroke={parchment.ink} strokeWidth={0.4} />
      {/* Bottom doped chip (D for PMOS, S for NMOS) — small implant near bottom */}
      <rect x={subX + (subW - dopedW) / 2} y={subY + subH - dopedH - 6} width={dopedW} height={dopedH} fill={doped} stroke={parchment.ink} strokeWidth={0.4} />

      {/* Polysilicon gate strip — VERTICAL, on the LEFT face of substrate.
          A small horizontal stub extends further left to a label, like the
          A/B wire entering at the gate level. */}
      <rect x={subX - 4} y={subY + subH * 0.32} width={6} height={subH * 0.36} fill={POLY_GATE} />
      <line x1={subX - 4} y1={subY + subH * 0.5} x2={6} y2={subY + subH * 0.5} stroke={POLY_GATE} strokeWidth={2} />
      {/* PMOS gate bubble (active LOW marker) */}
      {isPmos && (
        <circle cx={subX - 8} cy={subY + subH * 0.5} r={3} fill={parchment.bg} stroke={POLY_GATE} strokeWidth={1.5} />
      )}

      {/* Top terminal stub + parent-net label (big chip so it pops) */}
      <line x1={subX + subW / 2} y1={subY + 4} x2={subX + subW / 2} y2={4} stroke={parchment.ink} strokeWidth={1.5} />
      <rect x={subX + subW / 2 + 4} y={2} width={28} height={14} rx={2} fill={parchment.bgDeep} stroke={parchment.gateOn} strokeWidth={1} />
      <text x={subX + subW / 2 + 18} y={13} fontSize={11} fill={parchment.ink} fontFamily="serif" fontWeight={700} textAnchor="middle" data-testid={testid ? `${testid}-top-net` : undefined}>
        {nets.top}
      </text>
      <text x={subX + subW + 4} y={subY + 16} fontSize={9} fill={parchment.inkSoft} fontFamily="serif" fontStyle="italic">
        {topTerm}
      </text>

      {/* Bottom terminal stub + parent-net label */}
      <line x1={subX + subW / 2} y1={subY + subH - 4} x2={subX + subW / 2} y2={h - 4} stroke={parchment.ink} strokeWidth={1.5} />
      <rect x={subX + subW / 2 + 4} y={h - 16} width={28} height={14} rx={2} fill={parchment.bgDeep} stroke={parchment.gateOn} strokeWidth={1} />
      <text x={subX + subW / 2 + 18} y={h - 5} fontSize={11} fill={parchment.ink} fontFamily="serif" fontWeight={700} textAnchor="middle" data-testid={testid ? `${testid}-bottom-net` : undefined}>
        {nets.bottom}
      </text>
      <text x={subX + subW + 4} y={subY + subH - 6} fontSize={9} fill={parchment.inkSoft} fontFamily="serif" fontStyle="italic">
        {bottomTerm}
      </text>

      {/* Gate-side label (the A or B input wire feeds in here) */}
      <rect x={2} y={subY + subH * 0.5 - 9} width={20} height={16} rx={2} fill={parchment.bgDeep} stroke={parchment.gateOn} strokeWidth={1} />
      <text x={12} y={subY + subH * 0.5 + 3} fontSize={11} fill={parchment.ink} fontFamily="serif" fontWeight={700} textAnchor="middle" data-testid={testid ? `${testid}-side-net` : undefined}>
        {nets.side}
      </text>
      <text x={26} y={subY + subH * 0.5 + 14} fontSize={9} fill={parchment.inkSoft} fontFamily="serif" fontStyle="italic">G</text>

      {/* Role badge */}
      <text x={w - 4} y={13} textAnchor="end" fontSize={11} fill={parchment.ink} fontFamily="serif" fontWeight={700}>
        {role}
      </text>
    </svg>
  );
}
