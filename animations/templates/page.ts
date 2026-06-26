import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// __NAME__ — one-paragraph spec: what this level is, what its children are,
// and the write/read (or input/output) contract. Copy this file to
// src/__NAME__.ts; templates/ is not part of the build.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnA     = document.getElementById('btnA')     as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg      = document.getElementById('__NAME__') as unknown as SVGSVGElement;
const yBit     = document.getElementById('yBit')     as HTMLElement;

// ── State: restored from the per-page snapshot (drill-back keeps your
// work), then overridden by drill-in URL params from the parent page.
type Snap = { A: Bit };
const SNAP_KEY = '__NAME__';
const _snap = loadSnapshot<Snap>(SNAP_KEY);
let A: Bit = readBitParam('A', _snap?.A ?? 0);

// ── Embed EXACT copies of each child page (the canonical exact-replica
// standard). autoFillEmbeds clones each [data-embed-page] target's real
// <svg> into the slot's .detailed and returns its PROJECTED pin positions
// (keyed by the child's pin ids). Route every child-touching wire onto
// those pins — nothing hardcoded.
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const CHILD: Record<string, Pt> = embeds.get('slot-child') || {};
const setWirePoints = (id: string, points: string) =>
  document.getElementById(id)?.setAttribute('points', points);

if (CHILD.pinA && CHILD.pinY) {
  setWirePoints('wA', `0,380 ${CHILD.pinA.x},380 ${CHILD.pinA.x},${CHILD.pinA.y}`);
  setWirePoints('wY', `${CHILD.pinY.x},${CHILD.pinY.y} 1400,${CHILD.pinY.y}`);
}

// ── Light the embedded child to match state (its data-net wires + its
// data-body bodies), so the preview is the child's page, live.
function lightChild(a: Bit, y: Bit) {
  const host = document.getElementById('childDetail'); if (!host) return;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('A', a); w('Y', y); body('gSomething', y);
}

// ── Per-wire pulse overlays so lit wires animate flow (skip embeds). ──
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
// DENSE pages only (many parallel wires): colour each symbol a distinct hue so
// signals are traceable. Call AFTER the pulse overlays exist. Group a symbol's
// bits to one colour. Omit on simple pages. See src/wireColors.ts.
// import { applyWireColors } from "./wireColors";
// applyWireColors(svg, { A: "#57e08b", Y: "#ff8a3d", /* net: cssColor … */ });

function setNet(net: string, on: Bit) {
  svg.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((el) => {
    if (el.closest('.detailed')) return;  // embeds light via lightChild
    el.setAttribute('data-on', String(on));
    pulseFor.get(el)?.setAttribute('data-on', String(on));
  });
}
const setPin = (id: string, on: Bit) => document.getElementById(id)?.setAttribute('data-on', String(on));
const setBody = (id: string, on: Bit) => document.getElementById(id)?.setAttribute('data-on', String(on));
function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function render() {
  const Y: Bit = A;  // ← the level's actual logic

  setNet('A', A); setPin('pinA', A);
  setNet('Y', Y); setPin('pinY', Y);
  setBody('gChild', Y);
  lightChild(A, Y);
  setBtn(btnA, 'A', A);
  yBit.textContent = String(Y);
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { A }); }

btnA.addEventListener('click', () => { A = A === 0 ? 1 : 0; render(); persist(); });
btnReset.addEventListener('click', () => {
  A = 0;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-down: clicking a child slot navigates to the child's page with
// this level's state loaded (so the drilled page shows the same moment).
document.getElementById('slot-child')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/child.html', {
    from: '__NAME__', which: 'child', A,
  }));
});

initDrillBreadcrumb();
render();

initCanvasZoom();   // Figma-style pan/zoom; MUST run before initSteps so per-step focus works
initSteps();        // step walkthrough nav + per-page persistence + gating + per-step zoom focus
initPanel();
initToc();
