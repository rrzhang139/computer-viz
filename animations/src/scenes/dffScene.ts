// Shared DFF scene module.
//
// The DFF visualization (master + slave latches with internal wiring)
// lives ONCE here. Every page that shows a DFF — /dff.html as the
// standalone, /register.html as a per-bit hover overlay, /counter.html
// as a sub-component of its register overlay — calls `buildDffScene()`
// to get the same SVG, then translates/scales it into wherever it's
// hosted. State-binding goes through `bindDffSceneState()`.
//
// Local coordinate frame: 500 × 200 (aspect 2.5).
//
// Terminals: D enters LEFT-CENTER (y=100), Q exits RIGHT-CENTER (y=100),
// CLK enters TOP-CENTER (x=250). Q being at center — instead of layer-4's
// frac 0.375 — is a deliberate embedding simplification: when this scene
// is dropped into any parent box, the parent's per-bit D and Q wires
// share the same y (= row center), so the connecting wires are clean
// horizontals with no per-bit jog. The full Q vs Q̄ frac-0.375 vs 0.625
// distinction is shown on the standalone /dff.html only.

import type { Bit } from '../drillContext';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const DFF_SCENE_W = 500;
export const DFF_SCENE_H = 200;

// Local-frame anchor points of the DFF's external terminals: D enters
// left-center, Q exits right-center, CLK enters top-center. A parent that
// drops this scene into a register box can project these through the same
// placement transform to land its wdata / gated-clock / output wires
// exactly on the cell's real terminals (instead of hardcoding y's).
export const DFF_SCENE_ANCHORS = {
  D:   { x: 0,   y: 100 },
  CLK: { x: 250, y: 0 },
  Q:   { x: 500, y: 100 },
} as const;

const WIRES = [
  { net: 'D',      points: '0,100 60,100' },
  { net: 'CLK',    points: '250,0 250,25' },
  { net: 'CLK',    points: '250,25 360,25 360,40' },
  { net: 'notCLK', points: '250,25 140,25 140,40' },
  { net: 'M',      points: '220,100 280,100' },
  { net: 'Q',      points: '440,100 500,100' },
];
const BOXES = [
  { tid: 'master', x: 60,  y: 40, w: 160, h: 120, lx: 140, ly: 100 },
  { tid: 'slave',  x: 280, y: 40, w: 160, h: 120, lx: 360, ly: 100 },
];

export function buildDffScene(): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  g.setAttribute('class', 'dff-scene');
  for (const w of WIRES) {
    const wire = document.createElementNS(SVG_NS, 'polyline');
    wire.setAttribute('class', 'wire-mini');
    wire.setAttribute('data-net', w.net);
    wire.setAttribute('data-on', '0');
    wire.setAttribute('points', w.points);
    g.appendChild(wire);
  }
  for (const b of BOXES) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', b.tid);
    r.setAttribute('x', String(b.x));
    r.setAttribute('y', String(b.y));
    r.setAttribute('width', String(b.w));
    r.setAttribute('height', String(b.h));
    r.setAttribute('rx', '8');
    g.appendChild(r);
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini');
    t.setAttribute('data-tid', b.tid);
    t.setAttribute('x', String(b.lx));
    t.setAttribute('y', String(b.ly));
    t.textContent = b.tid;
    g.appendChild(t);
  }
  return g;
}

export interface DffSceneState {
  D: Bit;
  CLK: Bit;
  Qm: Bit;
  Q: Bit;
}

export function bindDffSceneState(root: SVGGElement, state: DffSceneState) {
  const { D, CLK, Qm, Q } = state;
  const notCLK: Bit = (CLK === 0 ? 1 : 0) as Bit;
  const set = (sel: string, on: Bit) => {
    root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-on', String(on)));
  };
  set('.wire-mini[data-net="D"]', D);
  set('.wire-mini[data-net="CLK"]', CLK);
  set('.wire-mini[data-net="notCLK"]', notCLK);
  set('.wire-mini[data-net="M"]', Qm);
  set('.wire-mini[data-net="Q"]', Q);
  root.querySelector('.tbody-mini[data-tid="master"]')?.setAttribute('data-on', String(Qm));
  root.querySelector('.tbody-mini[data-tid="slave"]')?.setAttribute('data-on', String(Q));
}

// Helper: wrap a built scene in a `<g transform="translate scale">` that
// projects it into a target rectangle in parent coordinates.
export function placeDffScene(
  scene: SVGGElement,
  pos: { x: number; y: number; w: number; h: number },
): SVGGElement {
  const wrap = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  const sx = pos.w / DFF_SCENE_W;
  const sy = pos.h / DFF_SCENE_H;
  wrap.setAttribute('transform', `translate(${pos.x}, ${pos.y}) scale(${sx}, ${sy})`);
  wrap.appendChild(scene);
  return wrap;
}
