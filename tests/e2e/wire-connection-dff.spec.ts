// DFF ↔ LATCH-mini wire connections (pixel-precise).
//
// Every DFF wire that terminates AT a latch mini must land within sub-pixel
// distance of the latch's matching external terminal. This is the level-3
// equivalent of wire-connection.spec.ts (level-1 ↔ level-2).

import { test, expect } from '@playwright/test';

interface Point { x: number; y: number }

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

async function polylineEndpoint(
  page: import('@playwright/test').Page,
  selector: string,
  which: 'start' | 'end',
): Promise<Point> {
  return await page.evaluate(({ selector, which }) => {
    const poly = document.querySelector(selector) as SVGPolylineElement | null;
    if (!poly) throw new Error(`no polyline: ${selector}`);
    const pts = poly.points;
    const localPt = which === 'start' ? pts.getItem(0) : pts.getItem(pts.numberOfItems - 1);
    const ctm = poly.getScreenCTM();
    if (!ctm) throw new Error('no CTM');
    return { x: localPt.x * ctm.a + localPt.y * ctm.c + ctm.e, y: localPt.x * ctm.b + localPt.y * ctm.d + ctm.f };
  }, { selector, which });
}

async function latchTerminalScreenPos(
  page: import('@playwright/test').Page,
  latchTestid: 'master-latch' | 'slave-latch',
  terminal: string,
): Promise<Point> {
  return await page.evaluate(({ latchTestid, terminal }) => {
    // D LATCH terminals (D_LATCH_MODULE).
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

const TOLERANCE_PX = 1.5;

const CONNECTIONS = [
  { wire: 'wire-d',                  which: 'end' as const,   latch: 'master-latch' as const, terminal: 'D_in',   label: 'D → master.D_in' },
  { wire: 'wire-not-clk-to-master',  which: 'end' as const,   latch: 'master-latch' as const, terminal: 'EN_in',  label: '!CLK → master.EN_in' },
  { wire: 'wire-clk-to-slave',       which: 'end' as const,   latch: 'slave-latch' as const,  terminal: 'EN_in',  label: 'CLK → slave.EN_in' },
  { wire: 'wire-master-to-slave',    which: 'start' as const, latch: 'master-latch' as const, terminal: 'Q_out',  label: 'master.Q_out → (start)' },
  { wire: 'wire-master-to-slave',    which: 'end' as const,   latch: 'slave-latch' as const,  terminal: 'D_in',   label: 'master.Q_out → slave.D_in (end)' },
  { wire: 'wire-q-out',              which: 'start' as const, latch: 'slave-latch' as const,  terminal: 'Q_out',  label: 'slave.Q_out → Q chip (start)' },
  { wire: 'wire-qbar-out',           which: 'start' as const, latch: 'slave-latch' as const,  terminal: 'QB_out', label: 'slave.QB_out → Q̄ chip (start)' },
];

test.describe('Every DFF ↔ latch-mini wire is pixel-precisely connected', () => {
  for (const c of CONNECTIONS) {
    test(`${c.label}: DFF wire endpoint coincides with latch's ${c.terminal}`, async ({ page }) => {
      await gotoDff(page);
      await page.getByTestId(c.latch).hover();
      await page.waitForTimeout(900);

      const wireEnd = await polylineEndpoint(page, `[data-testid="${c.wire}"]`, c.which);
      const terminalPos = await latchTerminalScreenPos(page, c.latch, c.terminal);
      const d = Math.hypot(wireEnd.x - terminalPos.x, wireEnd.y - terminalPos.y);
      expect(
        d,
        `${c.label}: gap = ${d.toFixed(3)} px (wire=${JSON.stringify(wireEnd)} terminal=${JSON.stringify(terminalPos)})`,
      ).toBeLessThan(TOLERANCE_PX);
    });
  }
});
