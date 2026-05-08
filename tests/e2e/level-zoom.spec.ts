// Zoom transition coverage. Records the click sequences a user would perform
// to walk between the bottom two levels and asserts every intermediate state.
//
// Why this matters: the LevelView state machine is the foundation for the
// full 7-level zoom flow that arrives in Phase 5. If the transistor↔electrons
// pair regresses, every deeper drill regresses with it.

import { test, expect } from '@playwright/test';

test.describe('Level zoom (transistor ↔ electrons)', () => {
  test('LevelView is visible on the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('level-breadcrumb')).toBeVisible();
    await expect(page.getByTestId('zoom-in')).toBeVisible();
    await expect(page.getByTestId('zoom-out')).toBeVisible();
  });

  test('starts at the transistor level (level 7)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-breadcrumb')).toContainText(/level 7/i);
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Transistor');
    // Canvas element rendered by react-three-fiber
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('zoom-out is disabled at the top, zoom-in is enabled', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('zoom-out')).toBeDisabled();
    await expect(page.getByTestId('zoom-in')).toBeEnabled();
  });

  test('clicking zoom-in transitions to electrons (level 8)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-in').click();
    await expect(page.getByTestId('level-pane-electrons')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByTestId('level-breadcrumb')).toContainText(/level 8/i);
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Electrons');
  });

  test('at electrons: zoom-in disabled, zoom-out enabled', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-in').click();
    await expect(page.getByTestId('zoom-in')).toBeDisabled();
    await expect(page.getByTestId('zoom-out')).toBeEnabled();
  });

  test('zoom-out from electrons returns to transistor', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-in').click();
    await page.getByTestId('zoom-out').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-pane-electrons')).toHaveAttribute('aria-hidden', 'true');
  });

  test('full round-trip: trans → electrons → trans → electrons', async ({ page }) => {
    await page.goto('/');
    const sequence = [
      ['zoom-in', 'level-pane-electrons', /level 8/i],
      ['zoom-out', 'level-pane-transistor', /level 7/i],
      ['zoom-in', 'level-pane-electrons', /level 8/i],
    ] as const;
    for (const [btn, expectedPane, expectedDepth] of sequence) {
      await page.getByTestId(btn).click();
      await expect(page.getByTestId(expectedPane)).toHaveAttribute('aria-hidden', 'false');
      await expect(page.getByTestId('level-breadcrumb')).toContainText(expectedDepth);
    }
  });

  test('gate voltage meter responds to clock ticks on electrons view', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-in').click();
    // The fill span starts at width 0% (so toBeVisible fails on a 0-height
    // element); attach via the data-testid and check style.width directly.
    const meter = page.getByTestId('vg-meter-fill');
    await expect(meter).toBeAttached();
    const w0 = await meter.evaluate((el) => (el as HTMLElement).style.width);

    await page.getByTestId('step-cycle').click();
    // useFrame ramps the gate over a few frames; wait until width changes.
    await expect(async () => {
      const w1 = await meter.evaluate((el) => (el as HTMLElement).style.width);
      expect(w1).not.toBe(w0);
    }).toPass({ timeout: 2500 });
  });

  test('clicking disabled zoom-in at electrons is a no-op', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-in').click(); // electrons
    // Force-click bypasses Playwright's actionability check; aria-disabled
    // would normally block, but we want to prove the state-machine ignores it.
    await page.getByTestId('zoom-in').click({ force: true });
    await expect(page.getByTestId('level-pane-electrons')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Electrons');
  });

  test('canvas mouse drag does not change level', async ({ page }) => {
    // The cross-fade design layers two canvases — both panes are mounted with
    // the inactive one at pointer-events: none. We test that nothing in the
    // canvas area changes the level state — only the explicit zoom-in/out
    // buttons do. Use a coordinate-based drag inside the active pane.
    await page.goto('/');
    const pane = page.getByTestId('level-pane-transistor');
    const box = await pane.boundingBox();
    if (!box) throw new Error('transistor pane not laid out');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 50);
    await page.mouse.up();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false');
  });
});
