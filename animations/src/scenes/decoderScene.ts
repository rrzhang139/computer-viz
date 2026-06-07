// Decoder scene — single source of truth for the 2-to-4 decoder layout.
//
// All positions are in WORLD units, matching `wire_sketches/layer10_decoder.md`
// exactly. The render function maps world → target SVG box, so the same data
// drives BOTH the standalone `/decoder.html` page (full size) and the MUX
// hover preview (scaled-down). A unit test (`tests/decoder-1to1.test.mjs`)
// re-reads `layer10_decoder.md` and confirms every position below still
// matches the wireframe.
//
// Per CLAUDE.md's locked invariant: LEFT = inputs, RIGHT = outputs.
// a1, a0, and EN all sit on the LEFT edge.

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export const DECODER_SCENE = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };

export const DECODER_CHILDREN = {
  inv_a1: { cx: -4.4, cy:  2, w: 1.2, h: 0.8 },
  inv_a0: { cx: -4.4, cy: -2, w: 1.2, h: 0.8 },
  and3:   { cx:  4.0, cy:  3, w: 1.6, h: 1.0 },
  and2:   { cx:  4.0, cy:  1, w: 1.6, h: 1.0 },
  and1:   { cx:  4.0, cy: -1, w: 1.6, h: 1.0 },
  and0:   { cx:  4.0, cy: -3, w: 1.6, h: 1.0 },
};

export const DECODER_POINTS: Record<string, Point> = {
  // External terminals — all inputs LEFT, outputs RIGHT
  a1_in:    { x: -6, y:  2 },
  a0_in:    { x: -6, y: -2 },
  EN_in:    { x: -6, y:  0 },
  sel3_out: { x:  6, y:  3 },
  sel2_out: { x:  6, y:  1 },
  sel1_out: { x:  6, y: -1 },
  sel0_out: { x:  6, y: -3 },

  // Inverter terminals (horizontal: A on LEFT, Y on RIGHT)
  inv_a1_A_in:  { x: -5.0, y:  2 },
  inv_a1_Y_out: { x: -3.8, y:  2 },
  inv_a0_A_in:  { x: -5.0, y: -2 },
  inv_a0_Y_out: { x: -3.8, y: -2 },

  // AND-3 terminals
  and3_A_in: { x: 3.2, y:  3.25 },
  and3_B_in: { x: 3.2, y:  3.00 },
  and3_C_in: { x: 3.2, y:  2.75 },
  and3_Y_out:{ x: 4.8, y:  3.00 },
  and2_A_in: { x: 3.2, y:  1.25 },
  and2_B_in: { x: 3.2, y:  1.00 },
  and2_C_in: { x: 3.2, y:  0.75 },
  and2_Y_out:{ x: 4.8, y:  1.00 },
  and1_A_in: { x: 3.2, y: -0.75 },
  and1_B_in: { x: 3.2, y: -1.00 },
  and1_C_in: { x: 3.2, y: -1.25 },
  and1_Y_out:{ x: 4.8, y: -1.00 },
  and0_A_in: { x: 3.2, y: -2.75 },
  and0_B_in: { x: 3.2, y: -3.00 },
  and0_C_in: { x: 3.2, y: -3.25 },
  and0_Y_out:{ x: 4.8, y: -3.00 },

  // Bus junctions
  a1_tap:      { x: -5.5, y:  2 },
  a0_tap:      { x: -5.3, y: -2 },
  na1_tap:     { x: -3.5, y:  2 },
  na0_tap:     { x: -3.3, y: -2 },
  EN_lane_top: { x:  0,   y:  0.2 },
};

// External terminal keys (LEFT inputs, RIGHT outputs), in DECODER_POINTS.
export const DECODER_TERMINAL_KEYS = [
  'a1_in', 'a0_in', 'EN_in', 'sel3_out', 'sel2_out', 'sel1_out', 'sel0_out',
] as const;

// Project the decoder's external terminals into a target box — the same
// world→box mapping renderDecoderScene uses — so a parent can route its wires
// onto the exact points where the preview's terminal stubs land.
export function decoderTerminals(target: Box): Record<string, Point> {
  const W = DECODER_SCENE.xMax - DECODER_SCENE.xMin;
  const H = DECODER_SCENE.yMax - DECODER_SCENE.yMin;
  const out: Record<string, Point> = {};
  for (const k of DECODER_TERMINAL_KEYS) {
    const p = DECODER_POINTS[k];
    out[k] = {
      x: target.x + (p.x - DECODER_SCENE.xMin) * (target.w / W),
      y: target.y + (DECODER_SCENE.yMax - p.y) * (target.h / H),
    };
  }
  return out;
}

type WireSpec = { net: string; path: (string | Point)[] };
export const DECODER_WIRES: WireSpec[] = [
  { net: 'Vdd',   path: [{ x: -6, y:  4 }, { x: 6, y:  4 }] },
  { net: 'GND',   path: [{ x: -6, y: -4 }, { x: 6, y: -4 }] },
  // a1 — LEFT-edge pin → inverter, with branches to AND row
  { net: 'a1',    path: ['a1_in', 'inv_a1_A_in'] },
  { net: 'a1',    path: ['a1_tap', { x: -5.5, y:  3.25 }, 'and3_A_in'] },
  { net: 'a1',    path: ['a1_tap', { x: -5.5, y:  1.25 }, 'and2_A_in'] },
  // a0
  { net: 'a0',    path: ['a0_in', 'inv_a0_A_in'] },
  { net: 'a0',    path: ['a0_tap', { x: -5.3, y:  3 },    'and3_B_in'] },
  { net: 'a0',    path: ['a0_tap', { x: -5.3, y: -1 },    'and1_B_in'] },
  // ~a1
  { net: 'a1bar', path: ['inv_a1_Y_out', 'na1_tap'] },
  { net: 'a1bar', path: ['na1_tap', { x: -3.5, y: -0.75 }, 'and1_A_in'] },
  { net: 'a1bar', path: ['na1_tap', { x: -3.5, y: -2.75 }, 'and0_A_in'] },
  // ~a0
  { net: 'a0bar', path: ['inv_a0_Y_out', 'na0_tap'] },
  { net: 'a0bar', path: ['na0_tap', { x: -3.3, y:  1 }, 'and2_B_in'] },
  { net: 'a0bar', path: ['na0_tap', { x: -3.3, y: -3 }, 'and0_B_in'] },
  // EN — LEFT pin → tiny jog → vertical trunk → 4 taps
  { net: 'EN',    path: ['EN_in', { x: -0.2, y: 0 }, { x: -0.2, y: 0.2 }, 'EN_lane_top'] },
  { net: 'EN',    path: ['EN_lane_top', { x: 0, y:  2.75 }, 'and3_C_in'] },
  { net: 'EN',    path: ['EN_lane_top', { x: 0, y:  0.75 }, 'and2_C_in'] },
  { net: 'EN',    path: ['EN_lane_top', { x: 0, y: -1.25 }, 'and1_C_in'] },
  { net: 'EN',    path: ['EN_lane_top', { x: 0, y: -3.25 }, 'and0_C_in'] },
  // sel outputs — straight horizontals to RIGHT pins
  { net: 'sel3',  path: ['and3_Y_out', 'sel3_out'] },
  { net: 'sel2',  path: ['and2_Y_out', 'sel2_out'] },
  { net: 'sel1',  path: ['and1_Y_out', 'sel1_out'] },
  { net: 'sel0',  path: ['and0_Y_out', 'sel0_out'] },
];

export const DECODER_PINS: { id: string; point: string; label: string; labelDx?: number; labelDy?: number }[] = [
  { id: 'pinA1',   point: 'a1_in',    label: 'a1',   labelDx: -18 },
  { id: 'pinA0',   point: 'a0_in',    label: 'a0',   labelDx: -18 },
  { id: 'pinEN',   point: 'EN_in',    label: 'EN',   labelDx: -18 },
  { id: 'pinSel3', point: 'sel3_out', label: 'sel3', labelDx:  18 },
  { id: 'pinSel2', point: 'sel2_out', label: 'sel2', labelDx:  18 },
  { id: 'pinSel1', point: 'sel1_out', label: 'sel1', labelDx:  18 },
  { id: 'pinSel0', point: 'sel0_out', label: 'sel0', labelDx:  18 },
];

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface RenderOptions {
  idPrefix?: string;
  showPins?: boolean;
  pinRadius?: number;
  notBubbleR?: number;
  gateClass?: string;
}

export function renderDecoderScene(target: Box, opts: RenderOptions = {}): SVGGElement {
  const {
    idPrefix = 'g',
    showPins = true,
    pinRadius = 7,
    notBubbleR = 0.08,
    gateClass = 'tbody',
  } = opts;

  const W = DECODER_SCENE.xMax - DECODER_SCENE.xMin;
  const H = DECODER_SCENE.yMax - DECODER_SCENE.yMin;
  const sx = target.w / W;
  const sy = target.h / H;
  const toSvg = (p: Point): Point => ({
    x: target.x + (p.x - DECODER_SCENE.xMin) * sx,
    y: target.y + (DECODER_SCENE.yMax - p.y) * sy,
  });
  const resolve = (p: string | Point): Point =>
    typeof p === 'string' ? DECODER_POINTS[p] : p;

  const root = document.createElementNS(SVG_NS, 'g');
  root.setAttribute('class', 'decoder-scene');

  for (const wire of DECODER_WIRES) {
    const poly = document.createElementNS(SVG_NS, 'polyline');
    poly.setAttribute('class', 'wire');
    poly.setAttribute('data-net', wire.net);
    if (wire.net === 'Vdd') poly.setAttribute('data-on', '1');
    const pts = wire.path.map(resolve).map(toSvg).map((p) => `${p.x},${p.y}`).join(' ');
    poly.setAttribute('points', pts);
    root.appendChild(poly);
  }

  // Horizontal NOT triangle (input LEFT, output RIGHT with bubble at right tip)
  function notPath(c: typeof DECODER_CHILDREN.inv_a1): string {
    const tl = toSvg({ x: c.cx - c.w / 2, y: c.cy + c.h / 2 });
    const bl = toSvg({ x: c.cx - c.w / 2, y: c.cy - c.h / 2 });
    const bubbleCenter = toSvg({ x: c.cx + c.w / 2 - notBubbleR, y: c.cy });
    const rB = notBubbleR * Math.min(sx, sy);
    const apex = { x: bubbleCenter.x - rB, y: tl.y + (bl.y - tl.y) / 2 };
    const right = bubbleCenter.x + rB;
    return [
      `M ${tl.x} ${tl.y} L ${bl.x} ${bl.y} L ${apex.x} ${apex.y} Z`,
      `M ${apex.x} ${apex.y} A ${rB} ${rB} 0 1 0 ${right} ${apex.y} A ${rB} ${rB} 0 1 0 ${apex.x} ${apex.y} Z`,
    ].join(' ');
  }

  function andPath(c: { cx: number; cy: number; w: number; h: number }): string {
    const tl = toSvg({ x: c.cx - c.w / 2, y: c.cy + c.h / 2 });
    const bl = toSvg({ x: c.cx - c.w / 2, y: c.cy - c.h / 2 });
    const rxSvg = (c.h / 2) * sy;
    const curveStartTop    = { x: tl.x + (c.w * sx) - rxSvg, y: tl.y };
    const curveStartBottom = { x: tl.x + (c.w * sx) - rxSvg, y: bl.y };
    return `M ${tl.x} ${tl.y} L ${curveStartTop.x} ${curveStartTop.y} ` +
           `A ${rxSvg} ${(bl.y - tl.y) / 2} 0 0 1 ${curveStartBottom.x} ${curveStartBottom.y} ` +
           `L ${bl.x} ${bl.y} Z`;
  }

  const addGate = (id: string, d: string) => {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('class', gateClass);
    p.setAttribute('id', `${idPrefix}${id}`);
    p.setAttribute('d', d);
    root.appendChild(p);
  };
  addGate('InvA1', notPath(DECODER_CHILDREN.inv_a1));
  addGate('InvA0', notPath(DECODER_CHILDREN.inv_a0));
  addGate('And3', andPath(DECODER_CHILDREN.and3));
  addGate('And2', andPath(DECODER_CHILDREN.and2));
  addGate('And1', andPath(DECODER_CHILDREN.and1));
  addGate('And0', andPath(DECODER_CHILDREN.and0));

  const fontPx = Math.min(sx, sy) * 0.32;
  if (fontPx >= 9) {
    const addLabel = (cx: number, cy: number, text: string, dx = 0) => {
      const p = toSvg({ x: cx + dx, y: cy });
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'tlabel');
      t.setAttribute('x', String(p.x));
      t.setAttribute('y', String(p.y));
      t.setAttribute('style', `font-size: ${fontPx}px`);
      t.textContent = text;
      root.appendChild(t);
    };
    addLabel(DECODER_CHILDREN.inv_a1.cx, DECODER_CHILDREN.inv_a1.cy, 'NOT', -0.2);
    addLabel(DECODER_CHILDREN.inv_a0.cx, DECODER_CHILDREN.inv_a0.cy, 'NOT', -0.2);
    addLabel(DECODER_CHILDREN.and3.cx,   DECODER_CHILDREN.and3.cy,   'AND', -0.2);
    addLabel(DECODER_CHILDREN.and2.cx,   DECODER_CHILDREN.and2.cy,   'AND', -0.2);
    addLabel(DECODER_CHILDREN.and1.cx,   DECODER_CHILDREN.and1.cy,   'AND', -0.2);
    addLabel(DECODER_CHILDREN.and0.cx,   DECODER_CHILDREN.and0.cy,   'AND', -0.2);
    // Label the inverter-output buses so the prose's "a1, ~a1, EN, a0, ~a0"
    // are all findable on the canvas (a1/a0/EN are already pin-labelled).
    const addBus = (cx: number, cy: number, text: string) => {
      const p = toSvg({ x: cx, y: cy });
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'tlabel-small');
      t.setAttribute('x', String(p.x));
      t.setAttribute('y', String(p.y));
      t.setAttribute('style', `font-size: ${fontPx * 0.82}px`);
      t.textContent = text;
      root.appendChild(t);
    };
    addBus(-3.4, 2.55, '~a1');
    addBus(-3.2, -1.45, '~a0');
  }

  if (showPins) {
    for (const pin of DECODER_PINS) {
      const p = toSvg(DECODER_POINTS[pin.point]);
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', 'pin');
      c.setAttribute('id', pin.id);
      c.setAttribute('cx', String(p.x));
      c.setAttribute('cy', String(p.y));
      c.setAttribute('r', String(pinRadius));
      root.appendChild(c);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'tlabel-small');
      t.setAttribute('x', String(p.x + (pin.labelDx ?? 0)));
      t.setAttribute('y', String(p.y + (pin.labelDy ?? 0)));
      t.textContent = pin.label;
      root.appendChild(t);
    }
  }

  return root;
}
