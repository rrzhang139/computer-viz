import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
// D latch (level-triggered) with hover-swap overlays for the gating NANDs and the SR latch.
//
// Logic:
//   D_bar = !D                        (inverter on D)
//   S_bar = NAND(D,     EN)            (gating NAND G_S)
//   R_bar = NAND(D_bar, EN)            (gating NAND G_R)
//   Q, QB = settle SR latch with S_bar, R_bar
//
// EN = 0 → both S_bar and R_bar forced to 1 → SR latch HOLDS.
// EN = 1 → exactly one of S_bar/R_bar is 0 → SR latch SETS or RESETS to match D.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnD = document.getElementById('btnD') as HTMLButtonElement;
const btnEN = document.getElementById('btnEN') as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg = document.getElementById('dlatch') as unknown as SVGSVGElement;

// Snapshot user inputs across browser-back from a drill-down.
type DlatchSnap = { D: Bit; EN: Bit };
const SNAP_KEY = 'dlatch';
const _snap = loadSnapshot<DlatchSnap>(SNAP_KEY);
// URL params (when DRILLED INTO from DFF) override the snapshot.
let D: Bit = readBitParam('D', _snap?.D ?? 0);
let EN: Bit = readBitParam('EN', _snap?.EN ?? 0);
let Q: Bit = 0;
let QB: Bit = 1;

// ── Mini geometry ─────────────────────────────────────────────────────
// v2 NAND mini (used inside the gating NAND slots). Local coords match
// gate_v2.html viewBox 0 0 500 350.
const NAND_MINI_WIRES: { net: string; points: string; alwaysOn?: boolean }[] = [
  { net: 'Vdd', alwaysOn: true, points: '0,0 500,0' },
  { net: 'Vdd', alwaysOn: true, points: '175,0 175,25' },
  { net: 'Vdd', alwaysOn: true, points: '325,0 325,25' },
  { net: 'GND', points: '0,350 500,350' },
  { net: 'GND', points: '250,350 250,300' },
  { net: 'A', points: '0,100 125,100 125,50 150,50' },
  { net: 'A', points: '0,100 200,100 200,175 225,175' },
  { net: 'B', points: '0,250 200,250 200,275 225,275' },
  { net: 'B', points: '0,250 225,250 225,240 285,240 285,50 300,50' },
  { net: 'Y', points: '175,75 175,125 250,125' },
  { net: 'Y', points: '325,75 325,125 250,125' },
  { net: 'Y', points: '250,125 250,150' },
  { net: 'Y', points: '250,125 425,125 425,150 500,150' },
  { net: 'mid', points: '250,200 250,250' },
];
const NAND_MINI_TRANSISTORS = [
  { tid: 'P_A', x: 150, y: 25, lx: 175, ly: 50 },
  { tid: 'P_B', x: 300, y: 25, lx: 325, ly: 50 },
  { tid: 'N_A', x: 225, y: 150, lx: 250, ly: 175 },
  { tid: 'N_B', x: 225, y: 250, lx: 250, ly: 275 },
];

// SR latch mini (used inside the latch slot). Local coords match the SR latch
// content: 600 wide × 400 tall (matches latch_v2.html with its enlarged geometry).
const LATCH_MINI_WIRES: { net: string; points: string; alwaysOn?: boolean }[] = [
  { net: 'Vdd', alwaysOn: true, points: '0,0 600,0' },
  { net: 'GND', points: '0,400 600,400' },
  { net: 'S',  points: '0,80 230,80' },
  { net: 'R',  points: '0,260 230,260' },
  { net: 'Q',  points: '430,100 600,100' },
  { net: 'QB', points: '430,280 600,280' },
  { net: 'Q',  points: '430,100 470,100 470,190 180,190 180,320 230,320' },
  { net: 'QB', points: '430,280 490,280 490,210 190,210 190,140 230,140' },
];
const LATCH_MINI_NANDS = [
  { tid: 'N1', x: 230, y: 40,  lx: 330, ly: 110 },
  { tid: 'N2', x: 230, y: 220, lx: 330, ly: 290 },
];

interface SlotBox { x: number; y: number; w: number; h: number; }
const GATING_NAND_BOXES: Record<string, SlotBox> = {
  gs: { x: 145, y: 105, w: 200, h: 140 },
  gr: { x: 145, y: 315, w: 200, h: 140 },
};
const LATCH_BOX: SlotBox = { x: 525, y: 186.67, w: 280, h: 186.67 };

function buildNandMini(slot: string, box: SlotBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', slot);
  g.setAttribute('transform',
    `translate(${box.x}, ${box.y}) scale(${box.w / 500}, ${box.h / 350})`);

  for (const w of NAND_MINI_WIRES) {
    const wire = document.createElementNS(SVG_NS, 'polyline');
    wire.setAttribute('class', 'wire-mini');
    wire.setAttribute('data-net', w.net);
    wire.setAttribute('data-on', w.alwaysOn ? '1' : '0');
    wire.setAttribute('points', w.points);
    g.appendChild(wire);
  }
  for (const t of NAND_MINI_TRANSISTORS) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', t.tid);
    r.setAttribute('x', String(t.x));
    r.setAttribute('y', String(t.y));
    r.setAttribute('width', '50');
    r.setAttribute('height', '50');
    r.setAttribute('rx', '4');
    g.appendChild(r);
    const txt = document.createElementNS(SVG_NS, 'text');
    txt.setAttribute('class', 'tlabel-mini');
    txt.setAttribute('data-tid', t.tid);
    txt.setAttribute('x', String(t.lx));
    txt.setAttribute('y', String(t.ly));
    txt.textContent = t.tid;
    g.appendChild(txt);
  }
  return g;
}

function buildLatchMini(slot: string, box: SlotBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', slot);
  g.setAttribute('transform',
    `translate(${box.x}, ${box.y}) scale(${box.w / 600}, ${box.h / 400})`);

  for (const w of LATCH_MINI_WIRES) {
    const wire = document.createElementNS(SVG_NS, 'polyline');
    wire.setAttribute('class', 'wire-mini');
    wire.setAttribute('data-net', w.net);
    wire.setAttribute('data-on', w.alwaysOn ? '1' : '0');
    wire.setAttribute('points', w.points);
    g.appendChild(wire);
  }
  for (const n of LATCH_MINI_NANDS) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', n.tid);
    r.setAttribute('x', String(n.x));
    r.setAttribute('y', String(n.y));
    r.setAttribute('width', '200');
    r.setAttribute('height', '140');
    r.setAttribute('rx', '10');
    g.appendChild(r);
    const txt = document.createElementNS(SVG_NS, 'text');
    txt.setAttribute('class', 'tlabel-mini');
    txt.setAttribute('data-tid', n.tid);
    txt.setAttribute('x', String(n.lx));
    txt.setAttribute('y', String(n.ly));
    txt.textContent = n.tid;
    g.appendChild(txt);
  }
  return g;
}

// Inject minis
for (const slot of Object.keys(GATING_NAND_BOXES)) {
  document.getElementById(`slot-${slot}`)
    ?.appendChild(buildNandMini(slot, GATING_NAND_BOXES[slot]));
}
document.getElementById('slot-latch')
  ?.appendChild(buildLatchMini('latch', LATCH_BOX));

// Pulse overlay for every parent wire (same pattern as gate / latch pages)
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
    const pulse = pulseFor.get(el as SVGPolylineElement);
    if (pulse) pulse.setAttribute('data-on', String(on));
  });
}
function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function setNandMiniState(slot: string, A: Bit, B: Bit, Y: Bit) {
  const root = svg.querySelector(`g.detailed[data-slot="${slot}"]`);
  if (!root) return;
  const mid: Bit = A && B ? 1 : 0;
  const set = (sel: string, on: Bit) =>
    root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-on', String(on)));
  set('.wire-mini[data-net="A"]', A);
  set('.wire-mini[data-net="B"]', B);
  set('.wire-mini[data-net="Y"]', Y);
  set('.wire-mini[data-net="mid"]', mid);
  const tOn: Record<string, Bit> = {
    P_A: A === 0 ? 1 : 0, P_B: B === 0 ? 1 : 0,
    N_A: A, N_B: B,
  };
  for (const [tid, on] of Object.entries(tOn)) {
    root.querySelector(`.tbody-mini[data-tid="${tid}"]`)
      ?.setAttribute('data-on', String(on));
  }
}

function setLatchMiniState(Sbar: Bit, Rbar: Bit, Q: Bit, QB: Bit) {
  const root = svg.querySelector(`g.detailed[data-slot="latch"]`);
  if (!root) return;
  const set = (sel: string, on: Bit) =>
    root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-on', String(on)));
  set('.wire-mini[data-net="S"]',  Sbar);
  set('.wire-mini[data-net="R"]',  Rbar);
  set('.wire-mini[data-net="Q"]',  Q);
  set('.wire-mini[data-net="QB"]', QB);
  root.querySelector(`.tbody-mini[data-tid="N1"]`)?.setAttribute('data-on', String(Q));
  root.querySelector(`.tbody-mini[data-tid="N2"]`)?.setAttribute('data-on', String(QB));
}

function settle(Sbar: Bit, Rbar: Bit) {
  for (let i = 0; i < 6; i++) {
    const nQ: Bit = (Sbar & QB) === 1 ? 0 : 1;
    const nQB: Bit = (Rbar & Q) === 1 ? 0 : 1;
    if (nQ === Q && nQB === QB) break;
    Q = nQ; QB = nQB;
  }
}

function render() {
  const Dbar: Bit = D === 0 ? 1 : 0;
  const Sbar: Bit = (D & EN) === 1 ? 0 : 1;
  const Rbar: Bit = (Dbar & EN) === 1 ? 0 : 1;
  settle(Sbar, Rbar);

  // Parent wires
  setAttr('.wire[data-net="D"]',    D);
  setAttr('.wire[data-net="Dbar"]', Dbar);
  setAttr('.wire[data-net="EN"]',   EN);
  setAttr('.wire[data-net="Sbar"]', Sbar);
  setAttr('.wire[data-net="Rbar"]', Rbar);
  setAttr('.wire[data-net="Q"]',    Q);
  setAttr('.wire[data-net="QB"]',   QB);

  // Simple bodies
  document.getElementById('iInv')!.setAttribute('data-on', String(Dbar));
  document.getElementById('gGS')!.setAttribute('data-on', String(Sbar));
  document.getElementById('gGR')!.setAttribute('data-on', String(Rbar));
  document.getElementById('gLatch')!.setAttribute('data-on', String(Q));

  // Pins
  document.getElementById('pinD')!.setAttribute('data-on', String(D));
  document.getElementById('pinEN')!.setAttribute('data-on', String(EN));
  document.getElementById('pinQ')!.setAttribute('data-on', String(Q));
  document.getElementById('pinQB')!.setAttribute('data-on', String(QB));

  // Hover minis
  setNandMiniState('gs', D,    EN, Sbar);
  setNandMiniState('gr', Dbar, EN, Rbar);
  setLatchMiniState(Sbar, Rbar, Q, QB);

  setBtn(btnD,  'D',  D);
  setBtn(btnEN, 'EN', EN);
}

function persist() { saveSnapshot<DlatchSnap>(SNAP_KEY, { D, EN }); }

btnD.addEventListener('click', () => { D = D === 0 ? 1 : 0; render(); persist(); });
btnEN.addEventListener('click', () => { EN = EN === 0 ? 1 : 0; render(); persist(); });
btnReset.addEventListener('click', () => {
  D = 0; EN = 0; Q = 0; QB = 1;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-down to children ───────────────────────────────────────────
// slot-gs: gating NAND for S_bar. Takes A=D, B=EN, outputs Y=S_bar.
// slot-gr: gating NAND for R_bar. Takes A=D_bar, B=EN, outputs Y=R_bar.
// slot-latch: SR latch core. Takes Sbar, Rbar from the gating NANDs.
function recomputeForDrill() {
  const Dbar: Bit = (D === 0 ? 1 : 0) as Bit;
  const Sbar: Bit = ((D & EN) === 1 ? 0 : 1) as Bit;
  const Rbar: Bit = ((Dbar & EN) === 1 ? 0 : 1) as Bit;
  return { Dbar, Sbar, Rbar };
}
document.getElementById('slot-gs')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/', {
    from: 'dlatch', which: 'gS', A: D, B: EN,
  }));
});
document.getElementById('slot-gr')?.addEventListener('click', () => {
  const { Dbar } = recomputeForDrill();
  window.location.assign(buildDrillUrl('/', {
    from: 'dlatch', which: 'gR', A: Dbar, B: EN,
  }));
});
document.getElementById('slot-latch')?.addEventListener('click', () => {
  const { Sbar, Rbar } = recomputeForDrill();
  window.location.assign(buildDrillUrl('/latch.html', {
    from: 'dlatch', which: 'SR-core', Sbar, Rbar,
  }));
});

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
