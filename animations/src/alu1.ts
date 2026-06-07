import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import {
  buildMuxScene, bindMuxSceneState, placeMuxScene,
  MUX_SCENE_W, MUX_SCENE_H, MUX_SCENE_ANCHORS,
} from "./scenes/muxScene";

// 1-bit ALU slice with 4 operations selected by a 2-bit op:
//   00 → A + B (+Cin)   01 → A AND B   10 → A OR B   11 → A XOR B
//
// All four blocks compute in parallel on the same A and B; a 4-to-1 MUX
// forwards the one chosen by op to Y. The full adder also takes Cin and
// emits Cout (the only inter-slice wire when these are stacked into the
// 4-bit ALU). The full adder and the MUX are drillable.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const svg = document.getElementById('alu1') as unknown as SVGSVGElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const aBit = document.getElementById('aBit')!;
const bBit = document.getElementById('bBit')!;
const cinBit = document.getElementById('cinBit')!;
const opName = document.getElementById('opName')!;
const yBit = document.getElementById('yBit')!;
const coutBit = document.getElementById('coutBit')!;

type Alu1Snap = { a: Bit; b: Bit; cin: Bit; op1: Bit; op0: Bit };
const SNAP_KEY = 'alu1';
const _snap = loadSnapshot<Alu1Snap>(SNAP_KEY);
let a: Bit = readBitParam('A', _snap?.a ?? 0);
let b: Bit = readBitParam('B', _snap?.b ?? 0);
let cin: Bit = readBitParam('Cin', _snap?.cin ?? 0);
let op1: Bit = readBitParam('op1', _snap?.op1 ?? 0);
let op0: Bit = readBitParam('op0', _snap?.op0 ?? 0);

const OP_NAMES = ['ADD', 'AND', 'OR', 'XOR'];

// ── Full-adder hover preview (mounted into #faDetail) ─────────────────
// Geometry is the standalone /fulladder.html content, local frame
// 1020 × 560, fitted into the full-adder box. Mirrors adder4.ts's FA mini.
const FA_LOCAL_W = 1020;
const FA_LOCAL_H = 560;
const FA_MINI_WIRES: { net: string; points: string; alwaysOn?: boolean }[] = [
  { net: 'Vdd', alwaysOn: true, points: '0,0 1020,0' },
  { net: 'GND', points: '0,560 1020,560' },
  { net: 'A',    points: '0,100 180,100' },
  { net: 'B',    points: '0,180 180,180' },
  { net: 'Cin',  points: '0,380 60,380 60,40 505,40 505,180 530,180' },
  { net: 'sum1', points: '420,100 530,100' },
  { net: 'c1',   points: '420,180 460,180 460,320 530,320' },
  { net: 'c2',   points: '770,180 810,180 810,460 490,460 490,400 530,400' },
  { net: 'S',    points: '770,100 1020,100' },
  { net: 'Cout', points: '730,360 1020,360' },
];
const FA_MINI_SUBBOXES = [
  { tid: 'HA1', x: 180, y: 60,  w: 240, h: 160, lx: 300, ly: 125 },
  { tid: 'HA2', x: 530, y: 60,  w: 240, h: 160, lx: 650, ly: 125 },
  { tid: 'OR',  x: 530, y: 280, w: 200, h: 160, lx: 630, ly: 345 },
];
const FA_MINI_WIRELABELS = [
  { text: 'sum1', x: 475, y: 88 },
  { text: 'c1',   x: 478, y: 250 },
  { text: 'c2',   x: 828, y: 320 },
];
const FA_BOX = { x: 385, y: 105, w: 210, h: 140 };

function buildFaMini(): void {
  const host = document.getElementById('faDetail');
  if (!host) return;
  const g = document.createElementNS(SVG_NS, 'g');
  const sx = FA_BOX.w / FA_LOCAL_W;
  const sy = FA_BOX.h / FA_LOCAL_H;
  g.setAttribute('transform', `translate(${FA_BOX.x}, ${FA_BOX.y}) scale(${sx}, ${sy})`);

  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('class', 'mini-bg');
  bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
  bg.setAttribute('width', String(FA_LOCAL_W));
  bg.setAttribute('height', String(FA_LOCAL_H));
  bg.setAttribute('rx', '36');
  g.appendChild(bg);

  for (const w of FA_MINI_WIRES) {
    const wire = document.createElementNS(SVG_NS, 'polyline');
    wire.setAttribute('class', 'wire-mini');
    wire.setAttribute('data-net', w.net);
    wire.setAttribute('data-on', w.alwaysOn ? '1' : '0');
    wire.setAttribute('points', w.points);
    g.appendChild(wire);
  }
  for (const sb of FA_MINI_SUBBOXES) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', sb.tid);
    r.setAttribute('x', String(sb.x)); r.setAttribute('y', String(sb.y));
    r.setAttribute('width', String(sb.w)); r.setAttribute('height', String(sb.h));
    r.setAttribute('rx', '12');
    g.appendChild(r);
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini');
    t.setAttribute('data-tid', sb.tid);
    t.setAttribute('x', String(sb.lx)); t.setAttribute('y', String(sb.ly));
    t.textContent = sb.tid;
    g.appendChild(t);
  }
  for (const l of FA_MINI_WIRELABELS) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini-tiny');
    t.setAttribute('x', String(l.x)); t.setAttribute('y', String(l.y));
    t.textContent = l.text;
    g.appendChild(t);
  }
  host.appendChild(g);
}

function bindFaMini(): void {
  const root = document.getElementById('faDetail');
  if (!root) return;
  const sum1: Bit = (a ^ b) as Bit;
  const c1:   Bit = (a & b) as Bit;
  const S:    Bit = (sum1 ^ cin) as Bit;
  const c2:   Bit = (sum1 & cin) as Bit;
  const Cout: Bit = (c1 | c2) as Bit;
  const set = (sel: string, on: Bit) =>
    root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-on', String(on)));
  set('.wire-mini[data-net="A"]',    a);
  set('.wire-mini[data-net="B"]',    b);
  set('.wire-mini[data-net="Cin"]',  cin);
  set('.wire-mini[data-net="sum1"]', sum1);
  set('.wire-mini[data-net="c1"]',   c1);
  set('.wire-mini[data-net="c2"]',   c2);
  set('.wire-mini[data-net="S"]',    S);
  set('.wire-mini[data-net="Cout"]', Cout);
  root.querySelector('.tbody-mini[data-tid="HA1"]')?.setAttribute('data-on', String((sum1 || c1) ? 1 : 0));
  root.querySelector('.tbody-mini[data-tid="HA2"]')?.setAttribute('data-on', String((S || c2) ? 1 : 0));
  root.querySelector('.tbody-mini[data-tid="OR"]')?.setAttribute('data-on', String(Cout));
}

// ── op-MUX hover preview (mounted into #muxDetail) ────────────────────
const MUX_BOX = { x: 945, y: 280, w: 210, h: 420 };  // matches the gMux rect
const muxAt = (a: { x: number; y: number }) => ({
  x: MUX_BOX.x + a.x * (MUX_BOX.w / MUX_SCENE_W),
  y: MUX_BOX.y + a.y * (MUX_BOX.h / MUX_SCENE_H),
});
const muxDetail = document.getElementById('muxDetail');
const muxScene = muxDetail ? buildMuxScene() : null;
if (muxDetail && muxScene) {
  muxDetail.appendChild(placeMuxScene(muxScene, MUX_BOX));
}

buildFaMini();

// Align the parent's full-adder wires onto the FA preview's PROJECTED
// terminals (A/B/Cin on the left, S/Cout on the right) so they meet the cell
// you see on hover. Projecting through the same FA_BOX transform means S
// exits upper-right and Cout lower-right — exactly as the standalone full
// adder draws them (Cout comes from the OR gate, below S). The Cout wire then
// routes up to the top-right Cout terminal (the carry leaves at the top so
// slices chain cleanly when stacked into the 4-bit ALU).
{
  const sx = FA_BOX.w / FA_LOCAL_W, sy = FA_BOX.h / FA_LOCAL_H;
  const at = (lx: number, ly: number) => ({ x: FA_BOX.x + lx * sx, y: FA_BOX.y + ly * sy });
  const A = at(0, 100), B = at(0, 180), Cin = at(0, 380);
  const S = at(1020, 100), Cout = at(1020, 360);
  const set = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
  set('aFa', `70,385 70,${A.y} ${A.x},${A.y}`);
  set('bFa', `105,595 105,${B.y} ${B.x},${B.y}`);
  set('cinWire', `0,${Cin.y} ${Cin.x},${Cin.y}`);
  document.getElementById('pinCin')?.setAttribute('cy', String(Cin.y));
  set('coutWire', `${Cout.x},${Cout.y} 660,${Cout.y} 660,140 1400,140`);

  // op-MUX: each compute block's result → its projected data input; op selects
  // → s1/s0; output → Y. (add=in0 … xor=in3; the preview orders in3 top … in0
  // bottom, so the add/xor routes cross — connected, just not straight.)
  const s1 = muxAt(MUX_SCENE_ANCHORS.s1), s0 = muxAt(MUX_SCENE_ANCHORS.s0);
  const in0 = muxAt(MUX_SCENE_ANCHORS.in0), in1 = muxAt(MUX_SCENE_ANCHORS.in1);
  const in2 = muxAt(MUX_SCENE_ANCHORS.in2), in3 = muxAt(MUX_SCENE_ANCHORS.in3);
  const mout = muxAt(MUX_SCENE_ANCHORS.out);
  set('addWire', `${S.x},${S.y} 700,${S.y} 700,${in0.y} ${in0.x},${in0.y}`);   // full-adder sum
  set('andWire', `595,385 728,385 728,${in1.y} ${in1.x},${in1.y}`);
  set('orWire',  `595,595 756,595 756,${in2.y} ${in2.x},${in2.y}`);
  set('xorWire', `595,805 784,805 784,${in3.y} ${in3.x},${in3.y}`);
  set('op1Wire', `0,105 35,105 35,35 896,35 896,${s1.y} ${s1.x},${s1.y}`);
  set('op0Wire', `0,175 56,175 56,14 910,14 910,${s0.y} ${s0.x},${s0.y}`);
  set('yWire', `${mout.x},${mout.y} 1400,${mout.y}`);
  document.getElementById('pinY')?.setAttribute('cy', String(mout.y));
  document.querySelector('text[data-pin="y"]')?.setAttribute('y', String(mout.y));
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

function render() {
  const sum: Bit = (a ^ b ^ cin) as Bit;
  const cout: Bit = (((a & b) | (a & cin) | (b & cin)) & 1) as Bit;
  const andv: Bit = (a & b) as Bit;
  const orv: Bit = (a | b) as Bit;
  const xorv: Bit = (a ^ b) as Bit;
  const op = op1 * 2 + op0;
  const results: Bit[] = [sum, andv, orv, xorv];
  const Y: Bit = results[op];

  // Inputs
  setNet('A', a); setPin('pinA', a);
  setNet('B', b); setPin('pinB', b);
  setNet('Cin', cin); setPin('pinCin', cin);
  setNet('op1', op1); setPin('pinOp1', op1);
  setNet('op0', op0); setPin('pinOp0', op0);

  // Per-block results + body glow (all blocks compute in parallel)
  setNet('add', sum); setBody('gFa', (sum || cout) as Bit);
  setNet('and', andv); setBody('gAnd', andv);
  setNet('or',  orv);  setBody('gOr',  orv);
  setNet('xor', xorv); setBody('gXor', xorv);

  // Carry-out (from the full adder) + selected result → Y
  setNet('cout', cout); setPin('pinCout', cout);
  setNet('Y', Y); setPin('pinY', Y);
  setBody('gMux', Y);

  // Hover previews
  bindFaMini();
  if (muxScene) bindMuxSceneState(muxScene, { ins: [sum, andv, orv, xorv], s1: op1, s0: op0 });

  // Buttons
  setBtn('btnA', 'A', a); setBtn('btnB', 'B', b); setBtn('btnCin', 'Cin', cin);
  setBtn('btnOp1', 'op1', op1); setBtn('btnOp0', 'op0', op0);

  // Readouts
  aBit.textContent = String(a);
  bBit.textContent = String(b);
  cinBit.textContent = String(cin);
  opName.textContent = OP_NAMES[op];
  yBit.textContent = String(Y);
  coutBit.textContent = String(cout);
}

function persist() { saveSnapshot<Alu1Snap>(SNAP_KEY, { a, b, cin, op1, op0 }); }

document.getElementById('btnA')?.addEventListener('click', () => { a = (a ? 0 : 1) as Bit; render(); persist(); });
document.getElementById('btnB')?.addEventListener('click', () => { b = (b ? 0 : 1) as Bit; render(); persist(); });
document.getElementById('btnCin')?.addEventListener('click', () => { cin = (cin ? 0 : 1) as Bit; render(); persist(); });
document.getElementById('btnOp1')?.addEventListener('click', () => { op1 = (op1 ? 0 : 1) as Bit; render(); persist(); });
document.getElementById('btnOp0')?.addEventListener('click', () => { op0 = (op0 ? 0 : 1) as Bit; render(); persist(); });
btnReset.addEventListener('click', () => {
  a = 0; b = 0; cin = 0; op1 = 0; op0 = 0;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-downs ──────────────────────────────────────────────────────
document.getElementById('slot-fa')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/fulladder.html', {
    from: 'alu1', which: 'fa', A: a, B: b, Cin: cin,
  }));
});
document.getElementById('slot-mux')?.addEventListener('click', () => {
  const sum: Bit = (a ^ b ^ cin) as Bit;
  window.location.assign(buildDrillUrl('/mux.html', {
    from: 'alu1', which: 'opmux',
    in0: sum, in1: (a & b) as Bit, in2: (a | b) as Bit, in3: (a ^ b) as Bit,
    s1: op1, s0: op0,
  }));
});

initDrillBreadcrumb();
render();

// Step walkthrough nav
const steps = Array.from(document.querySelectorAll<HTMLElement>('.step'));
const stepPrev = document.getElementById('stepPrev') as HTMLButtonElement;
const stepNext = document.getElementById('stepNext') as HTMLButtonElement;
const stepNum  = document.getElementById('stepNum')!;
const stepCount = document.getElementById('stepCount')!;
stepCount.textContent = ` / ${steps.length}`;
let currentStep = 0;
function showStep(i: number) {
  currentStep = Math.max(0, Math.min(steps.length - 1, i));
  steps.forEach((s, idx) => s.toggleAttribute('hidden', idx !== currentStep));
  stepNum.textContent = String(currentStep + 1);
  stepPrev.disabled = currentStep === 0;
  stepNext.disabled = currentStep === steps.length - 1;
}
stepPrev.addEventListener('click', () => showStep(currentStep - 1));
stepNext.addEventListener('click', () => showStep(currentStep + 1));
showStep(0);

initPanel();
initToc();
