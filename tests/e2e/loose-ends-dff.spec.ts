// DFF-level loose-end detection — direct port of loose-ends-latch.spec.ts
// for level 3. Each embedded latch mini's external SUPPLY terminals
// (Vdd_left/right, GND_left/right) MUST be within 2 px of a DFF-level
// wire — otherwise the supply rails hang in space inside the latch
// view.
//
// Signal terminals (SB_in/RB_in/Q_out/QB_out) are intentionally NOT
// asserted here because the DFF's external interface to each latch is
// D/EN/Q (D-latch interface), not S̄/R̄ — the SR internals are a visual
// approximation. The supply rails are the universal contract.

import { test, expect } from '@playwright/test';

interface Pt { x: number; y: number }

async function gotoDff(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="zoom-target-0"]');
  await page.getByTestId('back').click();   // gate → latch
  await page.waitForTimeout(500);
  await page.getByTestId('back').click();   // latch → dlatch
  await page.waitForTimeout(500);
  await page.getByTestId('back').click();   // dlatch → dff
  await page.waitForTimeout(700);
}

async function distanceToNearestDffSegment(
  page: import('@playwright/test').Page,
  target: Pt,
): Promise<number> {
  return await page.evaluate((target) => {
    const dffSvg = document.querySelector('[data-testid="dff-scene"] svg');
    if (!dffSvg) throw new Error('no dff svg');
    const detailedScenes = Array.from(dffSvg.querySelectorAll('[data-testid$="-scene"]'));
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
    const polys = Array.from(dffSvg.querySelectorAll('polyline')) as SVGPolylineElement[];
    for (const p of polys) {
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
    const lines = Array.from(dffSvg.querySelectorAll('line')) as SVGLineElement[];
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

async function latchTerminalScreenPos(
  page: import('@playwright/test').Page,
  latchTestid: 'master-latch' | 'slave-latch',
  terminal: string,
): Promise<Pt> {
  return await page.evaluate(({ latchTestid, terminal }) => {
    // D LATCH terminals.
    const WORLD: Record<string, [number, number]> = {
      D_in: [-6.0, 0.0],
      EN_in: [-1.5, 3.5],
      Q_out: [6.0, 1.5],
      QB_out: [6.0, -1.5],
      Vdd_left: [-6.0, 4.0],
      Vdd_right: [6.0, 4.0],
      GND_left: [-6.0, -4.0],
      GND_right: [6.0, -4.0],
    };
    const w = WORLD[terminal];
    if (!w) throw new Error(`unknown terminal ${terminal}`);
    const sceneG = document.querySelector(`[data-testid="${latchTestid}-detailed"] > g[transform]`);
    if (!sceneG) throw new Error(`no scene g for ${latchTestid}`);
    const ctm = (sceneG as SVGGraphicsElement).getScreenCTM();
    if (!ctm) throw new Error('no ctm');
    return { x: w[0] * ctm.a + w[1] * ctm.c + ctm.e, y: w[0] * ctm.b + w[1] * ctm.d + ctm.f };
  }, { latchTestid, terminal });
}

const SUPPLY_TERMINALS = ['Vdd_left', 'Vdd_right', 'GND_left', 'GND_right'];

test.describe('DFF level — no loose supply ends on embedded latch minis', () => {
  for (const latch of ['master-latch', 'slave-latch'] as const) {
    for (const terminal of SUPPLY_TERMINALS) {
      test(`${latch}: ${terminal} is connected to a DFF-level wire`, async ({ page }) => {
        await gotoDff(page);
        await page.getByTestId(latch).hover();
        await page.waitForTimeout(900);

        const termPos = await latchTerminalScreenPos(page, latch, terminal);
        const d = await distanceToNearestDffSegment(page, termPos);
        expect(
          d,
          `${latch}.${terminal} at ${JSON.stringify(termPos)} is ${d.toFixed(2)}px from the nearest DFF wire`,
        ).toBeLessThan(2);
      });
    }
  }
});
