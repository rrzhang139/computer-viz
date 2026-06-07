// Shared 4-bit adder scene module (compact preview form).
//
// Four full-adder cells stacked LSB-at-bottom, each with A and B inputs on
// the left and a sum bit S on the right, plus the carry chain running
// upward between them. Same structure /adder4.html shows full-size; here
// it is a builder so a parent (the ALU) can drop it into a hover preview
// fitted to its adder box. State-binding goes through
// `bindAdder4SceneState()`.
//
// Local coordinate frame: 420 × 480 (4 rows, pitch 120).

import type { Bit } from '../drillContext';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const ADDER4_SCENE_W = 420;
export const ADDER4_SCENE_H = 480;

// Row center y by bit (LSB at bottom).
const CY: Record<number, number> = { 3: 60, 2: 180, 1: 300, 0: 420 };

// External terminal anchors in the local frame, per bit: A and B on the LEFT
// edge (x=0), the sum S on the RIGHT edge (x=W). A parent can project these
// into its adder box and route its operand/result bundles onto the four rows.
export function adder4Terminals(box: { x: number; y: number; w: number; h: number }) {
  const sx = box.w / ADDER4_SCENE_W, sy = box.h / ADDER4_SCENE_H;
  const at = (lx: number, ly: number) => ({ x: box.x + lx * sx, y: box.y + ly * sy });
  const A: Record<number, { x: number; y: number }> = {};
  const B: Record<number, { x: number; y: number }> = {};
  const S: Record<number, { x: number; y: number }> = {};
  for (let i = 0; i < 4; i++) {
    A[i] = at(0, CY[i] - 16);
    B[i] = at(0, CY[i] + 16);
    S[i] = at(ADDER4_SCENE_W, CY[i]);
  }
  return { A, B, S };
}

export function buildAdder4Scene(): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  g.setAttribute('class', 'adder4-scene');

  const wire = (net: string, points: string) => {
    const w = document.createElementNS(SVG_NS, 'polyline');
    w.setAttribute('class', 'wire-mini');
    w.setAttribute('data-net', net);
    w.setAttribute('data-on', '0');
    w.setAttribute('points', points);
    g.appendChild(w);
  };

  for (let i = 3; i >= 0; i--) {
    const cy = CY[i];
    wire(`A${i}`, `0,${cy - 16} 130,${cy - 16}`);
    wire(`B${i}`, `0,${cy + 16} 130,${cy + 16}`);
    wire(`S${i}`, `290,${cy} 420,${cy}`);
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', `bit${i}`);
    r.setAttribute('x', '130'); r.setAttribute('y', String(cy - 40));
    r.setAttribute('width', '160'); r.setAttribute('height', '80'); r.setAttribute('rx', '8');
    g.appendChild(r);
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini');
    t.setAttribute('data-tid', `bit${i}`);
    t.setAttribute('x', '210'); t.setAttribute('y', String(cy));
    t.textContent = 'FA';
    g.appendChild(t);
  }
  // carry chain: bit i's carry-out rises into bit i+1 (the row above).
  for (let i = 0; i < 3; i++) {
    const gapY = (CY[i] + CY[i + 1]) / 2;
    wire(`carry${i + 1}`, `210,${gapY + 14} 210,${gapY - 14}`);
  }
  return g;
}

export interface Adder4SceneState { A: Bit[]; B: Bit[]; }

export function bindAdder4SceneState(root: SVGGElement, state: Adder4SceneState) {
  const { A, B } = state;
  const carry: Bit[] = [0, 0, 0, 0, 0];
  const S: Bit[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const sum = A[i] + B[i] + carry[i];
    S[i] = (sum & 1) as Bit;
    carry[i + 1] = (sum >= 2 ? 1 : 0) as Bit;
  }
  const set = (sel: string, on: Bit) =>
    root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-on', String(on)));
  for (let i = 0; i < 4; i++) {
    set(`.wire-mini[data-net="A${i}"]`, A[i]);
    set(`.wire-mini[data-net="B${i}"]`, B[i]);
    set(`.wire-mini[data-net="S${i}"]`, S[i]);
    set(`.tbody-mini[data-tid="bit${i}"]`, S[i]);
  }
  for (let k = 1; k <= 3; k++) set(`.wire-mini[data-net="carry${k}"]`, carry[k]);
}

export function placeAdder4Scene(
  scene: SVGGElement,
  pos: { x: number; y: number; w: number; h: number },
): SVGGElement {
  const wrap = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  const sx = pos.w / ADDER4_SCENE_W;
  const sy = pos.h / ADDER4_SCENE_H;
  wrap.setAttribute('transform', `translate(${pos.x}, ${pos.y}) scale(${sx}, ${sy})`);
  wrap.appendChild(scene);
  return wrap;
}
