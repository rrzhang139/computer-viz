import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";

// Datapath — register file (2 read ports + 1 write) wired to a 1-bit ALU as
// the read→operate→write-back loop of `add x3, x1, x2`. The regfile and ALU
// are drillable; each hover shows a block-diagram of its internals (one more
// drill reaches the gate level). Everything 1-bit so two reads map 1:1 to the
// two ALU operands.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('datapath') as unknown as SVGSVGElement;

type DpSnap = { mem: Bit[]; rA1: Bit; rA0: Bit; rB1: Bit; rB0: Bit; w1: Bit; w0: Bit; we: Bit; op1: Bit; op0: Bit };
const SNAP_KEY = 'datapath';
const SEED: Bit[] = [1, 0, 0, 1];   // reg0=1, reg1=0, reg2=0, reg3=1
const _snap = loadSnapshot<DpSnap>(SNAP_KEY);
const mem: Bit[] = [0, 1, 2, 3].map((i) => (_snap?.mem?.[i] ?? SEED[i]) as Bit);
let rA1: Bit = readBitParam('raddrA1', _snap?.rA1 ?? 0);
let rA0: Bit = readBitParam('raddrA0', _snap?.rA0 ?? 0);          // port A → reg0
let rB1: Bit = readBitParam('raddrB1', _snap?.rB1 ?? 0);
let rB0: Bit = readBitParam('raddrB0', (_snap?.rB0 ?? 1) as Bit); // port B → reg1
let w1: Bit  = readBitParam('waddr1', (_snap?.w1 ?? 1) as Bit);
let w0: Bit  = readBitParam('waddr0', (_snap?.w0 ?? 0) as Bit);   // write → reg2
let we: Bit  = readBitParam('we', _snap?.we ?? 0);
let op1: Bit = readBitParam('op1', _snap?.op1 ?? 0);
let op0: Bit = readBitParam('op0', _snap?.op0 ?? 0);
let clk: Bit = 0;

const OP_NAMES = ['ADD', 'AND', 'OR', 'XOR'];

// ── Child boxes + terminal points (page coords; 1:1 with layer15_datapath.md).
const RF = {
  raddrA: { x: 210, y: 245 }, raddrB: { x: 210, y: 315 }, waddr: { x: 210, y: 385 },
  we: { x: 210, y: 455 }, clk: { x: 210, y: 735 }, wdata: { x: 210, y: 630 },
  rdataA: { x: 560, y: 350 }, rdataB: { x: 560, y: 490 },
};
const AL = { op: { x: 910, y: 245 }, A: { x: 910, y: 315 }, B: { x: 910, y: 420 }, Y: { x: 1190, y: 385 } };

// ── Hover-preview builder: a block-diagram of a child fitted to its box, with
// stub wires whose OUTER endpoints sit exactly on the parent wires' terminals
// (so they meet on hover) and inner ends reach a labeled sub-block.
type Stub = { net: string; at: { x: number; y: number }; dir: 1 | -1 };  // dir: +1 enters from left, -1 from right
type Block = { id: string; label: string; x: number; y: number; w: number; h: number };
function buildPreview(hostId: string, box: { x: number; y: number; w: number; h: number }, blocks: Block[], stubs: Stub[]) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('class', 'mini-bg');
  bg.setAttribute('x', String(box.x + 2)); bg.setAttribute('y', String(box.y + 2));
  bg.setAttribute('width', String(box.w - 4)); bg.setAttribute('height', String(box.h - 4));
  bg.setAttribute('rx', '12');
  host.appendChild(bg);
  for (const s of stubs) {
    const w = document.createElementNS(SVG_NS, 'polyline');
    w.setAttribute('class', 'wire-mini');
    w.setAttribute('data-net', s.net);
    w.setAttribute('data-on', '0');
    w.setAttribute('points', `${s.at.x},${s.at.y} ${s.at.x + s.dir * 42},${s.at.y}`);
    host.appendChild(w);
  }
  for (const b of blocks) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('id', b.id);
    r.setAttribute('x', String(b.x)); r.setAttribute('y', String(b.y));
    r.setAttribute('width', String(b.w)); r.setAttribute('height', String(b.h));
    r.setAttribute('rx', '8');
    host.appendChild(r);
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini-tiny');
    t.setAttribute('x', String(b.x + b.w / 2)); t.setAttribute('y', String(b.y + b.h / 2));
    t.textContent = b.label;
    host.appendChild(t);
  }
}

buildPreview('regfileDetail', { x: 210, y: 175, w: 350, h: 630 },
  [
    { id: 'rfDec',  label: 'decoder', x: 250, y: 200, w: 100, h: 90 },
    { id: 'rfRegs', label: 'regs ×4', x: 250, y: 330, w: 100, h: 270 },
    { id: 'rfMuxA', label: 'MUX A',   x: 420, y: 300, w: 90, h: 100 },
    { id: 'rfMuxB', label: 'MUX B',   x: 420, y: 450, w: 90, h: 100 },
  ],
  [
    { net: 'raddrA', at: RF.raddrA, dir: 1 }, { net: 'raddrB', at: RF.raddrB, dir: 1 },
    { net: 'waddr', at: RF.waddr, dir: 1 }, { net: 'we', at: RF.we, dir: 1 },
    { net: 'clk', at: RF.clk, dir: 1 }, { net: 'wdata', at: RF.wdata, dir: 1 },
    { net: 'rdataA', at: RF.rdataA, dir: -1 }, { net: 'rdataB', at: RF.rdataB, dir: -1 },
  ]);

buildPreview('aluDetail', { x: 910, y: 210, w: 280, h: 350 },
  [
    { id: 'alAdd', label: '+',   x: 970, y: 238, w: 70, h: 50 },
    { id: 'alAnd', label: 'AND', x: 970, y: 298, w: 70, h: 38 },
    { id: 'alOr',  label: 'OR',  x: 970, y: 346, w: 70, h: 38 },
    { id: 'alXor', label: 'XOR', x: 970, y: 394, w: 70, h: 38 },
    { id: 'alMux', label: 'MUX', x: 1080, y: 300, w: 60, h: 120 },
  ],
  [
    { net: 'op', at: AL.op, dir: 1 }, { net: 'A', at: AL.A, dir: 1 },
    { net: 'B', at: AL.B, dir: 1 }, { net: 'Y', at: AL.Y, dir: -1 },
  ]);

// ── Per-wire pulse overlays.
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
const setPin = (id: string, on: Bit) => document.getElementById(id)?.setAttribute('data-on', String(on));
const setBody = (id: string, on: Bit) => document.getElementById(id)?.setAttribute('data-on', String(on));
function setMini(net: string, on: Bit) {
  svg.querySelectorAll<SVGElement>(`.wire-mini[data-net="${net}"]`).forEach((el) => el.setAttribute('data-on', String(on)));
}
function setBtn(id: string, label: string, v: Bit) {
  const b = document.getElementById(id) as HTMLButtonElement | null;
  if (!b) return;
  b.setAttribute('data-on', String(v));
  b.textContent = `${label} ${v}`;
}
const T = (id: string) => document.getElementById(id) as HTMLElement;

function aluOut(A: Bit, B: Bit, op: number): Bit {
  return [(A ^ B) as Bit, (A & B) as Bit, (A | B) as Bit, (A ^ B) as Bit][op];  // 1-bit: add sum = A^B (Cin=0)
}

function render() {
  const rAidx = rA1 * 2 + rA0, rBidx = rB1 * 2 + rB0, op = op1 * 2 + op0;
  const A = mem[rAidx], B = mem[rBidx];
  const Y = aluOut(A, B, op);

  // Input nets + pins
  setNet('op', (op1 || op0) as Bit); setPin('pinOp', (op1 || op0) as Bit);
  setNet('raddrA', (rA1 || rA0) as Bit); setPin('pinRaddrA', (rA1 || rA0) as Bit);
  setNet('raddrB', (rB1 || rB0) as Bit); setPin('pinRaddrB', (rB1 || rB0) as Bit);
  setNet('waddr', (w1 || w0) as Bit); setPin('pinWaddr', (w1 || w0) as Bit);
  setNet('we', we); setPin('pinWe', we);
  setNet('clk', clk); setPin('pinClk', clk);
  // Data nets
  setNet('rdataA', A);
  setNet('rdataB', B);
  setNet('Y', Y); setNet('result', Y); setPin('pinResult', Y);

  // Block glows
  setBody('gRegfile', (A || B) as Bit);
  setBody('gAlu', Y);

  // Preview state (block-diagram minis).
  setMini('rdataA', A); setMini('rdataB', B); setMini('we', we); setMini('clk', clk);
  setBody('rfRegs', (mem[0] || mem[1] || mem[2] || mem[3]) as Bit);
  setBody('rfDec', we);
  setBody('rfMuxA', A); setBody('rfMuxB', B);
  setMini('A', A); setMini('B', B); setMini('Y', Y); setMini('op', (op1 || op0) as Bit);
  setBody('alAdd', op === 0 ? Y : 0); setBody('alAnd', op === 1 ? Y : 0);
  setBody('alOr', op === 2 ? Y : 0); setBody('alXor', op === 3 ? Y : 0);
  setBody('alMux', Y);

  // Buttons
  setBtn('btnRaddrA1', 'a1', rA1); setBtn('btnRaddrA0', 'a0', rA0);
  setBtn('btnRaddrB1', 'b1', rB1); setBtn('btnRaddrB0', 'b0', rB0);
  setBtn('btnWaddr1', 'w1', w1); setBtn('btnWaddr0', 'w0', w0); setBtn('btnWe', 'we', we);
  setBtn('btnOp1', 'op1', op1); setBtn('btnOp0', 'op0', op0);

  // Readouts
  T('memBits').textContent = `r0=${mem[0]} r1=${mem[1]} r2=${mem[2]} r3=${mem[3]}`;
  T('aBit').textContent = String(A);
  T('bBit').textContent = String(B);
  T('opName').textContent = OP_NAMES[op];
  T('yBit').textContent = String(Y);
}

function persist() {
  saveSnapshot<DpSnap>(SNAP_KEY, { mem: [...mem] as Bit[], rA1, rA0, rB1, rB0, w1, w0, we, op1, op0 });
}

// run cycle: on the clock edge, if we=1, the ALU result latches into waddr.
function runCycle() {
  clk = 0; render();
  setTimeout(() => {
    clk = 1;
    const op = op1 * 2 + op0;
    const Y = aluOut(mem[rA1 * 2 + rA0], mem[rB1 * 2 + rB0], op);
    if (we) mem[w1 * 2 + w0] = Y;
    render(); persist();
  }, 220);
  setTimeout(() => { clk = 0; render(); persist(); }, 1100);
}

const toggle = (set: (v: Bit) => void, get: () => Bit) => () => { set((get() ? 0 : 1) as Bit); render(); persist(); };
document.getElementById('btnRaddrA1')!.addEventListener('click', toggle((v) => rA1 = v, () => rA1));
document.getElementById('btnRaddrA0')!.addEventListener('click', toggle((v) => rA0 = v, () => rA0));
document.getElementById('btnRaddrB1')!.addEventListener('click', toggle((v) => rB1 = v, () => rB1));
document.getElementById('btnRaddrB0')!.addEventListener('click', toggle((v) => rB0 = v, () => rB0));
document.getElementById('btnWaddr1')!.addEventListener('click', toggle((v) => w1 = v, () => w1));
document.getElementById('btnWaddr0')!.addEventListener('click', toggle((v) => w0 = v, () => w0));
document.getElementById('btnWe')!.addEventListener('click', toggle((v) => we = v, () => we));
document.getElementById('btnOp1')!.addEventListener('click', toggle((v) => op1 = v, () => op1));
document.getElementById('btnOp0')!.addEventListener('click', toggle((v) => op0 = v, () => op0));
document.getElementById('btnStep')!.addEventListener('click', runCycle);
document.getElementById('btnReset')!.addEventListener('click', () => {
  for (let i = 0; i < 4; i++) mem[i] = SEED[i];
  rA1 = 0; rA0 = 0; rB1 = 0; rB0 = 1; w1 = 1; w0 = 0; we = 0; op1 = 0; op0 = 0; clk = 0;
  clearSnapshot(SNAP_KEY); render();
});

// ── Drill-downs ──────────────────────────────────────────────────────
document.getElementById('slot-regfile')?.addEventListener('click', () => {
  const Y = aluOut(mem[rA1 * 2 + rA0], mem[rB1 * 2 + rB0], op1 * 2 + op0);
  window.location.assign(buildDrillUrl('/regfile.html', {
    from: 'datapath', which: 'regfile',
    raddr1: rA1, raddr0: rA0, raddrB1: rB1, raddrB0: rB0,
    waddr1: w1, waddr0: w0, we, wdata: Y,
  }));
});
document.getElementById('slot-alu')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/alu1.html', {
    from: 'datapath', which: 'alu',
    A: mem[rA1 * 2 + rA0], B: mem[rB1 * 2 + rB0], Cin: 0, op1, op0,
  }));
});

initDrillBreadcrumb();
render();

// ── Step walkthrough nav ─────────────────────────────────────────────
const steps = Array.from(document.querySelectorAll<HTMLElement>('.step'));
const stepPrev = document.getElementById('stepPrev') as HTMLButtonElement;
const stepNext = document.getElementById('stepNext') as HTMLButtonElement;
const stepNum = document.getElementById('stepNum')!;
const stepCount = document.getElementById('stepCount')!;
const stepPanel = document.querySelector('.step-panel') as HTMLElement;
const stepBodies = document.querySelector('.step-bodies') as HTMLElement;
stepCount.textContent = ` / ${steps.length}`;
let currentStep = 0;
// Shrink the active step's text just enough to fit the fixed-height panel —
// so the narrative never clips and never needs scrolling (same idea as the
// NAND page's fixed panel, made robust to viewport/zoom).
function fitStep() {
  if (!stepPanel || !stepBodies) return;
  let scale = 1;
  stepPanel.style.setProperty('--content-scale', '1');
  const active = steps[currentStep];
  for (let n = 0; n < 8 && active && active.scrollHeight > stepBodies.clientHeight && scale > 0.72; n++) {
    scale -= 0.05;
    stepPanel.style.setProperty('--content-scale', scale.toFixed(2));
  }
}
function showStep(i: number) {
  currentStep = Math.max(0, Math.min(steps.length - 1, i));
  steps.forEach((s, idx) => s.toggleAttribute('hidden', idx !== currentStep));
  stepNum.textContent = String(currentStep + 1);
  stepPrev.disabled = currentStep === 0;
  stepNext.disabled = currentStep === steps.length - 1;
  fitStep();
}
window.addEventListener('resize', fitStep);
stepPrev.addEventListener('click', () => showStep(currentStep - 1));
stepNext.addEventListener('click', () => showStep(currentStep + 1));
showStep(0);

initPanel();
initToc();
