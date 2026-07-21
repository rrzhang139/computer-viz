import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

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

// ── Embed EXACT copies of the children (the canonical standard): the full
// adder → /fulladder.html, the op-MUX → /mux.html. autoFillEmbeds returns each
// embed's projected pins, so every wire lands on a real terminal.
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const FA: Record<string, Pt>  = embeds.get('slot-fa')  || {};
const MUX: Record<string, Pt> = embeds.get('slot-mux') || {};

function lightFa(a_: Bit, b_: Bit, cin_: Bit) {
  const host = document.getElementById('faDetail'); if (!host) return;
  const sum1: Bit = (a_ ^ b_) as Bit, carry1: Bit = (a_ & b_) as Bit;
  const S: Bit = (sum1 ^ cin_) as Bit, carry2: Bit = (sum1 & cin_) as Bit;
  const Cout: Bit = (carry1 | carry2) as Bit;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('A', a_); w('B', b_); w('Cin', cin_); w('sum1', sum1); w('carry1', carry1); w('carry2', carry2); w('S', S); w('Cout', Cout);
  body('gHa1', (sum1 || carry1) ? 1 : 0); body('gHa2', (S || carry2) ? 1 : 0); body('gOr', Cout);
}
function lightMux(ins: Bit[], s1_: Bit, s0_: Bit) {
  const host = document.getElementById('muxDetail'); if (!host) return;
  const sel: Bit[] = [0, 0, 0, 0] as Bit[]; sel[s1_ * 2 + s0_] = 1;
  const andOut: Bit[] = ins.map((v, i) => (v & sel[i]) as Bit);
  const out: Bit = (andOut[0] | andOut[1] | andOut[2] | andOut[3]) as Bit;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('s1', s1_); w('s0', s0_); w('EN', 1);
  for (let i = 0; i < 4; i++) { w(`in${i}`, ins[i]); w(`sel${i}`, sel[i]); w(`andOut${i}`, andOut[i]); body(`gAnd${i}`, andOut[i]); }
  w('out', out); body('gOr', out); body('gDecoder', 1);
}

// Align the parent's full-adder wires onto the FA preview's PROJECTED
// terminals (A/B/Cin on the left, S/Cout on the right) so they meet the cell
// you see on hover. Projecting through the same FA_BOX transform means S
// exits upper-right and Cout lower-right — exactly as the standalone full
// adder draws them (Cout comes from the OR gate, below S). The Cout wire then
// routes up to the top-right Cout terminal (the carry leaves at the top so
// slices chain cleanly when stacked into the 4-bit ALU).
if (FA.pinA && FA.pinB && FA.pinCin && FA.pinS && FA.pinCout
    && MUX.pinIn0 && MUX.pinIn1 && MUX.pinIn2 && MUX.pinIn3 && MUX.pinS0 && MUX.pinS1 && MUX.pinOut) {
  const set = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
  const placePin = (id: string, x: number, y: number) => {
    const c = document.getElementById(id);
    if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
  };
  // Full adder: A/B/Cin in (left), S/Cout out (right) — projected pins.
  set('aFa', `70,385 70,${FA.pinA.y} ${FA.pinA.x},${FA.pinA.y}`);
  set('bFa', `105,595 105,${FA.pinB.y} ${FA.pinB.x},${FA.pinB.y}`);
  set('cinWire', `0,${FA.pinCin.y} ${FA.pinCin.x},${FA.pinCin.y}`);
  placePin('pinCin', 0, FA.pinCin.y);
  // Cout leaves at the top-right (so slices chain cleanly when stacked).
  set('coutWire', `${FA.pinCout.x},${FA.pinCout.y} 660,${FA.pinCout.y} 660,140 1400,140`);

  // op-MUX: each compute block's result → its projected data input; op selects
  // → s1/s0; output → Y. (add=in0 … xor=in3.)
  set('addWire', `${FA.pinS.x},${FA.pinS.y} 640,${FA.pinS.y} 640,${MUX.pinIn0.y} ${MUX.pinIn0.x},${MUX.pinIn0.y}`);
  set('andWire', `595,385 820,385 820,${MUX.pinIn1.y} ${MUX.pinIn1.x},${MUX.pinIn1.y}`);
  set('orWire',  `595,595 756,595 756,${MUX.pinIn2.y} ${MUX.pinIn2.x},${MUX.pinIn2.y}`);
  set('xorWire', `595,805 784,805 784,${MUX.pinIn3.y} ${MUX.pinIn3.x},${MUX.pinIn3.y}`);
  set('op1Wire', `0,105 35,105 35,35 896,35 896,${MUX.pinS1.y} ${MUX.pinS1.x},${MUX.pinS1.y}`);
  set('op0Wire', `0,175 56,175 56,14 910,14 910,${MUX.pinS0.y} ${MUX.pinS0.x},${MUX.pinS0.y}`);
  set('yWire', `${MUX.pinOut.x},${MUX.pinOut.y} 1480,${MUX.pinOut.y}`);
  placePin('pinY', 1480, MUX.pinOut.y);
  document.querySelector('text[data-pin="y"]')?.setAttribute('y', String(MUX.pinOut.y));
}

// Per-wire pulse overlays (exclude embedded children's own wires).
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('.wire')).filter((w) => !w.closest('.detailed'));
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
    if (el.closest('.detailed')) return;  // embedded children light via their own helpers
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
  setNet('Cout', cout); setPin('pinCout', cout);
  setNet('Y', Y); setPin('pinY', Y);
  setBody('gMux', Y);

  // Embedded previews — exact copies of the child pages.
  lightFa(a, b, cin);
  lightMux([sum, andv, orv, xorv], op1, op0);

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

initCanvasZoom();
initSteps();

initPanel();
initToc();
