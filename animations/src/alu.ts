import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import {
  buildAdder4Scene, bindAdder4SceneState, placeAdder4Scene, adder4Terminals,
} from "./scenes/adder4Scene";
import {
  buildMuxScene, bindMuxSceneState, placeMuxScene,
  MUX_SCENE_W, MUX_SCENE_H, MUX_SCENE_ANCHORS,
} from "./scenes/muxScene";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// 4-bit ALU with 4 operations selected by a 2-bit op:
//   00 → A + B   01 → A AND B   10 → A OR B   11 → A XOR B
//
// All four blocks compute in parallel on the same A and B; a 4-to-1 MUX
// forwards the one chosen by op to Y. (The adder and the MUX are drillable;
// the bitwise arrays are leaf gate-arrays.)

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const svg = document.getElementById('alu') as unknown as SVGSVGElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const aBits = document.getElementById('aBits')!;
const aDec  = document.getElementById('aDec')!;
const bBits = document.getElementById('bBits')!;
const bDec  = document.getElementById('bDec')!;
const opName = document.getElementById('opName')!;
const yBits = document.getElementById('yBits')!;
const yDec  = document.getElementById('yDec')!;

type AluSnap = { a: Bit[]; b: Bit[]; op1: Bit; op0: Bit };
const SNAP_KEY = 'alu';
const _snap = loadSnapshot<AluSnap>(SNAP_KEY);
const a: Bit[] = [0, 1, 2, 3].map((i) => readBitParam(`A${i}`, (_snap?.a?.[i] ?? 0) as Bit)) as Bit[];
const b: Bit[] = [0, 1, 2, 3].map((i) => readBitParam(`B${i}`, (_snap?.b?.[i] ?? 0) as Bit)) as Bit[];
let op1: Bit = readBitParam('op1', _snap?.op1 ?? 0);
let op0: Bit = readBitParam('op0', _snap?.op0 ?? 0);

const OP_NAMES = ['ADD', 'AND', 'OR', 'XOR'];

// ── Hover previews (CLAUDE.md rule 21): adder → adder4Scene, op-MUX → muxScene.
const ADDER_BOX = { x: 385, y: 105, w: 210, h: 140 };  // matches gAdder rect
const MUX_BOX = { x: 945, y: 280, w: 210, h: 420 };    // matches gMux rect
const adderDetail = document.getElementById('adderDetail');
const adderScene = adderDetail ? buildAdder4Scene() : null;
if (adderDetail && adderScene) {
  adderDetail.appendChild(placeAdder4Scene(adderScene, ADDER_BOX));
}
const muxDetail = document.getElementById('muxDetail');
const muxScene = muxDetail ? buildMuxScene() : null;
if (muxDetail && muxScene) {
  muxDetail.appendChild(placeMuxScene(muxScene, MUX_BOX));
}

// ── 4-bit buses as 4-conductor bundles, routed onto projected child terminals ──
// Each logical bus is four parallel conductors (one per bit) so the lit/dark
// pattern IS the binary value — no canvas text. Operands A/B FAN to the 4-row
// adder preview (and tap the leaf gate-arrays); results add/and/or/xor
// CONVERGE onto the 1-slice op-MUX preview's single inputs; Y fans from the
// MUX output to its pin. Every endpoint touching a drillable child IS that
// child preview's projected terminal — enforced by tests/wire-alignment.test.mjs.
const aT = adder4Terminals(ADDER_BOX);
const muxAt = (a: { x: number; y: number }) => ({
  x: MUX_BOX.x + a.x * (MUX_BOX.w / MUX_SCENE_W),
  y: MUX_BOX.y + a.y * (MUX_BOX.h / MUX_SCENE_H),
});
const mIn = [
  muxAt(MUX_SCENE_ANCHORS.in0), muxAt(MUX_SCENE_ANCHORS.in1),
  muxAt(MUX_SCENE_ANCHORS.in2), muxAt(MUX_SCENE_ANCHORS.in3),
];
const mS1 = muxAt(MUX_SCENE_ANCHORS.s1), mS0 = muxAt(MUX_SCENE_ANCHORS.s0);
const mOut = muxAt(MUX_SCENE_ANCHORS.out);

const PITCH = 12;                                       // px between conductors
const busLayer = document.getElementById('busLayer')!;
const conductor = (net: string, pts: [number, number][]) => {
  const w = document.createElementNS(SVG_NS, 'polyline');
  w.setAttribute('class', 'wire');
  w.setAttribute('data-net', net);
  w.setAttribute('data-on', '0');
  w.setAttribute('points', pts.map(([x, y]) => `${x},${y}`).join(' '));
  busLayer.appendChild(w);
};
const off = (i: number) => (1.5 - i) * PITCH;           // bit3 top … bit0 bottom (within a bundle)
// Operand buses: pin → per-bit column → the 4 adder rows, plus taps into the
// three leaf gate-arrays (which have no preview, so their entry y is cosmetic).
const OPERANDS = [
  { net: 'A', pinY: 385, col: (i: number) => 52 + i * PITCH, row: (i: number) => aT.A[i].y, band: 8 },
  { net: 'B', pinY: 595, col: (i: number) => 104 + i * PITCH, row: (i: number) => aT.B[i].y, band: 48 },
];
for (const op of OPERANDS) for (let i = 0; i < 4; i++) {
  const col = op.col(i);
  conductor(`${op.net}${i}`, [[0, op.pinY], [col, op.pinY], [col, op.row(i)], [385, op.row(i)]]);
  for (const gateTop of [315, 525, 735]) {
    const gy = gateTop + op.band + i * 8;
    conductor(`${op.net}${i}`, [[col, op.pinY], [col, gy], [385, gy]]);
  }
}
// Result buses: each compute block's bit i → its MUX data input (converge there).
const GATE_OUT = { and: 385, or: 595, xor: 805 };       // leaf gate-array output y centers
const RESULTS = [
  { net: 'add', srcY: (i: number) => aT.S[i].y,             lane: 636, to: mIn[0] },
  { net: 'and', srcY: (i: number) => GATE_OUT.and + off(i), lane: 690, to: mIn[1] },
  { net: 'or',  srcY: (i: number) => GATE_OUT.or + off(i),  lane: 744, to: mIn[2] },
  { net: 'xor', srcY: (i: number) => GATE_OUT.xor + off(i), lane: 798, to: mIn[3] },
];
for (const r of RESULTS) for (let i = 0; i < 4; i++) {
  const y = r.srcY(i), lx = r.lane + i * PITCH;
  conductor(`${r.net}${i}`, [[595, y], [lx, y], [lx, r.to.y], [r.to.x, r.to.y]]);
}
// Output bus: MUX output → output pin (converge at the MUX out, spread to the pin).
for (const out of [{ net: 'Y' }]) for (let i = 0; i < 4; i++) {
  conductor(`${out.net}${i}`, [[mOut.x, mOut.y], [1200 + i * PITCH, mOut.y], [1200 + i * PITCH, 490], [1400, 490]]);
}
// op selects (single 1-bit) route over the top edge into the MUX selects.
const OPSELS = [
  { net: 'op1', route: [[0, 105], [35, 105], [35, 35], [896, 35]] as [number, number][], sel: mS1 },
  { net: 'op0', route: [[0, 175], [56, 175], [56, 14], [910, 14]] as [number, number][], sel: mS0 },
];
for (const o of OPSELS) {
  const turnX = o.route[o.route.length - 1][0];
  conductor(o.net, [...o.route, [turnX, o.sel.y], [o.sel.x, o.sel.y]]);
}

// Per-wire pulse overlays.
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('.wire'));
const pulseFor = new Map<SVGPolylineElement, SVGPolylineElement>();
for (const w of wires) {
  const p = document.createElementNS(SVG_NS, 'polyline');
  p.setAttribute('class', 'pulse');
  p.setAttribute('points', w.getAttribute('points') || '');
  const net = w.getAttribute('data-net');
  if (net) p.setAttribute('data-net', net);
  p.setAttribute('data-on', w.getAttribute('data-on') || '0');
  w.insertAdjacentElement('afterend', p);
  pulseFor.set(w, p);
}

function setNet(net: string, on: Bit) {
  svg.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((el) => {
    el.setAttribute('data-on', String(on));
    pulseFor.get(el)?.setAttribute('data-on', String(on));
  });
}
function setPin(id: string, on: Bit) { document.getElementById(id)?.setAttribute('data-on', String(on)); }
function setBody(id: string, on: Bit) { document.getElementById(id)?.setAttribute('data-on', String(on)); }
function setBtn(id: string, label: string, value: Bit) {
  const btn = document.getElementById(id) as HTMLButtonElement | null;
  if (!btn) return;
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}
const valOf = (bits: Bit[]) => bits[0] + bits[1] * 2 + bits[2] * 4 + bits[3] * 8;
const bitsStr = (n: number) => `${(n >> 3) & 1}${(n >> 2) & 1}${(n >> 1) & 1}${n & 1}`;
const nz = (n: number): Bit => (n !== 0 ? 1 : 0);

function render() {
  const A = valOf(a), B = valOf(b);
  const add = (A + B) & 0b1111;
  const andv = A & B, orv = A | B, xorv = A ^ B;
  const op = op1 * 2 + op0;
  const results = [add, andv, orv, xorv];
  const Y = results[op];

  // Per-bit bus conductors: each line lit by its own bit, so the lit/dark
  // pattern reads the binary value directly off the wires.
  const bit = (v: number, i: number): Bit => ((v >> i) & 1) as Bit;
  for (let i = 0; i < 4; i++) {
    setNet(`A${i}`, a[i]);
    setNet(`B${i}`, b[i]);
    setNet(`add${i}`, bit(add, i));
    setNet(`and${i}`, bit(andv, i));
    setNet(`or${i}`,  bit(orv, i));
    setNet(`xor${i}`, bit(xorv, i));
    setNet(`Y${i}`,   bit(Y, i));
  }

  // Single labeled bus ports + the 1-bit op selects.
  setPin('pinA', nz(A)); setPin('pinB', nz(B)); setPin('pinY', nz(Y));
  setNet('op1', op1); setPin('pinOp1', op1);
  setNet('op0', op0); setPin('pinOp0', op0);

  // Block body glow (all blocks compute in parallel, every cycle).
  setBody('gAdder', nz(add));
  setBody('gAnd', nz(andv));
  setBody('gOr',  nz(orv));
  setBody('gXor', nz(xorv));
  setBody('gMux', nz(Y));

  // Hover previews
  if (adderScene) bindAdder4SceneState(adderScene, { A: [...a] as Bit[], B: [...b] as Bit[] });
  if (muxScene) {
    bindMuxSceneState(muxScene, {
      ins: [add & 1, andv & 1, orv & 1, xorv & 1] as Bit[],
      s1: op1, s0: op0,
    });
  }

  // Buttons
  for (let i = 0; i < 4; i++) { setBtn(`btnA${i}`, `A${i}`, a[i]); setBtn(`btnB${i}`, `B${i}`, b[i]); }
  setBtn('btnOp1', 'op1', op1); setBtn('btnOp0', 'op0', op0);

  // Readouts
  aBits.textContent = bitsStr(A); aDec.textContent = ` (${A})`;
  bBits.textContent = bitsStr(B); bDec.textContent = ` (${B})`;
  opName.textContent = OP_NAMES[op];
  yBits.textContent = bitsStr(Y); yDec.textContent = ` (${Y})`;
}

function persist() { saveSnapshot<AluSnap>(SNAP_KEY, { a: [...a] as Bit[], b: [...b] as Bit[], op1, op0 }); }

for (let i = 0; i < 4; i++) {
  document.getElementById(`btnA${i}`)?.addEventListener('click', () => { a[i] = (a[i] ? 0 : 1) as Bit; render(); persist(); });
  document.getElementById(`btnB${i}`)?.addEventListener('click', () => { b[i] = (b[i] ? 0 : 1) as Bit; render(); persist(); });
}
document.getElementById('btnOp1')?.addEventListener('click', () => { op1 = (op1 ? 0 : 1) as Bit; render(); persist(); });
document.getElementById('btnOp0')?.addEventListener('click', () => { op0 = (op0 ? 0 : 1) as Bit; render(); persist(); });
btnReset.addEventListener('click', () => {
  for (let i = 0; i < 4; i++) { a[i] = 0; b[i] = 0; }
  op1 = 0; op0 = 0;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-downs ──────────────────────────────────────────────────────
document.getElementById('slot-adder')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/adder4.html', {
    from: 'alu', which: 'adder',
    A0: a[0], A1: a[1], A2: a[2], A3: a[3],
    B0: b[0], B1: b[1], B2: b[2], B3: b[3], Cin: 0,
  }));
});
document.getElementById('slot-mux')?.addEventListener('click', () => {
  // The op-MUX is 4 bit-slices; drill into one slice (bit 0).
  const A = valOf(a), B = valOf(b);
  window.location.assign(buildDrillUrl('/mux.html', {
    from: 'alu', which: 'opmux',
    in0: ((A + B) & 1) as Bit, in1: (A & B & 1) as Bit, in2: ((A | B) & 1) as Bit, in3: ((A ^ B) & 1) as Bit,
    s1: op1, s0: op0,
  }));
});

initDrillBreadcrumb();
render();

initCanvasZoom();
initSteps();

initPanel();
initToc();
