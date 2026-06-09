import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
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

type Adder4Snap = { A: Bit[]; B: Bit[]; Cin: Bit };
const SNAP_KEY = 'adder4';
const _snap = loadSnapshot<Adder4Snap>(SNAP_KEY);
const A: Bit[] = [
  readBitParam('A0', _snap?.A?.[0] ?? 0),
  readBitParam('A1', _snap?.A?.[1] ?? 0),
  readBitParam('A2', _snap?.A?.[2] ?? 0),
  readBitParam('A3', _snap?.A?.[3] ?? 0),
];
const B: Bit[] = [
  readBitParam('B0', _snap?.B?.[0] ?? 0),
  readBitParam('B1', _snap?.B?.[1] ?? 0),
  readBitParam('B2', _snap?.B?.[2] ?? 0),
  readBitParam('B3', _snap?.B?.[3] ?? 0),
];
let Cin: Bit = readBitParam('Cin', _snap?.Cin ?? 0);

// ── Embed an exact copy of /fulladder.html per FA cell and route every wire
// onto the embedded full-adders' projected pins (ripple carry FA0→FA3). ───
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const FA: Record<string, Pt>[] = [0, 1, 2, 3].map((i) => embeds.get(`slot-fa${i}`) || {});
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
const placePin = (id: string, x: number, y: number) => {
  const c = document.getElementById(id);
  if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
};
if (FA.every((f) => f.pinA && f.pinB && f.pinCin && f.pinS && f.pinCout)) {
  for (let i = 0; i < 4; i++) {
    const f = FA[i];
    setW(`wA${i}`, `-30,${f.pinA.y} ${f.pinA.x},${f.pinA.y}`); placePin(`pinA${i}`, -30, f.pinA.y);
    setW(`wB${i}`, `-30,${f.pinB.y} ${f.pinB.x},${f.pinB.y}`); placePin(`pinB${i}`, -30, f.pinB.y);
    setW(`wS${i}`, `${f.pinS.x},${f.pinS.y} 900,${f.pinS.y}`); placePin(`pinS${i}`, 900, f.pinS.y);
  }
  // External Cin → FA0.Cin
  setW('wCin', `-30,${FA[0].pinCin.y} ${FA[0].pinCin.x},${FA[0].pinCin.y}`);
  placePin('pinCin', -30, FA[0].pinCin.y);
  // Ripple carry: FA_n.Cout → FA_{n+1}.Cin, up the right rail (x=970) and back
  // in on the left (x=180), through the gap between the two boxes.
  const gapY = [832, 552, 272];  // gaps between FA0/1, FA1/2, FA2/3
  for (let i = 0; i < 3; i++) {
    const src = FA[i].pinCout, dst = FA[i + 1].pinCin;
    setW(`wC${i}${i + 1}`,
      `${src.x},${src.y} 970,${src.y} 970,${gapY[i]} 180,${gapY[i]} 180,${dst.y} ${dst.x},${dst.y}`);
  }
  // FA3.Cout → external Cout
  setW('wCout', `${FA[3].pinCout.x},${FA[3].pinCout.y} 1000,${FA[3].pinCout.y}`);
  placePin('pinCout', 1000, FA[3].pinCout.y);
}

// Light an embedded full adder to its logical state.
function lightFa(hostId: string, a: Bit, b: Bit, cin: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const sum1: Bit = (a ^ b) as Bit;
  const carry1: Bit = (a & b) as Bit;
  const S: Bit = (sum1 ^ cin) as Bit;
  const carry2: Bit = (sum1 & cin) as Bit;
  const Cout: Bit = (carry1 | carry2) as Bit;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('A', a); w('B', b); w('Cin', cin); w('sum1', sum1); w('carry1', carry1); w('carry2', carry2); w('S', S); w('Cout', Cout);
  body('gHa1', (sum1 || carry1) ? 1 : 0); body('gHa2', (S || carry2) ? 1 : 0); body('gOr', Cout);
}

// ── Pulse overlay for wires (exclude embedded children) ──────────────
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
    lightFa(`fa${i}Detail`, A[i], B[i], carryIn[i]);
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

function persist() {
  saveSnapshot<Adder4Snap>(SNAP_KEY, { A: [...A] as Bit[], B: [...B] as Bit[], Cin });
}

for (let i = 0; i < 4; i++) {
  const ba = document.getElementById(`btnA${i}`) as HTMLButtonElement;
  ba.addEventListener('click', () => { A[i] = A[i] === 0 ? 1 : 0; render(); persist(); });
  const bb = document.getElementById(`btnB${i}`) as HTMLButtonElement;
  bb.addEventListener('click', () => { B[i] = B[i] === 0 ? 1 : 0; render(); persist(); });
}
(document.getElementById('btnCin') as HTMLButtonElement)
  .addEventListener('click', () => { Cin = Cin === 0 ? 1 : 0; render(); persist(); });
(document.getElementById('btnReset') as HTMLButtonElement)
  .addEventListener('click', () => {
    for (let i = 0; i < 4; i++) { A[i] = 0; B[i] = 0; }
    Cin = 0;
    clearSnapshot(SNAP_KEY);
    render();
  });

// ── Drill-down: click any FA cell to view it standalone ──────────────
// FA_n receives A[n], B[n], and the carry-in computed by ripple from
// FA_{n-1}. FA_0's Cin is the external Cin.
function carryChain(): Bit[] {
  // c[0] = Cin, c[i+1] = full-adder carry-out of bit i.
  const c: Bit[] = new Array(5).fill(0) as Bit[];
  c[0] = Cin;
  for (let i = 0; i < 4; i++) {
    const sum1: Bit = ((A[i] ^ B[i]) & 1) as Bit;
    const carry1: Bit = ((A[i] & B[i]) & 1) as Bit;
    const carry2: Bit = ((sum1 & c[i]) & 1) as Bit;
    c[i + 1] = ((carry1 | carry2) & 1) as Bit;
  }
  return c;
}
for (let i = 0; i < 4; i++) {
  document.getElementById(`slot-fa${i}`)?.addEventListener('click', () => {
    const c = carryChain();
    window.location.assign(buildDrillUrl('/fulladder.html', {
      from: 'adder4', which: `FA${i}`, A: A[i], B: B[i], Cin: c[i],
    }));
  });
}

initDrillBreadcrumb();

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
