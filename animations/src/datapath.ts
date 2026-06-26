import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
import { applyWireColors } from "./wireColors";

// Symbol → wire colour: tie each read port's address + operand to one hue, the
// op select to another, the ALU result to its own — so the read→operate→write
// loop is traceable at a glance.
const WIRE_COLORS: Record<string, string> = {
  clk: "#56ccf2",
  we: "#ff6fae",
  waddr0: "#6f8cff", waddr1: "#6f8cff",
  raddrA0: "#57e08b", raddrA1: "#57e08b", rdata: "#57e08b",
  raddrB0: "#2fcfc7", raddrB1: "#2fcfc7", rdataB: "#2fcfc7",
  op0: "#ffcf3a", op1: "#ffcf3a",
  Y: "#ff8a3d", result: "#ff8a3d",
};

// Datapath — register file (2 read ports + 1 write) wired to a 1-bit ALU as
// the read→operate→write-back loop of `add x3, x1, x2`. Hovering a block shows
// an EXACT copy of that page's diagram (embedPreview), and every datapath wire
// is routed ONTO that embedded copy's real, projected pins — so the lines
// genuinely connect to the component's terminals (verified by
// tests/preview-fidelity.test.mjs).

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('datapath') as unknown as SVGSVGElement;

type DpSnap = { mem: Bit[]; rA1: Bit; rA0: Bit; rB1: Bit; rB0: Bit; w1: Bit; w0: Bit; we: Bit; op1: Bit; op0: Bit };
const SNAP_KEY = 'datapath';
const SEED: Bit[] = [1, 0, 0, 0];
const _snap = loadSnapshot<DpSnap>(SNAP_KEY);
const mem: Bit[] = [0, 1, 2, 3].map((i) => (_snap?.mem?.[i] ?? SEED[i]) as Bit);
let rA1: Bit = readBitParam('raddrA1', _snap?.rA1 ?? 0);
let rA0: Bit = readBitParam('raddrA0', _snap?.rA0 ?? 0);
let rB1: Bit = readBitParam('raddrB1', _snap?.rB1 ?? 0);
let rB0: Bit = readBitParam('raddrB0', (_snap?.rB0 ?? 1) as Bit);
let w1: Bit  = readBitParam('waddr1', (_snap?.w1 ?? 1) as Bit);
let w0: Bit  = readBitParam('waddr0', (_snap?.w0 ?? 1) as Bit);
let we: Bit  = readBitParam('we', _snap?.we ?? 0);
let op1: Bit = readBitParam('op1', _snap?.op1 ?? 0);
let op0: Bit = readBitParam('op0', _snap?.op0 ?? 0);
let clk: Bit = 0;
const OP_NAMES = ['ADD', 'AND', 'OR', 'XOR'];

// ── Embed the real child diagrams; get their projected pin positions. ──────
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const RF: Record<string, Pt> = embeds.get('slot-regfile') || {};
const AL: Record<string, Pt> = embeds.get('slot-alu') || {};

const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
function placePin(id: string, x: number, y: number, side: 'L' | 'R') {
  const c = document.getElementById(id);
  if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
  const t = document.querySelector(`[data-pin="${id}"]`);
  if (t) { t.setAttribute('x', String(x + (side === 'L' ? -18 : 18))); t.setAttribute('y', String(y)); }
}

// Regfile control inputs: external pin (LEFT) → lane → the embedded regfile's
// real pin (its endpoint lands exactly on that pin).
const RF_IN: [string, string, { x: number; y: number }, number, number][] = [
  ['pinRaddr1', 'wRaddr1', RF.pinRaddrA1, 210, 34], ['pinRaddr0', 'wRaddr0', RF.pinRaddrA0, 252, 46],
  ['pinRaddrB1', 'wRaddrB1', RF.pinRaddrB1, 312, 58], ['pinRaddrB0', 'wRaddrB0', RF.pinRaddrB0, 354, 70],
  ['pinWaddr1', 'wWaddr1', RF.pinWaddr1, 430, 82], ['pinWaddr0', 'wWaddr0', RF.pinWaddr0, 472, 94],
  ['pinWe', 'wWe', RF.pinWe, 538, 106], ['pinClk', 'wClk', RF.pinClk, 612, 118],
];
for (const [pid, wid, p, extY, lane] of RF_IN) {
  if (!p) continue;
  placePin(pid, 0, extY, 'L');
  setW(wid, `0,${extY} ${lane},${extY} ${lane},${p.y} ${p.x},${p.y}`);
}
// op selects: external pin (LEFT) → over the top → the embedded ALU's op pins.
if (AL.pinOp1) { placePin('pinOp1', 0, 110, 'L'); setW('wOp1', `0,110 24,110 24,30 1402,30 1402,${AL.pinOp1.y} ${AL.pinOp1.x},${AL.pinOp1.y}`); }
if (AL.pinOp0) { placePin('pinOp0', 0, 150, 'L'); setW('wOp0', `0,150 12,150 12,16 1390,16 1390,${AL.pinOp0.y} ${AL.pinOp0.x},${AL.pinOp0.y}`); }
// Data flow: regfile reads → ALU operands; ALU result → write-back + out.
if (RF.pinRdata && AL.pinA) setW('wRdata', `${RF.pinRdata.x},${RF.pinRdata.y} 1320,${RF.pinRdata.y} 1320,${AL.pinA.y} ${AL.pinA.x},${AL.pinA.y}`);
if (RF.pinRdataB && AL.pinB) setW('wRdataB', `${RF.pinRdataB.x},${RF.pinRdataB.y} 1346,${RF.pinRdataB.y} 1346,${AL.pinB.y} ${AL.pinB.x},${AL.pinB.y}`);
if (AL.pinCin) setW('wCin', `${AL.pinCin.x},${AL.pinCin.y} 1400,${AL.pinCin.y} 1400,760`);   // Cin tied to GND (0)
let tapX = 2078, resultX = 2110;
if (AL.pinY) {
  tapX = AL.pinY.x + 80;
  setW('wY', `${AL.pinY.x},${AL.pinY.y} ${tapX},${AL.pinY.y}`);
  setW('wResult', `${tapX},${AL.pinY.y} ${resultX},${AL.pinY.y}`);
  placePin('pinResult', resultX, AL.pinY.y, 'R');
  if (RF.pinWdata) setW('wWdata', `${tapX},${AL.pinY.y} ${tapX},720 90,720 90,${RF.pinWdata.y} ${RF.pinWdata.x},${RF.pinWdata.y}`);
}
if (AL.pinCout) { setW('wCout', `${AL.pinCout.x},${AL.pinCout.y} ${resultX},${AL.pinCout.y}`); placePin('pinCout', resultX, AL.pinCout.y, 'R'); }

// ── Per-wire pulse overlays (datapath's own wires only — not the embeds). ──
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('polyline.wire')).filter((w) => !w.closest('.detailed'));
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
applyWireColors(svg, WIRE_COLORS);
function setNet(net: string, on: Bit) {
  for (const w of wires) if (w.getAttribute('data-net') === net) {
    w.setAttribute('data-on', String(on));
    pulseFor.get(w)?.setAttribute('data-on', String(on));
  }
}
const setPin = (id: string, on: Bit) => document.getElementById(id)?.setAttribute('data-on', String(on));
const setBody = (id: string, on: Bit) => document.getElementById(id)?.setAttribute('data-on', String(on));
// Light the embedded child's wires (by data-net) AND component bodies (by
// data-body — the body's original id), scoped to the host, so the preview
// matches the real page's lit state instead of showing dark boxes.
function lightEmbed(hostId: string, wireMap: Record<string, number>, bodyMap: Record<string, number> = {}) {
  const host = document.getElementById(hostId);
  if (!host) return;
  for (const net in wireMap)
    host.querySelectorAll<SVGElement>(`.wire[data-net="${net}"]`).forEach((el) => el.setAttribute('data-on', String(wireMap[net])));
  for (const id in bodyMap)
    host.querySelector<SVGElement>(`[data-body="${id}"]`)?.setAttribute('data-on', String(bodyMap[id]));
}
function setBtn(id: string, label: string, v: Bit) {
  const b = document.getElementById(id) as HTMLButtonElement | null;
  if (!b) return;
  b.setAttribute('data-on', String(v));
  b.textContent = `${label} ${v}`;
}
const T = (id: string) => document.getElementById(id) as HTMLElement;

function aluOut(A: Bit, B: Bit, op: number): Bit {
  return [(A ^ B) as Bit, (A & B) as Bit, (A | B) as Bit, (A ^ B) as Bit][op];
}

function render() {
  const rAidx = rA1 * 2 + rA0, rBidx = rB1 * 2 + rB0, op = op1 * 2 + op0;
  const A = mem[rAidx], B = mem[rBidx], Y = aluOut(A, B, op);

  // datapath wire nets + input pins
  setNet('raddrA1', rA1); setPin('pinRaddr1', rA1); setNet('raddrA0', rA0); setPin('pinRaddr0', rA0);
  setNet('raddrB1', rB1); setPin('pinRaddrB1', rB1); setNet('raddrB0', rB0); setPin('pinRaddrB0', rB0);
  setNet('waddr1', w1); setPin('pinWaddr1', w1); setNet('waddr0', w0); setPin('pinWaddr0', w0);
  setNet('we', we); setPin('pinWe', we); setNet('clk', clk); setPin('pinClk', clk);
  setNet('op1', op1); setPin('pinOp1', op1); setNet('op0', op0); setPin('pinOp0', op0);
  setNet('rdata', A); setNet('rdataB', B); setNet('Cin', 0);
  setNet('Y', Y); setNet('result', Y); setPin('pinResult', Y);
  setNet('Cout', (op === 0 ? (A & B) : 0) as Bit); setPin('pinCout', (op === 0 ? (A & B) : 0) as Bit);
  setBody('gRegfile', (A || B) as Bit); setBody('gAlu', Y);

  // Light the embedded diagrams to match state (live exact copies).
  const wen = [0, 0, 0, 0]; if (we) wen[w1 * 2 + w0] = 1;
  lightEmbed('regfileDetail', {
    raddrA1: rA1, raddrA0: rA0, raddrB1: rB1, raddrB0: rB0, waddr1: w1, waddr0: w0, we, clk, wdata: Y,
    q0: mem[0], q1: mem[1], q2: mem[2], q3: mem[3], rdata: A, rdataB: B,
    wen0: wen[0], wen1: wen[1], wen2: wen[2], wen3: wen[3],
    gclk0: clk && wen[0], gclk1: clk && wen[1], gclk2: clk && wen[2], gclk3: clk && wen[3],
  }, {
    gDecoder: we, gReg0: mem[0], gReg1: mem[1], gReg2: mem[2], gReg3: mem[3],
    gAnd0: wen[0], gAnd1: wen[1], gAnd2: wen[2], gAnd3: wen[3], gMux: A, gMuxB: B,
  });
  lightEmbed('aluDetail', {
    op1, op0, Cin: 0, A, B, add: A ^ B, and: A & B, or: A | B, xor: A ^ B, Cout: A & B, Y,
  }, {
    gFa: ((A ^ B) | (A & B)) as Bit, gAnd: A & B, gOr: A | B, gXor: A ^ B, gMux: Y,
  });

  setBtn('btnRaddrA1', 'a1', rA1); setBtn('btnRaddrA0', 'a0', rA0);
  setBtn('btnRaddrB1', 'b1', rB1); setBtn('btnRaddrB0', 'b0', rB0);
  setBtn('btnWaddr1', 'w1', w1); setBtn('btnWaddr0', 'w0', w0); setBtn('btnWe', 'we', we);
  setBtn('btnOp1', 'op1', op1); setBtn('btnOp0', 'op0', op0);

  T('memBits').textContent = `r0=${mem[0]} r1=${mem[1]} r2=${mem[2]} r3=${mem[3]}`;
  T('aBit').textContent = String(A); T('bBit').textContent = String(B);
  T('opName').textContent = OP_NAMES[op]; T('yBit').textContent = String(Y);
}

function persist() {
  saveSnapshot<DpSnap>(SNAP_KEY, { mem: [...mem] as Bit[], rA1, rA0, rB1, rB0, w1, w0, we, op1, op0 });
}
function runCycle() {
  clk = 0; render();
  setTimeout(() => {
    clk = 1;
    const Y = aluOut(mem[rA1 * 2 + rA0], mem[rB1 * 2 + rB0], op1 * 2 + op0);
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
  rA1 = 0; rA0 = 0; rB1 = 0; rB0 = 1; w1 = 1; w0 = 1; we = 0; op1 = 0; op0 = 0; clk = 0;
  clearSnapshot(SNAP_KEY); render();
});

document.getElementById('slot-regfile')?.addEventListener('click', () => {
  const Y = aluOut(mem[rA1 * 2 + rA0], mem[rB1 * 2 + rB0], op1 * 2 + op0);
  window.location.assign(buildDrillUrl('/regfile.html', {
    from: 'datapath', which: 'regfile',
    raddrA1: rA1, raddrA0: rA0, raddrB1: rB1, raddrB0: rB0, waddr1: w1, waddr0: w0, we, wdata: Y,
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

initCanvasZoom();
initSteps();

initPanel();
initToc();
