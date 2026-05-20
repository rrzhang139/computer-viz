// Responsive sizing probe.
//
// Post-refactor (LevelSummary + phase moved to sidebar): the viz canvas
// holds only the diagram, so there are no in-pane HUD cards to overlap.
// What is enforced at EVERY viewport:
//   - The page never has a horizontal scrollbar.
//   - The active level pane and the right-toolbar aside don't overlap.
//   - The sidebar LevelSummary stays inside the aside.
//   - LevelSummary rows don't clip horizontally.
//
// Screenshots land in test-results/visual-trace/responsive/<size>.png.

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join('test-results', 'visual-trace', 'responsive');

interface Box { x: number; y: number; width: number; height: number }
function rectsOverlap(a: Box, b: Box): boolean {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

const SIZES = [
  { name: 'narrow-480',   width: 480,  height: 800 },
  { name: 'tablet-768',   width: 768,  height: 1024 },
  { name: 'laptop-1024',  width: 1024, height: 768 },
  { name: 'default-1280', width: 1280, height: 900 },
  { name: 'medium-1440',  width: 1440, height: 900 },
  { name: 'large-1920',   width: 1920, height: 1080 },
] as const;

async function settle(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('canvas').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(900);
}

async function activePane(page: import('@playwright/test').Page) {
  return page.locator('[aria-hidden="false"][data-testid^="level-pane-"]');
}

test.describe('Responsive sizing', () => {
  for (const size of SIZES) {
    test(`fits at ${size.name} (${size.width}×${size.height})`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/');
      await settle(page);

      mkdirSync(OUT, { recursive: true });
      await page.screenshot({ path: join(OUT, `${size.name}-gate.png`), fullPage: false });

      // (1) No horizontal page overflow.
      const overflow = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(
        overflow.sw,
        `horizontal page overflow at ${size.name}: scrollW=${overflow.sw} > clientW=${overflow.cw}`,
      ).toBeLessThanOrEqual(overflow.cw + 2);

      const pane = await activePane(page);
      const paneBox = await pane.boundingBox();
      const asideBox = await page.locator('aside[aria-label="Level controls"]').boundingBox();
      if (!paneBox || !asideBox) throw new Error('pane or aside missing');

      // (2) The level pane and the toolbar aside don't overlap.
      expect(
        rectsOverlap(paneBox, asideBox),
        `pane and aside overlap at ${size.name}: pane=${JSON.stringify(paneBox)} vs aside=${JSON.stringify(asideBox)}`,
      ).toBe(false);

      // (3) The sidebar's LevelSummary fits horizontally within the aside.
      // (Aside has overflow:auto vertically, so summary's bbox may extend
      // below the visible aside — that's expected and the user scrolls.)
      const aside = page.locator('aside[aria-label="Level controls"]');
      const summaryBox = await aside.getByTestId('level-summary').boundingBox();
      if (!summaryBox) throw new Error('level-summary not laid out in sidebar');
      expect(
        summaryBox.x >= asideBox.x - 4 && summaryBox.x + summaryBox.width <= asideBox.x + asideBox.width + 4,
        `level-summary spills outside the aside HORIZONTALLY at ${size.name}: aside=${JSON.stringify(asideBox)} summary=${JSON.stringify(summaryBox)}`,
      ).toBe(true);

      // (4) Spot-check: the four summary rows don't clip horizontally.
      for (const id of ['level-summary', 'level-summary-what', 'level-summary-why']) {
        const sizes = await aside.getByTestId(id).first().evaluate((el) => {
          const e = el as HTMLElement;
          return { scrollW: e.scrollWidth, clientW: e.clientWidth };
        });
        expect(
          sizes.scrollW,
          `${id} clips horizontally at ${size.name}: scrollW=${sizes.scrollW} > clientW=${sizes.clientW}`,
        ).toBeLessThanOrEqual(sizes.clientW + 2);
      }

      // Latch level: same checks after navigating up.
      await page.getByTestId('back').click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(OUT, `${size.name}-latch.png`), fullPage: false });
      const overflow2 = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(
        overflow2.sw,
        `latch: horizontal overflow at ${size.name}`,
      ).toBeLessThanOrEqual(overflow2.cw + 2);
    });
  }

  test('resize from default → narrow → wide does not break the layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await settle(page);
    // Snapshot at three sizes after live resize (no reload).
    for (const w of [1280, 600, 1600] as const) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(
        overflow.sw,
        `resize live to ${w}: horizontal overflow`,
      ).toBeLessThanOrEqual(overflow.cw + 2);
      mkdirSync(OUT, { recursive: true });
      await page.screenshot({ path: join(OUT, `live-resize-${w}.png`), fullPage: false });
    }
  });
});
