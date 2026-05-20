// Formatting smoke tests. After every change we want to know:
//   - did any panel start clipping its text?
//   - did any two HUD cards start overlapping?
//   - did any element drift off-canvas?
//
// Layout convention (post-refactor):
//   The viz canvas is JUST the diagram. All level summary, phase explainer,
//   and spotlight prose lives in the right-toolbar `aside`. The only thing
//   asserted as visible inside `level-pane-*` is the diagram + its overlays
//   that ARE the diagram (output chips, NAND symbols, latch boxes, etc.).
//
// We capture full-page screenshots at known states (so a human can scan a
// folder of PNGs after the run) AND we run quantitative checks on the DOM
// (scrollWidth vs clientWidth on the cards) for the sidebar elements.

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join('test-results', 'visual-trace', 'formatting');
const SETTLE_MS = 1800;

test.use({ viewport: { width: 1280, height: 900 } });

async function waitForFirstPaint(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('canvas').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(900);
}

async function assertNotClipped(
  page: import('@playwright/test').Page,
  testid: string,
  // 'aside' for the right toolbar (default); 'pane' scopes to active pane.
  scope: 'pane' | 'aside' | 'page' = 'aside',
): Promise<void> {
  const root =
    scope === 'aside'
      ? page.locator('aside[aria-label="Level controls"]')
      : scope === 'page'
        ? page
        : page.locator('[aria-hidden="false"][data-testid^="level-pane-"]');
  const sizes = await root.getByTestId(testid).first().evaluate((el) => {
    const e = el as HTMLElement;
    return { scrollW: e.scrollWidth, clientW: e.clientWidth, scrollH: e.scrollHeight, clientH: e.clientHeight };
  });
  expect(sizes.scrollW, `${testid} clipping horizontally`).toBeLessThanOrEqual(sizes.clientW + 2);
  expect(sizes.scrollH, `${testid} clipping vertically`).toBeLessThanOrEqual(sizes.clientH + 2);
}

async function snap(page: import('@playwright/test').Page, name: string): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
}

// Sidebar elements that should always be present after first paint at every
// non-transistor level. (Transistor level has its own variants — checked
// separately.)
async function assertSidebarBaseline(page: import('@playwright/test').Page): Promise<void> {
  await assertNotClipped(page, 'level-summary');
  await assertNotClipped(page, 'level-summary-what');
  await assertNotClipped(page, 'level-summary-why');
  await assertNotClipped(page, 'level-summary-in');
  await assertNotClipped(page, 'level-summary-out');
  await assertNotClipped(page, 'spotlight-body');
}

// Asserts the viz canvas does NOT contain any of the legacy text-overlay
// cards. They moved to the sidebar; if any of them reappears inside a
// level pane that's a regression.
async function assertNoTextOverlaysInViz(page: import('@playwright/test').Page): Promise<void> {
  const banned = [
    'level-summary',
    'phase-explainer',
    'phase-downstream',
    'latch-phase-explainer',
    'latch-phase-body',
    'dff-phase-explainer',
    'dff-phase-body',
    'nand-truth',
    'legend',
  ];
  const pane = page.locator('[aria-hidden="false"][data-testid^="level-pane-"]');
  for (const id of banned) {
    const count = await pane.locator(`[data-testid="${id}"]`).count();
    expect(count, `legacy overlay ${id} reappeared inside the viz`).toBe(0);
  }
}

test.describe('formatting smoke', () => {
  test('Gate level: sidebar baseline + no text overlays inside viz', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await assertSidebarBaseline(page);
    await assertNoTextOverlaysInViz(page);
    await snap(page, 'gate-default');
  });

  test('Gate level: full play cycle screenshots (4 phases) + meters update', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    for (let i = 0; i < 4; i++) {
      await snap(page, `gate-phase-${i}`);
      // Sidebar spotlight body must never clip in any phase.
      await assertNotClipped(page, 'spotlight-body');
      if (i < 3) await page.getByTestId('step-cycle').click();
    }
  });

  test('Transistor level (NMOS branch): sidebar baseline holds', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    await assertSidebarBaseline(page);
    await assertNoTextOverlaysInViz(page);
    // Transistor-specific in-canvas affordances stay (they ARE the diagram).
    await assertNotClipped(page, 't-legend', 'pane');
    await assertNotClipped(page, 'part-picker', 'pane');
    await snap(page, 'transistor-nmos-vg-0');
    await page.getByTestId('step-cycle').click();
    await page.waitForTimeout(400);
    await snap(page, 'transistor-nmos-vg-1');
  });

  test('Transistor level (PMOS branch): sidebar baseline holds', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-0').click();
    await page.waitForTimeout(SETTLE_MS);
    await assertSidebarBaseline(page);
    await assertNoTextOverlaysInViz(page);
    await snap(page, 'transistor-pmos-vg-0');
  });

  test('Latch level: sidebar baseline + no overlays + 4 phase screenshots', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('back').click(); // gate → latch
    await page.waitForTimeout(SETTLE_MS);
    await assertSidebarBaseline(page);
    await assertNoTextOverlaysInViz(page);
    await snap(page, 'latch-phase-0');
    for (let i = 1; i < 4; i++) {
      await page.getByTestId('step-cycle').click();
      await page.waitForTimeout(400);
      await assertNotClipped(page, 'spotlight-body');
      await snap(page, `latch-phase-${i}`);
    }
  });

  test('DFF level: sidebar baseline + no overlays + 4 phase screenshots', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('back').click(); // gate → latch
    await page.waitForTimeout(SETTLE_MS);
    await page.getByTestId('back').click(); // latch → dff
    await page.waitForTimeout(SETTLE_MS);
    await assertSidebarBaseline(page);
    await assertNoTextOverlaysInViz(page);
    await snap(page, 'dff-phase-0');
    for (let i = 1; i < 4; i++) {
      await page.getByTestId('step-cycle').click();
      await page.waitForTimeout(400);
      await assertNotClipped(page, 'spotlight-body');
      await snap(page, `dff-phase-${i}`);
    }
  });

  test('Spotlight body never clips when cycling all parts', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    const parts = ['gate', 'oxide', 'channel', 'source', 'drain', 'substrate', 'contact'] as const;
    for (const p of parts) {
      await page.getByTestId(`pick-part-${p}`).click();
      await assertNotClipped(page, 'spotlight-body');
    }
  });
});
