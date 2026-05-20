// SR latch (Level 2) — the first stateful primitive made of gates.
//
// What this spec asserts:
//   - Pressing "back" from the gate level navigates UP to the latch.
//   - The latch renders both NAND gates and four labeled signals (S̄, R̄, Q, Q̄).
//   - The phase explainer cycles through hold → set → hold → reset and Q
//     follows the most recent set/reset (i.e., the latch REMEMBERS).
//   - Clicking either NAND drills DOWN into the gate level.

import { test, expect } from '@playwright/test';

const SETTLE_MS = 1800;

async function gotoLatch(page: import('@playwright/test').Page): Promise<void> {
  // Default landing is gate; back once = latch.
  await page.goto('/');
  await page.getByTestId('back').click();
  await page.waitForTimeout(SETTLE_MS);
}

// Scope locators to the active pane — `output-q`, `output-qbar`, etc. exist
// in BOTH the latch and dff scenes (they share the OutputLabel idiom), so an
// unscoped getByTestId hits Playwright strict-mode violations.
function activePane(page: import('@playwright/test').Page) {
  return page.locator('[aria-hidden="false"][data-testid^="level-pane-"]');
}

test.describe('Latch level (SR latch — 2 cross-coupled NANDs)', () => {
  test('back from gate navigates up to the latch', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
    await page.getByTestId('back').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-latch')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Latch');
    await expect(page.getByTestId('level-breadcrumb')).toContainText(/level 2/i);
  });

  test('back from the latch goes UP to the d-latch (latch is no longer top)', async ({ page }) => {
    await gotoLatch(page);
    await expect(page.getByTestId('back')).toBeEnabled();
    await page.getByTestId('back').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-dlatch')).toHaveAttribute('aria-hidden', 'false');
  });

  test('latch scene renders both NAND gates and all four signals', async ({ page }) => {
    await gotoLatch(page);
    const pane = activePane(page);
    await expect(pane.getByTestId('latch-scene')).toBeVisible();
    await expect(pane.getByTestId('nand-1')).toBeVisible();
    await expect(pane.getByTestId('nand-2')).toBeVisible();
    await expect(pane.getByTestId('input-s-bar')).toBeVisible();
    await expect(pane.getByTestId('input-r-bar')).toBeVisible();
    await expect(pane.getByTestId('output-q')).toBeVisible();
    await expect(pane.getByTestId('output-qbar')).toBeVisible();
  });

  test('phase spotlight cycles hold → set → hold → reset', async ({ page }) => {
    await gotoLatch(page);
    const pane = activePane(page);
    const aside = page.locator('aside[aria-label="Level controls"]');
    // Cycle 0: default latch spotlight (no phase override yet).
    await expect(aside.getByTestId('spotlight-title')).toContainText(/SR latch/i);
    await page.getByTestId('step-cycle').click();
    // Cycle 1: SET phase
    await expect(aside.getByTestId('spotlight-title')).toContainText(/SET/i);
    await page.getByTestId('step-cycle').click();
    // Cycle 2: HOLD again — Q remembered = 1.
    await expect(aside.getByTestId('spotlight-title')).toContainText(/HOLD/i);
    await expect(pane.getByTestId('output-q-value')).toContainText('1');
    await page.getByTestId('step-cycle').click();
    // Cycle 3: RESET phase
    await expect(aside.getByTestId('spotlight-title')).toContainText(/RESET/i);
    await expect(pane.getByTestId('output-q-value')).toContainText('0');
  });

  test('Q and Q̄ are always opposite during normal operation', async ({ page }) => {
    await gotoLatch(page);
    const pane = activePane(page);
    const bit = (raw: string | null): string => (raw ?? '').replace(/[^01]/g, '');
    for (let i = 0; i < 4; i++) {
      const q = bit(await pane.getByTestId('output-q-value').textContent());
      const qbar = bit(await pane.getByTestId('output-qbar-value').textContent());
      expect(q === '0' ? '1' : '0', `cycle ${i}: Q=${q}, Q̄=${qbar} should be opposite`).toBe(qbar);
      if (i < 3) await page.getByTestId('step-cycle').click();
    }
  });

  test('hovering NAND1 swaps simple D-shape for ConnectedNand with 4 internal CMOS transistors AND parent-net labels (S̄, Q̄, Q)', async ({ page }) => {
    await gotoLatch(page);
    // No detailed view before hover.
    await expect(page.getByTestId('nand-1-detailed')).toHaveCount(0);
    await page.getByTestId('nand-1').hover();
    await expect(page.getByTestId('nand-1-detailed')).toBeVisible();
    // 4 internal transistor chips visible.
    await expect(page.getByTestId('nand-1-detailed-pmos-a')).toBeVisible();
    await expect(page.getByTestId('nand-1-detailed-pmos-b')).toBeVisible();
    await expect(page.getByTestId('nand-1-detailed-nmos-a')).toBeVisible();
    await expect(page.getByTestId('nand-1-detailed-nmos-b')).toBeVisible();
    // Parent-latch net labels at each external terminal — same nitty-gritty
    // as the gate-level hover (Vdd / Y / A labels touching transistor wires).
    await expect(page.getByTestId('nand-1-detailed-net-a')).toContainText('S̄');
    await expect(page.getByTestId('nand-1-detailed-net-b')).toContainText('Q̄');
    await expect(page.getByTestId('nand-1-detailed-net-y')).toContainText('Q');
    // Move away — simple D-shape returns.
    await page.mouse.move(0, 0);
    await expect(page.getByTestId('nand-1-detailed')).toHaveCount(0);
  });

  test('hovering NAND2 swaps to ConnectedNand with R̄/Q/Q̄ net labels', async ({ page }) => {
    await gotoLatch(page);
    await expect(page.getByTestId('nand-2-detailed')).toHaveCount(0);
    await page.getByTestId('nand-2').hover();
    await expect(page.getByTestId('nand-2-detailed')).toBeVisible();
    await expect(page.getByTestId('nand-2-detailed-pmos-a')).toBeVisible();
    await expect(page.getByTestId('nand-2-detailed-nmos-b')).toBeVisible();
    await expect(page.getByTestId('nand-2-detailed-net-a')).toContainText('R̄');
    await expect(page.getByTestId('nand-2-detailed-net-b')).toContainText('Q');
    await expect(page.getByTestId('nand-2-detailed-net-y')).toContainText('Q̄');
  });

  test('clicking NAND1 drills into the gate level', async ({ page }) => {
    await gotoLatch(page);
    await page.getByTestId('nand-1').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Gate');
    // Spotlight should reflect that NAND1 was the entry point.
    await expect(page.getByTestId('spotlight-title')).toContainText(/NAND1/);
  });

  test('clicking NAND2 drills into the gate level with NAND2 spotlight', async ({ page }) => {
    await gotoLatch(page);
    await page.getByTestId('nand-2').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('spotlight-title')).toContainText(/NAND2/);
  });

  test('summary card (in sidebar) is present and answers the four standard questions', async ({ page }) => {
    await gotoLatch(page);
    // LevelSummary lives in the sidebar now, not in the viz.
    const pane = page.locator('aside[aria-label="Level controls"]');
    await expect(pane.getByTestId('level-summary')).toBeVisible();
    await expect(pane.getByTestId('level-summary-what')).toContainText(/SR latch/i);
    await expect(pane.getByTestId('level-summary-why')).toContainText(/stateful|memory|remember/i);
    await expect(pane.getByTestId('level-summary-in')).toContainText(/S̄|R̄/);
    await expect(pane.getByTestId('level-summary-out')).toContainText(/Q/);
  });
});
