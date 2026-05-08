// Visual-trace tests. Each test exercises one interaction and saves three
// screenshots evenly spaced over ~3 s so the dynamics are inspectable.
//
// Output: test-results/visual-trace/<interaction>/frame-{0,1,2}.png
//
// These tests pass as long as Playwright can drive the interaction. They do
// NOT assert visual correctness — that's a downstream review job (run a
// subagent over the resulting frames). The point is to *capture motion that
// would otherwise be invisible to a static UI test*.
//
// Each test sets the viewport explicitly so frames are reproducible.

import { test } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join('test-results', 'visual-trace');

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

// Wait for r3f Canvas to have rendered at least one frame and for any
// transition to settle. Call after page.goto('/') in every test.
async function waitForFirstPaint(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('canvas').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(400);
}

test.describe('Visual trace — capture dynamics for review', () => {
  test('electrons-tick: gate flips, electrons start drifting', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(1700); // wait out the 1.5s zoom transition
    await page.getByTestId('step-cycle').click();
    // Capture at 0.2s, 1.2s, 2.4s after the tick — captures gate-on, mid-drift, recycle.
    await captureSequence(page, 'electrons-tick', [200, 1200, 2400]);
  });

  test('electrons-microtick-x3: gate ramp accumulates', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(1700);
    // First µ-tick (frame 0 captured BEFORE first µ-tick to show baseline)
    const dir = join(OUT, 'electrons-microtick-x3');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByTestId('step-micro').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByTestId('step-micro').click();
    await page.getByTestId('step-micro').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('zoom-in: transistor → electrons (slow microscope dive)', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'zoom-in-transition');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') }); // before
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(600); // mid-transition (~40% through)
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.waitForTimeout(1100); // after settle
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('zoom-out: electrons → transistor (slow pull-back)', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(1700);
    const dir = join(OUT, 'zoom-out-transition');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') }); // electrons settled
    await page.getByTestId('zoom-out').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.waitForTimeout(1100);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('transistor-tick: active transistor cycles through the row', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'transistor-tick');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') }); // baseline
    await page.getByTestId('step-cycle').click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByTestId('step-cycle').click();
    await page.waitForTimeout(900);
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

  test('step-stub: cycle counter increments visibly', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
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

  test('round-trip-zoom: trans → electrons → trans (capture at each settle)', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'round-trip-zoom');
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'frame-0.png') }); // transistor
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(1700);
    await page.screenshot({ path: join(dir, 'frame-1.png') }); // electrons
    await page.getByTestId('zoom-out').click();
    await page.waitForTimeout(1700);
    await page.screenshot({ path: join(dir, 'frame-2.png') }); // transistor again
  });

  // ── Click-to-highlight: deterministic data-testid artifacts ────────────

  test('click-pick-transistor: T0/T2/T3 highlight on click', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    const dir = join(OUT, 'click-pick-transistor');
    mkdirSync(dir, { recursive: true });
    await page.getByTestId('pick-transistor-0').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByTestId('pick-transistor-2').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByTestId('pick-transistor-3').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });

  test('click-part-electrons: gate / source / drain highlight glows', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(1700);
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

  test('click-part-clear: highlight returns to no-glow baseline', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(1700);
    const dir = join(OUT, 'click-part-clear');
    mkdirSync(dir, { recursive: true });
    await page.getByTestId('pick-part-gate').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-0.png') });
    await page.getByTestId('pick-part-substrate').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-1.png') });
    await page.getByTestId('pick-part-clear').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dir, 'frame-2.png') });
  });
});

// ── Pure assertion tests (no screenshots) — for the click-to-highlight
// behavior we want gating in CI even without visual review. ───────────────

test.describe('Click highlights (pure assertions)', () => {
  test('clicking pick-transistor-2 sets aria-pressed=true', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('pick-transistor-2').click();
    const btn = page.getByTestId('pick-transistor-2');
    await test.expect(btn).toHaveAttribute('aria-pressed', 'true');
    // Other buttons remain unpressed.
    await test.expect(page.getByTestId('pick-transistor-0')).toHaveAttribute('aria-pressed', 'false');
    await test.expect(page.getByTestId('pick-transistor-auto')).toHaveAttribute('aria-pressed', 'false');
  });

  test('auto button clears the pin', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('pick-transistor-2').click();
    await page.getByTestId('pick-transistor-auto').click();
    await test.expect(page.getByTestId('pick-transistor-2')).toHaveAttribute('aria-pressed', 'false');
  });

  test('part-picker highlights gate then drain', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(1700);
    await page.getByTestId('pick-part-gate').click();
    await test.expect(page.getByTestId('highlight-readout')).toContainText('gate');
    await page.getByTestId('pick-part-drain').click();
    await test.expect(page.getByTestId('highlight-readout')).toContainText('drain');
  });

  test('clear removes the highlight readout', async ({ page }) => {
    await page.goto('/');
    await waitForFirstPaint(page);
    await page.getByTestId('zoom-in').click();
    await page.waitForTimeout(1700);
    await page.getByTestId('pick-part-gate').click();
    await test.expect(page.getByTestId('highlight-readout')).toBeVisible();
    await page.getByTestId('pick-part-clear').click();
    await test.expect(page.getByTestId('highlight-readout')).toBeHidden();
  });
});
