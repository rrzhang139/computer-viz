// Visual-trace tests. Each test exercises one interaction and saves three
// screenshots evenly spaced over ~3 s so the dynamics are inspectable.
//
// Output: test-results/visual-trace/<interaction>/frame-{0,1,2}.png

import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join('test-results', 'visual-trace');
const SETTLE_MS = 1800;

test.use({ viewport: { width: 1280, height: 900 } });

async function captureSequence(
  page: import('@playwright/test').Page,
  name: string,
  intervals: number[]
): Promise<void> {
  const dir = join(OUT, name);
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < intervals.length; i++) {
    if (i > 0) await page.waitForTimeout(intervals[i] - intervals[i - 1]);
    else await page.waitForTimeout(intervals[0]);
    await page.screenshot({ path: join(dir, `frame-${i}.png`), fullPage: false });
  }
}

async function waitForFirstPaint(page: import('@playwright/test').Page): Promise<void> {
  // Wait until at least one zoom-target Html overlay is mounted (proves the
  // r3f Canvas has run its first frame and the <Html> component painted DOM).
  await page.getByTestId('zoom-target-0').waitFor({ state: 'attached' });
  // Then give r3f a few more frames to compose materials + lighting.
  await page.waitForTimeout(900);
}

test.describe('Visual trace — capture dynamics for review', () => {
  test('hover-target: hovering overlay buttons highlights the mesh', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'hover-target');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByTestId('zoom-target-2').hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByTestId('zoom-target-3').hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('zoom-fly-in: camera flies toward T2, then cross-fade to electrons', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'zoom-fly-in');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') }); // before click
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(700); // mid-fly: camera ~75% of the way
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.waitForTimeout(1200); // settle on electrons
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('zoom-out: back button restores transistor row', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-target-1').click();
    await page.waitForTimeout(SETTLE_MS);
    const dir = join(OUT, 'zoom-out');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') }); // electrons settled
    await page.getByTestId('back').click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('electrons-tick: gate flips, electrons start drifting', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.getByTestId('step-cycle').click();
    await captureSequence(page, 'electrons-tick', [200, 1200, 2400]);
  });

  test('clock-step: step toggles V_G between off and on', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    const dir = join(OUT, 'clock-step');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') }); // V_G = 0
    await page.getByTestId('step-cycle').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-1.png') }); // V_G = 1
    await page.getByTestId('step-cycle').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-2.png') }); // V_G = 0 again
  });

  test('escape-key-zoom-out: Escape returns to transistor', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-target-3').click();
    await page.waitForTimeout(SETTLE_MS);
    const dir = join(OUT, 'escape-key-zoom-out');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('graph-modal-open: modal appears, search filters', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'graph-modal-open');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByRole('button', { name: /open knowledge graph/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByPlaceholder(/search/i).fill('electrons');
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('term-hover: definition tooltip appears', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'term-hover');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByText('MESI', { exact: true }).first().hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByText('TLB', { exact: true }).first().hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('unit-hover: unit explanation tooltip appears', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'unit-hover');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByText('100 ns', { exact: true }).hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByText('1 µs', { exact: true }).hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('step-stub: cycle counter increments visibly (dev panel)', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    // Expand the dev panel — it's hidden inside <details> by default.
    await page.locator('summary', { hasText: /dev panel/i }).click();
    const dir = join(OUT, 'step-stub');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByRole('button', { name: 'step instr' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByRole('button', { name: 'step instr' }).click();
    await page.getByRole('button', { name: 'step instr' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('round-trip: home → T0 → back → T3', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'round-trip');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByTestId('zoom-target-0').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByTestId('back').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.getByTestId('zoom-target-3').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('click-part-electrons: gate / source / drain highlight glows', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    const dir = join(OUT, 'click-part-electrons');
    mkdirSync(dir, { recursive: true });
    await page.getByTestId('pick-part-gate').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByTestId('pick-part-source').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByTestId('pick-part-drain').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });
});

test.describe('Click highlights (pure assertions)', () => {
  test('hovering zoom-target-2 sets hover-readout to its role', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').hover();
    await expect(page.getByTestId('hover-readout')).toContainText('N_A');
  });

  test('hover-readout clears when leaving the target', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-1').hover();
    await expect(page.getByTestId('hover-readout')).toBeVisible();
    await page.getByTestId('level-breadcrumb').hover();
    await expect(page.getByTestId('hover-readout')).toBeHidden();
  });

  test('part-picker highlights gate then drain (electrons view)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.getByTestId('pick-part-gate').click();
    await expect(page.getByTestId('highlight-readout')).toContainText('gate');
    await page.getByTestId('pick-part-drain').click();
    await expect(page.getByTestId('highlight-readout')).toContainText('drain');
  });

  test('clear removes the part highlight readout', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.getByTestId('pick-part-gate').click();
    await expect(page.getByTestId('highlight-readout')).toBeVisible();
    await page.getByTestId('pick-part-clear').click();
    await expect(page.getByTestId('highlight-readout')).toBeHidden();
  });
});
