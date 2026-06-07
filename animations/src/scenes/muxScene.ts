// Shared 4-to-1 MUX scene module (compact preview form).
//
// Shows the MUX's one-level-down internals — a `decoder` block (drawn as
// a labeled box, since the decoder is itself the next drill-down), four
// AND gates that each gate one data input with one decoder sel line, and
// a 4-input OR that collapses them to `out`. This is the same structure
// /mux.html draws full-size; here it is a builder so a parent (the
// register file's read port) can drop it into a hover preview fitted to
// its MUX box. State-binding goes through `bindMuxSceneState()`.
//
// Local coordinate frame: 520 × 420.

import type { Bit } from '../drillContext';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const MUX_SCENE_W = 520;
export const MUX_SCENE_H = 420;

// Local-frame anchor points of the scene's external terminals — the left
// ends of the input stubs and the right end of the output. A parent that
// drops this scene into a preview box can project these through the same
// placement transform to land its wires exactly on the stubs (instead of
// hardcoding y's). Keys match the `data-net` names the parent uses.
export const MUX_SCENE_ANCHORS = {
  s1:  { x: 0,   y: 70 },
  s0:  { x: 0,   y: 110 },
  in3: { x: 0,   y: 180 },
  in2: { x: 0,   y: 250 },
  in1: { x: 0,   y: 320 },
  in0: { x: 0,   y: 390 },
  out: { x: 520, y: 285 },
} as const;

// AND D-shape (flat left edge, semicircular right) centred at (cx, cy).
function andPath(cx: number, cy: number, w: number, h: number): string {
  const left = cx - w / 2;
  const top = cy - h / 2;
  const bot = cy + h / 2;
  const flatRight = left + w - h / 2;
  const r = h / 2;
  return `M ${left} ${top} L ${flatRight} ${top} A ${r} ${r} 0 0 1 ${flatRight} ${bot} L ${left} ${bot} Z`;
}

// 4-input OR shield: concave left, pointed right tip at (tipX, cy).
function orPath(left: number, top: number, bot: number, tipX: number): string {
  const cy = (top + bot) / 2;
  return `M ${left} ${top} C ${left + 60} ${top} ${tipX} ${cy - 80} ${tipX} ${cy} ` +
         `C ${tipX} ${cy + 80} ${left + 60} ${bot} ${left} ${bot} ` +
         `C ${left + 30} ${cy + 70} ${left + 30} ${cy - 70} ${left} ${top} Z`;
}

const AND_CY = [180, 250, 320, 390]; // in3..in0 rows (index 0 = in3, top)
const SEL_Y  = [70, 100, 130, 160];  // decoder sel3..sel0 right-edge taps

export function buildMuxScene(): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  g.setAttribute('class', 'mux-scene');

  const wire = (net: string, points: string) => {
    const w = document.createElementNS(SVG_NS, 'polyline');
    w.setAttribute('class', 'wire-mini');
    w.setAttribute('data-net', net);
    w.setAttribute('data-on', '0');
    w.setAttribute('points', points);
    g.appendChild(w);
  };
  const gate = (tid: string, d: string) => {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('class', 'tbody-mini');
    p.setAttribute('data-tid', tid);
    p.setAttribute('d', d);
    g.appendChild(p);
  };
  const label = (x: number, y: number, text: string, cls = 'tlabel-mini') => {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', cls);
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    t.textContent = text;
    g.appendChild(t);
  };

  // select inputs → decoder
  wire('s1', '0,70 70,70');
  wire('s0', '0,110 70,110');
  // data inputs → AND A
  wire('in3', `0,180 300,180`);
  wire('in2', `0,250 300,250`);
  wire('in1', `0,320 300,320`);
  wire('in0', `0,390 300,390`);
  // decoder sel outputs → AND B (jog down a per-lane vertical)
  const laneX = [200, 215, 230, 245];
  for (let i = 0; i < 4; i++) {
    wire(`sel${3 - i}`, `190,${SEL_Y[i]} ${laneX[i]},${SEL_Y[i]} ${laneX[i]},${AND_CY[i] + 12} 300,${AND_CY[i] + 12}`);
  }
  // AND outputs → OR inputs (straight)
  for (let i = 0; i < 4; i++) wire(`andOut${3 - i}`, `382,${AND_CY[i]} 420,${AND_CY[i]}`);
  // OR → out
  wire('out', '500,285 520,285');

  // decoder block (drawn as a box — it is the next drill level)
  const dec = document.createElementNS(SVG_NS, 'rect');
  dec.setAttribute('class', 'tbody-mini');
  dec.setAttribute('data-tid', 'decoder');
  dec.setAttribute('x', '70'); dec.setAttribute('y', '40');
  dec.setAttribute('width', '120'); dec.setAttribute('height', '130'); dec.setAttribute('rx', '8');
  g.appendChild(dec);
  label(130, 105, 'decoder');

  // AND gates + OR
  for (let i = 0; i < 4; i++) gate(`and${3 - i}`, andPath(341, AND_CY[i], 82, 50));
  for (let i = 0; i < 4; i++) label(345, AND_CY[i], 'AND', 'tlabel-mini-tiny');
  gate('or', orPath(420, 150, 420, 500));
  label(455, 285, 'OR', 'tlabel-mini-tiny');

  return g;
}

export interface MuxSceneState { ins: Bit[]; s1: Bit; s0: Bit; }

export function bindMuxSceneState(root: SVGGElement, state: MuxSceneState) {
  const { ins, s1, s0 } = state;
  const idx = s1 * 2 + s0;
  const sel: Bit[] = [0, 0, 0, 0];
  sel[idx] = 1;
  const andOut: Bit[] = [0, 1, 2, 3].map((i) => (ins[i] & sel[i]) as Bit) as Bit[];
  const out: Bit = (andOut[0] | andOut[1] | andOut[2] | andOut[3]) as Bit;
  const set = (sel2: string, on: Bit) =>
    root.querySelectorAll(sel2).forEach((el) => el.setAttribute('data-on', String(on)));

  set('.wire-mini[data-net="s1"]', s1);
  set('.wire-mini[data-net="s0"]', s0);
  set('.tbody-mini[data-tid="decoder"]', 1 as Bit);
  for (let i = 0; i < 4; i++) {
    set(`.wire-mini[data-net="in${i}"]`, ins[i]);
    set(`.wire-mini[data-net="sel${i}"]`, sel[i]);
    set(`.wire-mini[data-net="andOut${i}"]`, andOut[i]);
    set(`.tbody-mini[data-tid="and${i}"]`, andOut[i]);
  }
  set('.wire-mini[data-net="out"]', out);
  set('.tbody-mini[data-tid="or"]', out);
}

// Wrap a built scene so it projects into a target rectangle (parent coords).
export function placeMuxScene(
  scene: SVGGElement,
  pos: { x: number; y: number; w: number; h: number },
): SVGGElement {
  const wrap = document.createElementNS(SVG_NS, 'g') as SVGGElement;
  const sx = pos.w / MUX_SCENE_W;
  const sy = pos.h / MUX_SCENE_H;
  wrap.setAttribute('transform', `translate(${pos.x}, ${pos.y}) scale(${sx}, ${sy})`);
  wrap.appendChild(scene);
  return wrap;
}
