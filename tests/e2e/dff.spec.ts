// D flip-flop (Level 3) — the first clocked storage element. Master-slave,
// edge-triggered. The level above the SR latch and the building block of
// every CPU register.
//
// What this spec asserts:
//   - Pressing "back" twice from the gate level reaches the dff.
//   - From the dff, "back" is disabled (top of the tree).
//   - The dff scene renders both latch boxes, the inverter on the clock,
//     and four labeled signals (D, CLK, Q, Q̄).
//   - The phase explainer cycles through 4 clock+data states.
//   - The KEY INSIGHT: at phase 2, D = 1 but Q is still 0 (data is queued
//     in the master, waiting for the next rising edge).
//   - Q only updates on rising edges (every other cycle).
//   - Clicking either latch box drills DOWN into the latch level with the
//     master/slave-specific spotlight.

import { test, expect } from '@playwright/test';

const SETTLE_MS = 1800;

async function gotoDff(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('back').click();   // gate → latch
  await page.waitForTimeout(SETTLE_MS);
  await page.getByTestId('back').click();   // latch → dff
  await page.waitForTimeout(SETTLE_MS);
}

// Scope locators to the active pane — `output-q`, `output-qbar`, etc. exist
// in BOTH the latch and dff scenes (they share the OutputLabel idiom), so an
// unscoped getByTestId hits Playwright strict-mode violations.
function activePane(page: import('@playwright/test').Page) {
  return page.locator('[aria-hidden="false"][data-testid^="level-pane-"]');
}

test.describe('DFF level (D flip-flop — master-slave, edge-triggered)', () => {
  test('two backs from gate navigate up to the dff', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
    await page.getByTestId('back').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-latch')).toHaveAttribute('aria-hidden', 'false');
    await page.getByTestId('back').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-dff')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Flip-Flop');
    await expect(page.getByTestId('level-breadcrumb')).toContainText(/level 3/i);
  });

  test('back from the dff is disabled (top of the tree)', async ({ page }) => {
    await gotoDff(page);
    await expect(page.getByTestId('back')).toBeDisabled();
  });

  test('dff scene renders both latches, inverter, and all four signals', async ({ page }) => {
    await gotoDff(page);
    const pane = activePane(page);
    await expect(pane.getByTestId('dff-scene')).toBeVisible();
    await expect(pane.getByTestId('master-latch')).toBeVisible();
    await expect(pane.getByTestId('slave-latch')).toBeVisible();
    await expect(pane.getByTestId('dff-inverter')).toBeVisible();
    await expect(pane.getByTestId('input-d')).toBeVisible();
    await expect(pane.getByTestId('input-clk')).toBeVisible();
    await expect(pane.getByTestId('output-q')).toBeVisible();
    await expect(pane.getByTestId('output-qbar')).toBeVisible();
  });

  test('phase spotlight cycles through 4 distinct clock states', async ({ page }) => {
    await gotoDff(page);
    // Phase prose now lives in the right-toolbar spotlight panel.
    const aside = page.locator('aside[aria-label="Level controls"]');
    // Cycle 0 = default DFF spotlight (no phase override yet).
    await expect(aside.getByTestId('spotlight-title')).toContainText(/D flip-flop/i);
    await page.getByTestId('step-cycle').click();
    // Cycle 1: rising edge, captured 0 → Q=0.
    await expect(aside.getByTestId('spotlight-title')).toContainText(/CLK ROSE.*captured 0/i);
    await page.getByTestId('step-cycle').click();
    // Cycle 2: KEY INSIGHT — D = 1 but Q is still 0.
    await expect(aside.getByTestId('spotlight-title')).toContainText(/D = 1 — but Q is still 0/i);
    await page.getByTestId('step-cycle').click();
    // Cycle 3: rising edge, captured 1 → Q=1.
    await expect(aside.getByTestId('spotlight-title')).toContainText(/CLK ROSE.*captured 1/i);
  });

  test('KEY INSIGHT — at phase 2, D=1 but Q=0 (queued in master)', async ({ page }) => {
    await gotoDff(page);
    const pane = activePane(page);
    await page.getByTestId('step-cycle').click(); // → phase 1
    await page.getByTestId('step-cycle').click(); // → phase 2
    await expect(pane.getByTestId('input-d-value')).toContainText('1');
    await expect(pane.getByTestId('output-q-value')).toContainText('0');
    // The master should reflect the queued bit even though Q hasn't moved.
    await expect(pane.getByTestId('master-latch-contents')).toContainText('held = 1');
    // Sidebar meters reflect the same state.
    const aside = page.locator('aside[aria-label="Level controls"]');
    await expect(aside.getByTestId('meter-D')).toContainText('D=1');
    await expect(aside.getByTestId('meter-Q')).toContainText('Q=0');
    await expect(aside.getByTestId('meter-M')).toContainText('M=1');
  });

  test('Q only updates on rising edges (every other cycle)', async ({ page }) => {
    await gotoDff(page);
    const pane = activePane(page);
    // 4-phase steady-state Q sequence: 1 → 0 → 0 → 1 (then back to 1 → 0 → ...)
    const expected = ['1', '0', '0', '1'];
    for (let i = 0; i < expected.length; i++) {
      await expect(pane.getByTestId('output-q-value'), `cycle ${i}: Q should be ${expected[i]}`)
        .toContainText(expected[i]);
      if (i < expected.length - 1) await page.getByTestId('step-cycle').click();
    }
  });

  test('hovering master latch swaps the labeled box for a MiniSrLatch (cross-coupled NAND pair)', async ({ page }) => {
    await gotoDff(page);
    await expect(page.getByTestId('master-latch-detailed')).toHaveCount(0);
    await page.getByTestId('master-latch').hover();
    await expect(page.getByTestId('master-latch-detailed')).toBeVisible();
    // Both feedback wires must be in the DOM — they are what makes this an
    // SR latch instead of two unrelated NANDs.
    await expect(page.getByTestId('master-latch-detailed-feedback-q')).toBeVisible();
    await expect(page.getByTestId('master-latch-detailed-feedback-qbar')).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.getByTestId('master-latch-detailed')).toHaveCount(0);
  });

  test('hovering slave latch swaps to MiniSrLatch visual', async ({ page }) => {
    await gotoDff(page);
    await expect(page.getByTestId('slave-latch-detailed')).toHaveCount(0);
    await page.getByTestId('slave-latch').hover();
    await expect(page.getByTestId('slave-latch-detailed')).toBeVisible();
  });

  test('clicking the master latch drills down to latch level with master spotlight', async ({ page }) => {
    await gotoDff(page);
    await page.getByTestId('master-latch').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-latch')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('spotlight-title')).toContainText(/Master/);
  });

  test('clicking the slave latch drills down to latch level with slave spotlight', async ({ page }) => {
    await gotoDff(page);
    await page.getByTestId('slave-latch').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-latch')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('spotlight-title')).toContainText(/Slave/);
  });

  test('summary card (in sidebar) answers the four standard questions for the dff level', async ({ page }) => {
    await gotoDff(page);
    // LevelSummary is now in the right-toolbar aside, not inside the viz.
    const aside = page.locator('aside[aria-label="Level controls"]');
    await expect(aside.getByTestId('level-summary')).toBeVisible();
    await expect(aside.getByTestId('level-summary-what')).toContainText(/D flip-flop|master-slave/i);
    await expect(aside.getByTestId('level-summary-why')).toContainText(/synchronous|edge|register|lockstep/i);
    await expect(aside.getByTestId('level-summary-in')).toContainText(/D|CLK/);
    await expect(aside.getByTestId('level-summary-out')).toContainText(/Q/);
  });
});
