import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";

// Program counter: 4-bit register + 4-bit adder + feedback loop.
//
// State is a single 4-bit value PC; the adder's output is always
// (PC + STEP) mod 16, computed live between clock edges. On the rising
// edge of CLK, the register snapshots the adder's output → PC := PC + STEP.
//
// STEP is toggleable between 1 (single-step demo) and 4 (RV32I-style
// word-aligned fetch, advancing by one 4-byte instruction per cycle).

type Bit = 0 | 1;

const btnCLK   = document.getElementById('btnCLK')   as HTMLButtonElement;
const btnPulse = document.getElementById('btnPulse') as HTMLButtonElement;
const btnStep  = document.getElementById('btnStep')  as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg      = document.getElementById('counter')  as unknown as SVGSVGElement;
const pcBits   = document.getElementById('pcBits')   as HTMLElement;
const pcDec    = document.getElementById('pcDec')    as HTMLElement;
const nextBits = document.getElementById('nextBits') as HTMLElement;
const loopTag    = document.getElementById('loopTag')       as unknown as SVGTextElement;

type PcSnap = { PC: number; CLK: Bit; STEP: 1 | 4 };
const SNAP_KEY = 'counter';
const _snap = loadSnapshot<PcSnap>(SNAP_KEY);
let PC = _snap?.PC ?? 0;             // 0..15
let CLK: Bit = _snap?.CLK ?? 0;
let prevCLK: Bit = 0;
let STEP: 1 | 4 = (_snap?.STEP === 4 ? 4 : 1);

function bitOf(n: number, i: number): Bit {
  return ((n >> i) & 1) as Bit;
}
function bitsOf(n: number): string {
  return `${bitOf(n, 3)}${bitOf(n, 2)}${bitOf(n, 1)}${bitOf(n, 0)}`;
}

// ── Embed EXACT copies of /register.html and /adder4.html in the two slots,
// and route every counter wire onto the embedded children's projected pins.
//   register: D ← adder.S (feedback), Q → adder.A, CLK shared
//   adder:    A ← register.Q, B = STEP constant (tied), Cin = 0 (GND),
//             S → register.D, Cout unused
// ──────────────────────────────────────────────────────────────────────────
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const REG: Record<string, Pt> = embeds.get('slot-register') || {};
const ADD: Record<string, Pt> = embeds.get('slot-adder')    || {};
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
const placePin = (id: string, x: number, y: number) => {
  const c = document.getElementById(id);
  if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
};

const regReady = [0, 1, 2, 3].every((i) => REG[`pinD${i}`] && REG[`pinQ${i}`]) && REG.pinCLK;
const addReady = [0, 1, 2, 3].every((i) => ADD[`pinA${i}`] && ADD[`pinB${i}`] && ADD[`pinS${i}`])
  && ADD.pinCin && ADD.pinCout;
if (regReady && addReady) {
  // CLK → register top
  setW('wCLK', `270,30 270,${REG.pinCLK.y} ${REG.pinCLK.x},${REG.pinCLK.y}`);
  placePin('pinCLK', 270, 30);

  // Lane constants for the S→D feedback loop below the boxes (staggered so
  // the four lanes don't overlap). Index 0 = bit0 (innermost).
  const railX   = [1200, 1220, 1240, 1260];
  const bottomY = [660, 680, 700, 720];
  const leftX   = [75, 60, 40, 20];

  for (let i = 0; i < 4; i++) {
    // Q (register.Q) → adder.A, bending in the gap between the boxes
    setW(`wQ${i}`,
      `${REG[`pinQ${i}`].x},${REG[`pinQ${i}`].y} 630,${REG[`pinQ${i}`].y} ` +
      `630,${ADD[`pinA${i}`].y} ${ADD[`pinA${i}`].x},${ADD[`pinA${i}`].y}`);
    // S (adder.S) → register.D, the big feedback loop wrapping under both boxes
    setW(`wS${i}`,
      `${ADD[`pinS${i}`].x},${ADD[`pinS${i}`].y} ${railX[i]},${ADD[`pinS${i}`].y} ` +
      `${railX[i]},${bottomY[i]} ${leftX[i]},${bottomY[i]} ` +
      `${leftX[i]},${REG[`pinD${i}`].y} ${REG[`pinD${i}`].x},${REG[`pinD${i}`].y}`);
    // B constant (tied) — short stub off the adder's left B pin
    setW(`wB${i}`, `${ADD[`pinB${i}`].x},${ADD[`pinB${i}`].y} 790,${ADD[`pinB${i}`].y}`);
    placePin(`pinD${i}`, REG[`pinD${i}`].x, REG[`pinD${i}`].y);
    placePin(`pinS${i}`, ADD[`pinS${i}`].x, ADD[`pinS${i}`].y);
  }
  // Cin = 0 (tied GND) and the unused Cout — honest stubs off their pins
  setW('wCin',  `${ADD.pinCin.x},${ADD.pinCin.y} 790,${ADD.pinCin.y}`);
  setW('wCout', `${ADD.pinCout.x},${ADD.pinCout.y} 1210,${ADD.pinCout.y}`);
}

// Light the embedded register to its logical state.
function lightRegister(hostId: string, D: Bit[], Q: Bit[], clk: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  for (let i = 0; i < 4; i++) { w(`D${i}`, D[i]); w(`Q${i}`, Q[i]); body(`gBit${i}`, Q[i]); }
  w('CLK', clk);
}

// Light the embedded 4-bit adder to its logical state.
function lightAdder(hostId: string, A: Bit[], B: Bit[], cin: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  const c: Bit[] = [cin, 0, 0, 0, 0] as Bit[];
  const S: Bit[] = [0, 0, 0, 0] as Bit[];
  for (let i = 0; i < 4; i++) {
    S[i] = (A[i] ^ B[i] ^ c[i]) as Bit;
    c[i + 1] = ((A[i] & B[i]) | (A[i] & c[i]) | (B[i] & c[i])) as Bit;
  }
  for (let i = 0; i < 4; i++) {
    w(`A${i}`, A[i]); w(`B${i}`, B[i]); w(`S${i}`, S[i]);
    body(`gFa${i}`, (S[i] || c[i + 1]) ? 1 : 0);
  }
  w('Cin', cin); w('C01', c[1]); w('C12', c[2]); w('C23', c[3]); w('Cout', c[4]);
}

// Add per-wire pulse overlays so the .pulse class can animate flow on lit wires.
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('.wire')).filter((w) => !w.closest('.detailed'));
const pulseFor = new Map<SVGPolylineElement, SVGPolylineElement>();
for (const w of wires) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  p.setAttribute('class', 'pulse');
  p.setAttribute('points', w.getAttribute('points') || '');
  const net = w.getAttribute('data-net');
  if (net) p.setAttribute('data-net', net);
  p.setAttribute('data-on', w.getAttribute('data-on') || '0');
  w.insertAdjacentElement('afterend', p);
  pulseFor.set(w, p);
}

function setWire(net: string, on: Bit) {
  svg.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((el) => {
    if (el.closest('.detailed')) return;
    el.setAttribute('data-on', String(on));
    const p = pulseFor.get(el);
    if (p) p.setAttribute('data-on', String(on));
  });
}
function setPin(id: string, on: Bit) {
  document.getElementById(id)?.setAttribute('data-on', String(on));
}
function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function render() {
  // Edge detection: capture the adder's output on rising edge of CLK.
  const next = (PC + STEP) & 0b1111;
  if (prevCLK === 0 && CLK === 1) {
    PC = next;
  }
  prevCLK = CLK;

  const newNext = (PC + STEP) & 0b1111;

  // Dynamic label for the current STEP mode.
  loopTag.textContent = `+${STEP} feedback loop`;
  btnStep.textContent = `step: +${STEP}`;

  // Register and adder body glow based on whether their stored/computed value
  // is non-zero — a coarse "active" indicator.
  document.getElementById('boxReg')!.setAttribute('data-on', PC !== 0 ? '1' : '0');
  document.getElementById('boxAdd')!.setAttribute('data-on', newNext !== 0 ? '1' : '0');

  const A: Bit[] = [bitOf(PC, 0), bitOf(PC, 1), bitOf(PC, 2), bitOf(PC, 3)];
  const B: Bit[] = [bitOf(STEP, 0), bitOf(STEP, 1), bitOf(STEP, 2), bitOf(STEP, 3)];
  const Snext: Bit[] = [bitOf(newNext, 0), bitOf(newNext, 1), bitOf(newNext, 2), bitOf(newNext, 3)];

  // Parent per-bit wires + decorative pins
  for (let i = 0; i < 4; i++) {
    setWire(`Q${i}`, A[i]);
    setWire(`S${i}`, Snext[i]);
    setWire(`B${i}`, B[i]);
    setPin(`pinS${i}`, Snext[i]);
    setPin(`pinD${i}`, Snext[i]); // D inputs = adder outputs (feedback)
  }
  setWire('Cin', 0);
  setWire('Cout', (PC + STEP) > 15 ? 1 : 0);
  setWire('CLK', CLK);
  setPin('pinCLK', CLK);

  // Embedded children mirror the parent state exactly.
  lightRegister('registerDetail', Snext, A, CLK);
  lightAdder('adderDetail', A, B, 0);

  // Controls
  setBtn(btnCLK, 'CLK', CLK);

  // Readout
  pcBits.textContent = bitsOf(PC);
  pcDec.textContent = String(PC);
  nextBits.textContent = bitsOf(newNext);
}

function persist() { saveSnapshot<PcSnap>(SNAP_KEY, { PC, CLK, STEP }); }

btnCLK.addEventListener('click', () => { CLK = CLK === 0 ? 1 : 0; render(); persist(); });
btnStep.addEventListener('click', () => {
  STEP = STEP === 1 ? 4 : 1;
  render();
  persist();
});
btnPulse.addEventListener('click', () => {
  CLK = 0; render();
  setTimeout(() => { CLK = 1; render(); persist(); }, 500);
  setTimeout(() => { CLK = 0; render(); persist(); }, 1100);
});
btnReset.addEventListener('click', () => {
  PC = 0; CLK = 0; prevCLK = 0;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-down: clicking the register or adder navigates with the
// current PC bits and STEP-derived B constant baked into URL params.
function bit(n: number, i: number): Bit { return ((n >> i) & 1) as Bit; }
document.getElementById('slot-register')?.addEventListener('click', () => {
  // The register's D inputs receive the adder's output (= PC + STEP) and
  // its Q outputs hold the current PC. Both feed via URL params so the
  // register page shows the same snapshot.
  const next = (PC + STEP) & 0b1111;
  window.location.assign(buildDrillUrl('/register.html', {
    from: 'counter', which: 'register',
    D0: bit(next, 0), D1: bit(next, 1), D2: bit(next, 2), D3: bit(next, 3),
    Q0: bit(PC, 0),   Q1: bit(PC, 1),   Q2: bit(PC, 2),   Q3: bit(PC, 3),
    CLK,
  }));
});
document.getElementById('slot-adder')?.addEventListener('click', () => {
  // The adder's A inputs receive PC bits; B is the constant STEP
  // (0001 for +1, 0100 for +4); Cin is 0.
  window.location.assign(buildDrillUrl('/adder4.html', {
    from: 'counter', which: 'adder',
    A0: bit(PC, 0),   A1: bit(PC, 1),   A2: bit(PC, 2),   A3: bit(PC, 3),
    B0: bit(STEP, 0), B1: bit(STEP, 1), B2: bit(STEP, 2), B3: bit(STEP, 3),
    Cin: 0,
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
