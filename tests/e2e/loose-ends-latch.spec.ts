// Latch-level loose-end detection.
//
// When the latch embeds a NAND-gate mini, the gate scene exposes these
// EXTERNAL terminals (declared in nandWireGraph.GATE_EXTERNAL_TERMINALS):
//
//   A_input, B_input, Y_out              — signal IO
//   Vdd_rail_left, Vdd_rail_right        — power
//   GND_rail_left, GND_rail_right        — ground
//
// Inside the latch, EVERY external terminal of EVERY NAND mini must be
// physically connected to a LATCH-level wire (either a signal wire like
// wire-s-bar or a supply rail like latch-vdd-rail-*). Anything not
// connected is a loose end — wire hanging in space.
//
// We assert this in screen coordinates: for each terminal's projected
// position, find a latch-level polyline/line that passes through the
// point (within 1.5 px). Catches the "VDD and ground are not there in
// layer 2" bug + any future supply that gets added to the gate but not
// hooked up by the latch.

import { test, expect } from '@playwright/test';

interface Pt { x: number; y: number }

const GATE_EXTERNALS = [
  'A_input', 'B_input', 'Y_out',
  'Vdd_rail_left', 'Vdd_rail_right',
  'GND_rail_left', 'GND_rail_right',
];

async function gotoLatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="zoom-target-0"]');
  await page.getByTestId('back').click();
  await page.waitForTimeout(700);
}

// Read the SCREEN endpoints (start/end) of every latch-level polyline AND
// line element. Returns a flat list of points.
async function allLatchWireEndpoints(page: import('@playwright/test').Page): Promise<Pt[]> {
  return await page.evaluate(() => {
    const latchSvg = document.querySelector('[data-testid="latch-scene"] svg');
    if (!latchSvg) throw new Error('no latch svg');
    // Latch-level wires are direct children of the SVG (or inside its
    // top-level <g>) — NOT inside a nand-N-detailed-scene group.
    const detailedScenes = Array.from(latchSvg.querySelectorAll('[data-testid$="-scene"]'));
    const isInsideDetailed = (el: Element) => detailedScenes.some((d) => d.contains(el));

    const out: { x: number; y: number }[] = [];
    const polylines = Array.from(latchSvg.querySelectorAll('polyline')) as SVGPolylineElement[];
    for (const p of polylines) {
      if (isInsideDetailed(p)) continue;
      const ctm = p.getScreenCTM(); if (!ctm) continue;
      for (let i = 0; i < p.points.numberOfItems; i++) {
        const lp = p.points.getItem(i);
        out.push({ x: lp.x * ctm.a + lp.y * ctm.c + ctm.e, y: lp.x * ctm.b + lp.y * ctm.d + ctm.f });
      }
    }
    const lines = Array.from(latchSvg.querySelectorAll('line')) as SVGLineElement[];
    for (const l of lines) {
      if (isInsideDetailed(l)) continue;
      const ctm = l.getScreenCTM(); if (!ctm) continue;
      for (const [x, y] of [
        [l.x1.baseVal.value, l.y1.baseVal.value],
        [l.x2.baseVal.value, l.y2.baseVal.value],
      ]) {
        out.push({ x: x * ctm.a + y * ctm.c + ctm.e, y: x * ctm.b + y * ctm.d + ctm.f });
      }
    }
    return out;
  });
}

// For a given target point, return the minimum distance to ANY latch-level
// wire segment (line or polyline). A small distance means "the target sits
// ON a latch wire" — the gate-external terminal is physically connected.
async function distanceToNearestLatchSegment(
  page: import('@playwright/test').Page,
  target: Pt,
): Promise<number> {
  return await page.evaluate((target) => {
    const latchSvg = document.querySelector('[data-testid="latch-scene"] svg');
    if (!latchSvg) throw new Error('no latch svg');
    const detailedScenes = Array.from(latchSvg.querySelectorAll('[data-testid$="-scene"]'));
    const isInsideDetailed = (el: Element) => detailedScenes.some((d) => d.contains(el));

    function distToSeg(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
      const px = a.x + t * dx, py = a.y + t * dy;
      return Math.hypot(p.x - px, p.y - py);
    }

    let best = Infinity;
    const polylines = Array.from(latchSvg.querySelectorAll('polyline')) as SVGPolylineElement[];
    for (const p of polylines) {
      if (isInsideDetailed(p)) continue;
      const ctm = p.getScreenCTM(); if (!ctm) continue;
      const screenPts: { x: number; y: number }[] = [];
      for (let i = 0; i < p.points.numberOfItems; i++) {
        const lp = p.points.getItem(i);
        screenPts.push({ x: lp.x * ctm.a + lp.y * ctm.c + ctm.e, y: lp.x * ctm.b + lp.y * ctm.d + ctm.f });
      }
      for (let i = 0; i + 1 < screenPts.length; i++) {
        const d = distToSeg(target, screenPts[i], screenPts[i + 1]);
        if (d < best) best = d;
      }
    }
    const lines = Array.from(latchSvg.querySelectorAll('line')) as SVGLineElement[];
    for (const l of lines) {
      if (isInsideDetailed(l)) continue;
      const ctm = l.getScreenCTM(); if (!ctm) continue;
      const a = { x: l.x1.baseVal.value * ctm.a + l.y1.baseVal.value * ctm.c + ctm.e, y: l.x1.baseVal.value * ctm.b + l.y1.baseVal.value * ctm.d + ctm.f };
      const b = { x: l.x2.baseVal.value * ctm.a + l.y2.baseVal.value * ctm.c + ctm.e, y: l.x2.baseVal.value * ctm.b + l.y2.baseVal.value * ctm.d + ctm.f };
      const d = distToSeg(target, a, b);
      if (d < best) best = d;
    }
    return best;
  }, target);
}

// Read the screen position of a node INSIDE the nand-N-detailed-scene
// (already projected into latch SVG coords via the scene transform).
async function gateTerminalScreenPos(
  page: import('@playwright/test').Page,
  nandTestid: 'nand-1' | 'nand-2',
  terminal: string,
): Promise<Pt> {
  return await page.evaluate(({ nandTestid, terminal }) => {
    // Each terminal coord lives in nandWireGraph.WIRE_NODES; we duplicate
    // the needed entries here in browser context.
    const WORLD: Record<string, [number, number]> = {
      A_input: [-4, 1.5],
      B_input: [4, 1.5],
      Y_out: [3, 0.5],
      Vdd_rail_left: [-3, 3],
      Vdd_rail_right: [3, 3],
      GND_rail_left: [-3, -3.5],
      GND_rail_right: [3, -3.5],
    };
    const w = WORLD[terminal];
    if (!w) throw new Error(`unknown terminal ${terminal}`);
    // Apply scene transform: same logic as MiniNandView.
    const sceneG = document.querySelector(`[data-testid="${nandTestid}-detailed"] > g[transform]`);
    if (!sceneG) throw new Error(`no scene g for ${nandTestid}`);
    const ctm = (sceneG as SVGGraphicsElement).getScreenCTM();
    if (!ctm) throw new Error('no ctm');
    return { x: w[0] * ctm.a + w[1] * ctm.c + ctm.e, y: w[0] * ctm.b + w[1] * ctm.d + ctm.f };
  }, { nandTestid, terminal });
}

const SUPPLY_TERMINALS = ['Vdd_rail_left', 'Vdd_rail_right', 'GND_rail_left', 'GND_rail_right'];
const SIGNAL_TERMINALS = ['A_input', 'B_input', 'Y_out'];

test.describe('Latch level — no loose wire ends', () => {
  for (const nand of ['nand-1', 'nand-2'] as const) {
    for (const terminal of [...SIGNAL_TERMINALS, ...SUPPLY_TERMINALS]) {
      test(`${nand}: ${terminal} is connected to a latch-level wire`, async ({ page }) => {
        await gotoLatch(page);
        await page.getByTestId(nand).hover();
        await page.waitForTimeout(900);

        const termPos = await gateTerminalScreenPos(page, nand, terminal);
        const d = await distanceToNearestLatchSegment(page, termPos);
        expect(d, `${nand}.${terminal} at ${JSON.stringify(termPos)} is ${d.toFixed(2)}px from the nearest latch-level wire — loose end`).toBeLessThan(2);
      });
    }
  }
});
