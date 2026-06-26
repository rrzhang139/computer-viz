import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
// Same logic as src/latch.ts — only the SVG topology differs (v2 NAND with
// both A and B on the LEFT edge, so the cross-coupled feedback forms an X
// in the corridor between N1 and N2 rather than wrapping around the right).

type Bit = 0 | 1;

const btnS = document.getElementById('btnS') as HTMLButtonElement;
const btnR = document.getElementById('btnR') as HTMLButtonElement;
const svg = document.getElementById('latch') as unknown as SVGSVGElement;

// ─── Embed an EXACT copy of /index.html (the NAND page) in each NAND slot,
// and route the latch's wires onto the embedded NANDs' real pins. ──────────
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const N1: Record<string, Pt> = embeds.get('slot-n1') || {};
const N2: Record<string, Pt> = embeds.get('slot-n2') || {};
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
const placePin = (id: string, x: number, y: number) => {
  const c = document.getElementById(id);
  if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
};
if (N1.pinA && N1.pinB && N1.pinY && N2.pinA && N2.pinB && N2.pinY) {
  // N1: A←S̄, B←Q̄(feedback), Y→Q.   N2: A←R̄, B←Q(feedback), Y→Q̄.
  placePin('pinS', 0, N1.pinA.y); setW('wS', `0,${N1.pinA.y} ${N1.pinA.x},${N1.pinA.y}`);
  placePin('pinR', 0, N2.pinA.y); setW('wR', `0,${N2.pinA.y} ${N2.pinA.x},${N2.pinA.y}`);
  placePin('pinQ', 600, N1.pinY.y); setW('wQout', `${N1.pinY.x},${N1.pinY.y} 600,${N1.pinY.y}`);
  placePin('pinQB', 600, N2.pinY.y); setW('wQBout', `${N2.pinY.x},${N2.pinY.y} 600,${N2.pinY.y}`);
  setW('wQfb', `${N1.pinY.x},${N1.pinY.y} 470,${N1.pinY.y} 470,190 180,190 180,${N2.pinB.y} ${N2.pinB.x},${N2.pinB.y}`);
  setW('wQBfb', `${N2.pinY.x},${N2.pinY.y} 490,${N2.pinY.y} 490,210 190,210 190,${N1.pinB.y} ${N1.pinB.x},${N1.pinB.y}`);
}
// Light an embedded NAND to its logical state (PMOS conduct on input 0, NMOS on 1).
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

  // Embedded NAND state: N1: A=S̄, B=Q̄, Y=Q.  N2: A=R̄, B=Q, Y=Q̄.
  lightNand('n1Detail', Sbar, QB, Q);
  lightNand('n2Detail', Rbar, Q, QB);

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

initCanvasZoom();
initSteps();

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
