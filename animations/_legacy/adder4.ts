import { initPanel } from "./panel";
import { initToc } from "./toc";
// 4-bit ripple-carry adder: four full adders chained left-to-right.
//   FA0 is the LSB (leftmost) so the carry chain flows naturally LSB → MSB,
//   i.e. each FA's right-edge Cout feeds the next FA's left-edge Cin.
//
// The hover overlay on each FA is a LITERAL scaled-down copy of the standalone
// /fulladder.html content — same HA1, HA2, OR sub-boxes at the same positions,
// same internal wires, same wire labels. The shared mini geometry is declared
// once below and is identical to the standalone page's geometry.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const svg = document.getElementById('adder4') as unknown as SVGSVGElement;
const aBitsEl   = document.getElementById('aBits')!;
const bBitsEl   = document.getElementById('bBits')!;
const sumBitsEl = document.getElementById('sumBits')!;
const aDecEl    = document.getElementById('aDec')!;
const bDecEl    = document.getElementById('bDec')!;
const sumDecEl  = document.getElementById('sumDec')!;

const A: Bit[] = [0, 0, 0, 0];
const B: Bit[] = [0, 0, 0, 0];
let Cin: Bit = 0;

// ── FA mini geometry (copied verbatim from fulladder.html) ───────────
// Local coords use the standalone FA's scene: 0..1020 wide × 0..560 tall.
// Each piece is exactly what the standalone page draws. When this group is
// translated+scaled into a 255×140 parent box, the external terminals land
// on the parent's wire endpoints to the pixel.
const FA_LOCAL_W = 1020;
const FA_LOCAL_H = 560;

const FA_MINI_WIRES: { net: string; points: string; alwaysOn?: boolean }[] = [
  { net: 'Vdd', alwaysOn: true, points: '0,0 1020,0' },
  { net: 'GND', points: '0,560 1020,560' },
  { net: 'A',     points: '0,100 180,100' },
  { net: 'B',     points: '0,180 180,180' },
  { net: 'Cin',   points: '0,380 60,380 60,40 505,40 505,180 530,180' },
  { net: 'sum1',  points: '420,100 530,100' },
  { net: 'c1',    points: '420,180 460,180 460,320 530,320' },
  { net: 'c2',    points: '770,180 810,180 810,460 490,460 490,400 530,400' },
  { net: 'S',     points: '770,100 1020,100' },
  { net: 'Cout',  points: '730,360 1020,360' },
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

interface SlotBox { x: number; y: number; w: number; h: number; }
const FA_BOXES: Record<string, SlotBox> = {
  fa0: { x: 60,  y: 200, w: 255, h: 140 },
  fa1: { x: 345, y: 200, w: 255, h: 140 },
  fa2: { x: 630, y: 200, w: 255, h: 140 },
  fa3: { x: 915, y: 200, w: 255, h: 140 },
};

function buildFaMini(slot: string, box: SlotBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', slot);
  const sx = box.w / FA_LOCAL_W;
  const sy = box.h / FA_LOCAL_H;
  g.setAttribute('transform', `translate(${box.x}, ${box.y}) scale(${sx}, ${sy})`);

  // Backing panel so the mini reads as one unit
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('class', 'mini-bg');
  bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
  bg.setAttribute('width',  String(FA_LOCAL_W));
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
  for (const b of FA_MINI_SUBBOXES) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', b.tid);
    r.setAttribute('x', String(b.x));
    r.setAttribute('y', String(b.y));
    r.setAttribute('width',  String(b.w));
    r.setAttribute('height', String(b.h));
    r.setAttribute('rx', '12');
    g.appendChild(r);
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini');
    t.setAttribute('data-tid', b.tid);
    t.setAttribute('x', String(b.lx));
    t.setAttribute('y', String(b.ly));
    t.textContent = b.tid;
    g.appendChild(t);
  }
  for (const l of FA_MINI_WIRELABELS) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini-tiny');
    t.setAttribute('x', String(l.x));
    t.setAttribute('y', String(l.y));
    t.textContent = l.text;
    g.appendChild(t);
  }
  return g;
}

for (const slot of Object.keys(FA_BOXES)) {
  document.getElementById(`slot-${slot}`)
    ?.appendChild(buildFaMini(slot, FA_BOXES[slot]));
}

function setFaMiniState(slot: string, a: Bit, b: Bit, cin: Bit) {
  const root = svg.querySelector(`g.detailed[data-slot="${slot}"]`);
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
  root.querySelector(`.tbody-mini[data-tid="HA1"]`)
    ?.setAttribute('data-on', String((sum1 || c1) ? 1 : 0));
  root.querySelector(`.tbody-mini[data-tid="HA2"]`)
    ?.setAttribute('data-on', String((S || c2) ? 1 : 0));
  root.querySelector(`.tbody-mini[data-tid="OR"]`)
    ?.setAttribute('data-on', String(Cout));
}

// ── Pulse overlay for wires ──────────────────────────────────────────
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
function setAttr(selector: string, on: Bit) {
  svg.querySelectorAll(selector).forEach((el) => {
    (el as Element).setAttribute('data-on', String(on));
    const p = pulseFor.get(el as SVGPolylineElement);
    if (p) p.setAttribute('data-on', String(on));
  });
}
function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function render() {
  const carryIn: Bit[] = [0, 0, 0, 0];
  const S: Bit[] = [0, 0, 0, 0];
  let carry: Bit = Cin;
  for (let i = 0; i < 4; i++) {
    carryIn[i] = carry;
    const a = A[i], b = B[i];
    S[i] = (a ^ b ^ carry) as Bit;
    carry = ((a & b) | (a & carry) | (b & carry)) as Bit;
  }
  const Cout: Bit = carry;

  for (let i = 0; i < 4; i++) {
    setAttr(`.wire[data-net="A${i}"]`, A[i]);
    setAttr(`.wire[data-net="B${i}"]`, B[i]);
    setAttr(`.wire[data-net="S${i}"]`, S[i]);
  }
  setAttr('.wire[data-net="Cin"]',  Cin);
  setAttr('.wire[data-net="C01"]',  carryIn[1]);
  setAttr('.wire[data-net="C12"]',  carryIn[2]);
  setAttr('.wire[data-net="C23"]',  carryIn[3]);
  setAttr('.wire[data-net="Cout"]', Cout);

  // FA simple bodies glow if any of their outputs is high
  for (let i = 0; i < 4; i++) {
    const outCarry: Bit = i === 3 ? Cout : (carryIn[i + 1] as Bit);
    const on: Bit = (S[i] || outCarry) ? 1 : 0;
    document.getElementById(`gFa${i}`)!.setAttribute('data-on', String(on));
    setFaMiniState(`fa${i}`, A[i], B[i], carryIn[i]);
  }

  for (let i = 0; i < 4; i++) {
    document.getElementById(`pinA${i}`)!.setAttribute('data-on', String(A[i]));
    document.getElementById(`pinB${i}`)!.setAttribute('data-on', String(B[i]));
    document.getElementById(`pinS${i}`)!.setAttribute('data-on', String(S[i]));
  }
  document.getElementById('pinCin')!.setAttribute('data-on',  String(Cin));
  document.getElementById('pinCout')!.setAttribute('data-on', String(Cout));

  const aStr = `${A[3]}${A[2]}${A[1]}${A[0]}`;
  const bStr = `${B[3]}${B[2]}${B[1]}${B[0]}`;
  const sumStr = `${Cout}${S[3]}${S[2]}${S[1]}${S[0]}`;
  const aDec = A[3] * 8 + A[2] * 4 + A[1] * 2 + A[0];
  const bDec = B[3] * 8 + B[2] * 4 + B[1] * 2 + B[0];
  aBitsEl.textContent = aStr;
  bBitsEl.textContent = bStr;
  sumBitsEl.textContent = sumStr;
  aDecEl.textContent   = String(aDec);
  bDecEl.textContent   = String(bDec);
  sumDecEl.textContent = String(aDec + bDec + Cin);

  for (let i = 0; i < 4; i++) {
    setBtn(document.getElementById(`btnA${i}`) as HTMLButtonElement, `A${i}`, A[i]);
    setBtn(document.getElementById(`btnB${i}`) as HTMLButtonElement, `B${i}`, B[i]);
  }
  setBtn(document.getElementById('btnCin') as HTMLButtonElement, 'Cin', Cin);
}

for (let i = 0; i < 4; i++) {
  const ba = document.getElementById(`btnA${i}`) as HTMLButtonElement;
  ba.addEventListener('click', () => { A[i] = A[i] === 0 ? 1 : 0; render(); });
  const bb = document.getElementById(`btnB${i}`) as HTMLButtonElement;
  bb.addEventListener('click', () => { B[i] = B[i] === 0 ? 1 : 0; render(); });
}
(document.getElementById('btnCin') as HTMLButtonElement)
  .addEventListener('click', () => { Cin = Cin === 0 ? 1 : 0; render(); });
(document.getElementById('btnReset') as HTMLButtonElement)
  .addEventListener('click', () => {
    for (let i = 0; i < 4; i++) { A[i] = 0; B[i] = 0; }
    Cin = 0; render();
  });

render();

// Step-through walkthrough nav
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
