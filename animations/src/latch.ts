import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
// Same logic as src/latch.ts — only the SVG topology differs (v2 NAND with
// both A and B on the LEFT edge, so the cross-coupled feedback forms an X
// in the corridor between N1 and N2 rather than wrapping around the right).

type Bit = 0 | 1;

const SVG_NS = 'http://www.w3.org/2000/svg';

const btnS = document.getElementById('btnS') as HTMLButtonElement;
const btnR = document.getElementById('btnR') as HTMLButtonElement;
const svg = document.getElementById('latch') as unknown as SVGSVGElement;

// ─── NAND v2 mini geometry ─────────────────────────────────────────────
// World coords match gate_v2.html (viewBox 0 0 500 350). When scaled into
// a 142.85 × 100 NAND box at parent SVG (228.575, 50), the mini's external
// terminals A_in (0,100), B_in (0,250), Y_out (500,150) project to exactly
// the parent's wire endpoints — N1_A_in (228.575, 78.57), N1_B_in (228.575,
// 121.43), N1_Y_out (371.43, 92.86). Verifies CLAUDE.md rule 21 data flow.

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

interface SlotBox { x: number; y: number; w: number; h: number; }
const SLOT_BOXES: Record<string, SlotBox> = {
  n1: { x: 230, y: 40, w: 200, h: 140 },
  n2: { x: 230, y: 220, w: 200, h: 140 },
};

function buildNandMini(slot: string, box: SlotBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', slot);
  const sx = box.w / 500;
  const sy = box.h / 350;
  g.setAttribute('transform', `translate(${box.x}, ${box.y}) scale(${sx}, ${sy})`);

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

// Inject minis into each slot
for (const slot of Object.keys(SLOT_BOXES)) {
  const slotGroup = document.getElementById(`slot-${slot}`);
  if (slotGroup) slotGroup.appendChild(buildNandMini(slot, SLOT_BOXES[slot]));
}

function setMiniState(slot: 'n1' | 'n2', A: Bit, B: Bit, Y: Bit) {
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
    P_A: A === 0 ? 1 : 0,
    P_B: B === 0 ? 1 : 0,
    N_A: A,
    N_B: B,
  };
  for (const [tid, on] of Object.entries(tOn)) {
    root.querySelector(`.tbody-mini[data-tid="${tid}"]`)
      ?.setAttribute('data-on', String(on));
  }
}

// Per-page snapshot keeps the latch's inputs across navigation. Q/QB are
// derived from settle(), so we only need to persist the user-controlled
// inputs (Sbar and Rbar).
type LatchSnap = { Sbar: Bit; Rbar: Bit };
const SNAP_KEY = 'latch';
const snap = loadSnapshot<LatchSnap>(SNAP_KEY);
// URL params (drilled-into from D latch) override the snapshot.
let Sbar: Bit = readBitParam('Sbar', snap?.Sbar ?? 1);
let Rbar: Bit = readBitParam('Rbar', snap?.Rbar ?? 1);
let Q: Bit = 0;
let QB: Bit = 1;

const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('.wire'));
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

function settle() {
  for (let i = 0; i < 6; i++) {
    const nQ: Bit = (Sbar & QB) === 1 ? 0 : 1;
    const nQB: Bit = (Rbar & Q) === 1 ? 0 : 1;
    if (nQ === Q && nQB === QB) break;
    Q = nQ;
    QB = nQB;
  }
}

function render() {
  settle();

  setAttr('.wire[data-net="S"]', Sbar);
  setAttr('.wire[data-net="R"]', Rbar);
  setAttr('.wire[data-net="Q"]', Q);
  setAttr('.wire[data-net="QB"]', QB);

  document.getElementById('nN1')!.setAttribute('data-on', String(Q));
  document.getElementById('nN2')!.setAttribute('data-on', String(QB));

  // Mini state reflects each NAND's logical inputs/output:
  //   N1: A = S̄, B = Q̄ (feedback), Y = Q
  //   N2: A = R̄, B = Q  (feedback), Y = Q̄
  setMiniState('n1', Sbar, QB, Q);
  setMiniState('n2', Rbar, Q, QB);

  document.getElementById('pinS')!.setAttribute('data-on', String(Sbar));
  document.getElementById('pinR')!.setAttribute('data-on', String(Rbar));
  document.getElementById('pinQ')!.setAttribute('data-on', String(Q));
  document.getElementById('pinQB')!.setAttribute('data-on', String(QB));

  setBtn(btnS, 'S̄', Sbar);
  setBtn(btnR, 'R̄', Rbar);
}

// Save is explicit in the input handlers — keeping it out of render() so
// reset can clear the snapshot without immediately rewriting it.
function persist() {
  saveSnapshot<LatchSnap>(SNAP_KEY, { Sbar, Rbar });
}

btnS.addEventListener('click', () => {
  Sbar = Sbar === 0 ? 1 : 0;
  render();
  persist();
});
btnR.addEventListener('click', () => {
  Rbar = Rbar === 0 ? 1 : 0;
  render();
  persist();
});

const btnReset = document.getElementById('btnReset') as HTMLButtonElement | null;
btnReset?.addEventListener('click', () => {
  Sbar = 1;
  Rbar = 1;
  Q = 0;
  QB = 1;
  clearSnapshot(SNAP_KEY);
  render();
  // NB: no persist() call — leave the snapshot cleared so a refresh
  // shows the default state, not the post-reset state.
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

// ── Drill-down: clicking a NAND inside the latch navigates to /index.html
// with that NAND's current A and B baked into the URL. Hovering still
// reveals the NAND mini in-place; click is what triggers navigation.
//
//   N1: A = S̄,  B = Q̄    (top NAND)
//   N2: A = R̄,  B = Q     (bottom NAND)
const slotN1 = document.getElementById('slot-n1');
const slotN2 = document.getElementById('slot-n2');
slotN1?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/', {
    from: 'latch', which: 'N1', A: Sbar, B: QB,
  }));
});
slotN2?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/', {
    from: 'latch', which: 'N2', A: Rbar, B: Q,
  }));
});

initPanel();
initToc();
initDrillBreadcrumb();
