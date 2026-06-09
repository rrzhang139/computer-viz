import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
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

// ── Embed exact copies of the children and route wires onto their pins ──
// slot-gs / slot-gr embed /index.html (the NAND); slot-latch embeds
// /latch.html (the SR latch). autoFillEmbeds returns each child's projected
// pin positions (by original id), so every wire lands on a real terminal.
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const GS: Record<string, Pt>  = embeds.get('slot-gs')    || {};
const GR: Record<string, Pt>  = embeds.get('slot-gr')    || {};
const LAT: Record<string, Pt> = embeds.get('slot-latch') || {};
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
const placePin = (id: string, x: number, y: number) => {
  const c = document.getElementById(id);
  if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
};
if (GS.pinA && GS.pinB && GS.pinY && GR.pinA && GR.pinB && GR.pinY &&
    LAT.pinS && LAT.pinR && LAT.pinQ && LAT.pinQB) {
  // D → inverter, and D → GS.A
  placePin('pinD', 0, 280);
  setW('wD_inv', `0,280 35,280`);
  setW('wD_gs', `0,280 20,280 20,${GS.pinA.y} ${GS.pinA.x},${GS.pinA.y}`);
  // Dbar (inverter out) → GR.A
  setW('wDbar', `105,280 125,280 125,${GR.pinA.y} ${GR.pinA.x},${GR.pinA.y}`);
  // EN drops from the top, runs a left corridor at x=125, taps GS.B and GR.B
  placePin('pinEN', 315, 35);
  setW('wEN_drop', `315,35 315,75 125,75 125,${GR.pinB.y}`);
  setW('wEN_gs', `125,${GS.pinB.y} ${GS.pinB.x},${GS.pinB.y}`);
  setW('wEN_gr', `125,${GR.pinB.y} ${GR.pinB.x},${GR.pinB.y}`);
  // Sbar: GS.Y → latch.S ;  Rbar: GR.Y → latch.R  (turn in the gap at x=480)
  setW('wSbar', `${GS.pinY.x},${GS.pinY.y} 480,${GS.pinY.y} 480,${LAT.pinS.y} ${LAT.pinS.x},${LAT.pinS.y}`);
  setW('wRbar', `${GR.pinY.x},${GR.pinY.y} 480,${GR.pinY.y} 480,${LAT.pinR.y} ${LAT.pinR.x},${LAT.pinR.y}`);
  // Q / QB outputs
  setW('wQ', `${LAT.pinQ.x},${LAT.pinQ.y} 820,${LAT.pinQ.y} 820,175 840,175`);
  setW('wQB', `${LAT.pinQB.x},${LAT.pinQB.y} 820,${LAT.pinQB.y} 820,385 840,385`);
  placePin('pinQ', 840, 175);
  placePin('pinQB', 840, 385);
}

// Light an embedded NAND (PMOS conduct on input 0, NMOS on 1).
function lightNand(hostId: string, A: Bit, B: Bit, Y: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const mid: Bit = (A && B) ? 1 : 0;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('A', A); w('B', B); w('Y', Y); w('mid', mid);
  body('tP_A', (A === 0 ? 1 : 0) as Bit); body('tP_B', (B === 0 ? 1 : 0) as Bit);
  body('tN_A', A); body('tN_B', B);
}
// Light the embedded SR latch (its NAND bodies follow Q / QB).
function lightLatch(hostId: string, Sbar: Bit, Rbar: Bit, q: Bit, qb: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('S', Sbar); w('R', Rbar); w('Q', q); w('QB', qb);
  body('nN1', q); body('nN2', qb);
}

// Pulse overlay for every parent wire (exclude embedded children's wires)
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
    const pulse = pulseFor.get(el as SVGPolylineElement);
    if (pulse) pulse.setAttribute('data-on', String(on));
  });
}
function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
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

  // Embedded children
  lightNand('gsDetail', D,    EN, Sbar);
  lightNand('grDetail', Dbar, EN, Rbar);
  lightLatch('latchDetail', Sbar, Rbar, Q, QB);

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
