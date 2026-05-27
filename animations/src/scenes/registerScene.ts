// Shared register scene — the TOP-LEVEL view of a 4-bit register: four
// abstract DFF boxes stacked LSB-at-bottom, each labeled "DFF bit N" with
// a "Q = X" readout. This matches what /register.html shows at its default
// (un-hovered) zoom level.
//
// IMPORTANT: this scene deliberately does NOT show the master/slave detail
// inside each DFF. That belongs to the next layer down (dffScene), which
// /register.html embeds in each bit's HOVER overlay. The counter's
// register overlay should NOT jump straight to master/slave — it should
// show what the register page shows at its top level.
//
// Local coordinate frame: 380 × 480 (matches the counter's register
// overlay box; easy embed with scale 1).

import type { Bit } from '../drillContext';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const REGISTER_SCENE_W = 380;
export const REGISTER_SCENE_H = 480;

// Cell layout — LSB at bottom, evenly-spaced fracs (0.125, 0.375, 0.625,
// 0.875) of the scene height so each cell's center matches the layer-9
// PC wireframe's expected per-bit terminal positions when embedded.
const CELL_BOX_W = 200;
const CELL_BOX_H = 70;
const CELL_BOX_X = (REGISTER_SCENE_W - CELL_BOX_W) / 2;
const CELL_Y_BY_BIT: Record<number, number> = {
  3:  60 - CELL_BOX_H / 2,   // center at  60 (frac 0.125)
  2: 180 - CELL_BOX_H / 2,   // center at 180 (frac 0.375)
  1: 300 - CELL_BOX_H / 2,   // center at 300 (frac 0.625)
  0: 420 - CELL_BOX_H / 2,   // center at 420 (frac 0.875)
};

export function buildRegisterScene(): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  g.setAttribute('class', 'register-scene');

  for (let bit = 3; bit >= 0; bit--) {
    const boxY = CELL_Y_BY_BIT[bit];
    const cy = boxY + CELL_BOX_H / 2;

    // Cell body — lights up via `data-on` when this bit's Q is 1.
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'tbody-mini');
    rect.setAttribute('data-bit', String(bit));
    rect.setAttribute('x', String(CELL_BOX_X));
    rect.setAttribute('y', String(boxY));
    rect.setAttribute('width',  String(CELL_BOX_W));
    rect.setAttribute('height', String(CELL_BOX_H));
    rect.setAttribute('rx', '10');
    g.appendChild(rect);

    // Title
    const title = document.createElementNS(SVG_NS, 'text');
    title.setAttribute('class', 'tlabel-mini');
    title.setAttribute('x', String(CELL_BOX_X + CELL_BOX_W / 2));
    title.setAttribute('y', String(cy - 8));
    title.textContent = `DFF bit ${bit}`;
    g.appendChild(title);

    // Q readout
    const sub = document.createElementNS(SVG_NS, 'text');
    sub.setAttribute('class', 'tlabel-mini-tiny');
    sub.setAttribute('data-q-readout', String(bit));
    sub.setAttribute('x', String(CELL_BOX_X + CELL_BOX_W / 2));
    sub.setAttribute('y', String(cy + 14));
    sub.textContent = 'Q = 0';
    g.appendChild(sub);
  }
  return g;
}

export interface RegisterSceneState {
  Q: Bit[];  // length 4 — current stored value per bit
}

export function bindRegisterSceneState(root: SVGGElement, state: RegisterSceneState) {
  for (let i = 0; i < 4; i++) {
    const q = state.Q[i];
    root.querySelector<SVGRectElement>(`rect[data-bit="${i}"]`)
      ?.setAttribute('data-on', String(q));
    const t = root.querySelector<SVGTextElement>(`text[data-q-readout="${i}"]`);
    if (t) {
      t.textContent = `Q = ${q}`;
      t.setAttribute('fill', q ? 'var(--on)' : '#666');
    }
  }
}

// Per-bit row-center y in scene-local coords, useful when the parent
// needs to draw external wires entering/exiting each cell.
export function bitRowCenterY(bit: number): number {
  return CELL_Y_BY_BIT[bit] + CELL_BOX_H / 2;
}
