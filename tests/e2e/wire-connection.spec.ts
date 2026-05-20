// Programmatic guarantee that the latch's external wires PHYSICALLY connect
// to the gate scene's matching terminals inside the mini preview.
//
// Strategy: for every external latch wire that ends at a NAND, find the
// polyline endpoint in screen coords, then find the nearest gate-scene
// polyline endpoint, and assert they coincide within sub-pixel tolerance.
//
// This catches: projection math drift between LevelLatch's anchor
// calculation and MiniNandView's scene transform; a mini-rect or other
// element clipping/covering a wire connection; or any future change to
// SCENE_BOUNDS / WIRE_NODES that desyncs the two.

import { test, expect } from '@playwright/test';

interface Point { x: number; y: number }

async function gotoLatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="zoom-target-0"]');
  await page.getByTestId('back').click();
  await page.waitForTimeout(700);
}

// Read either the START or the END point of a polyline in SCREEN coords
// (latch CTM applied so the result is directly comparable across elements).
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

// Find the gate-scene polyline ENDPOINT (any endpoint of any polyline in
// the scene group) that's CLOSEST to a given target screen point.
// Returns the matched point's screen position + distance.
async function nearestScenePolylineEndpoint(
  page: import('@playwright/test').Page,
  sceneTestid: string,
  target: Point,
): Promise<{ point: Point; distance: number }> {
  return await page.evaluate(({ sceneTestid, target }) => {
    const scene = document.querySelector(`[data-testid="${sceneTestid}"]`);
    if (!scene) throw new Error(`no scene ${sceneTestid}`);
    const polylines = Array.from(scene.querySelectorAll('polyline')) as SVGPolylineElement[];
    let best: { point: { x: number; y: number }; distance: number } | null = null;
    for (const p of polylines) {
      const ctm = p.getScreenCTM();
      if (!ctm) continue;
      for (let i = 0; i < p.points.numberOfItems; i++) {
        const lp = p.points.getItem(i);
        const sp = { x: lp.x * ctm.a + lp.y * ctm.c + ctm.e, y: lp.x * ctm.b + lp.y * ctm.d + ctm.f };
        const d = Math.hypot(sp.x - target.x, sp.y - target.y);
        if (!best || d < best.distance) best = { point: sp, distance: d };
      }
    }
    if (!best) throw new Error('no scene polylines');
    return best;
  }, { sceneTestid, target });
}

const TOLERANCE_PX = 1.5;

// Each external latch wire's terminal-end → which mini's scene → which
// hover target activates the mini.
const CONNECTIONS = [
  { wire: 'wire-s-bar',         which: 'end' as const,   scene: 'nand-1-detailed-scene', hover: 'nand-1', label: 'S̄ → NAND1 A' },
  { wire: 'wire-r-bar',         which: 'end' as const,   scene: 'nand-2-detailed-scene', hover: 'nand-2', label: 'R̄ → NAND2 A' },
  { wire: 'wire-q-out',         which: 'start' as const, scene: 'nand-1-detailed-scene', hover: 'nand-1', label: 'NAND1 Y → Q chip' },
  { wire: 'wire-qbar-out',      which: 'start' as const, scene: 'nand-2-detailed-scene', hover: 'nand-2', label: 'NAND2 Y → Q̄ chip' },
  { wire: 'wire-q-feedback',    which: 'start' as const, scene: 'nand-1-detailed-scene', hover: 'nand-1', label: 'NAND1 Y → NAND2 B (start)' },
  { wire: 'wire-q-feedback',    which: 'end' as const,   scene: 'nand-2-detailed-scene', hover: 'nand-2', label: 'NAND1 Y → NAND2 B (end)' },
  { wire: 'wire-qbar-feedback', which: 'start' as const, scene: 'nand-2-detailed-scene', hover: 'nand-2', label: 'NAND2 Y → NAND1 B (start)' },
  { wire: 'wire-qbar-feedback', which: 'end' as const,   scene: 'nand-1-detailed-scene', hover: 'nand-1', label: 'NAND2 Y → NAND1 B (end)' },
];

test.describe('Every latch ↔ NAND-mini wire is pixel-precisely connected', () => {
  for (const c of CONNECTIONS) {
    test(`${c.label}: latch wire endpoint coincides with a gate-scene endpoint`, async ({ page }) => {
      await gotoLatch(page);
      await page.getByTestId(c.hover).hover();
      await page.waitForTimeout(900);

      const outer = await polylineEndpoint(page, `[data-testid="${c.wire}"]`, c.which);
      const inner = await nearestScenePolylineEndpoint(page, c.scene, outer);

      expect(
        inner.distance,
        `${c.label}: gap = ${inner.distance.toFixed(3)} px (outer=${JSON.stringify(outer)} inner=${JSON.stringify(inner.point)})`,
      ).toBeLessThan(TOLERANCE_PX);
    });
  }
});
