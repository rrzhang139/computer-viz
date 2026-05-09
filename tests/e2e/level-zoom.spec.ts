// Zoom flow e2e: click a MOSFET → camera flies in → cross-fade to electrons.
//
// Test handles:
//   data-testid="zoom-target-{0..3}"  Html overlay button anchored over each
//                                      MOSFET in the row. Click triggers the
//                                      same flow as clicking the 3D mesh.
//   data-testid="back"                 right-side toolbar back button
//   data-testid="level-breadcrumb"     reflects current level
//   data-testid="level-pane-{name}"    aria-hidden flips per active level
//
// Camera fly + cross-fade together take ~1.5s. We wait 1800ms after click for
// the level to settle. Camera state is reset on every page reload (goto).

import { test, expect } from '@playwright/test';

const SETTLE_MS = 1800;

test.describe('Click-to-zoom (gate → transistor)', () => {
  test('home view is visible with all four MOSFET targets', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Gate');
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`zoom-target-${i}`)).toBeAttached();
    }
  });

  test('back button is disabled at home, enabled after zoom-in', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('back')).toBeDisabled();
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('back')).toBeEnabled();
  });

  test('clicking zoom-target-2 flies camera and switches to electrons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
    await page.getByTestId('zoom-target-2').click();
    // Wait for camera fly + cross-fade.
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Transistor');
    await expect(page.getByTestId('level-breadcrumb')).toContainText(/level 7/i);
  });

  test('all four zoom targets work', async ({ page }) => {
    for (const i of [0, 1, 2, 3]) {
      await page.goto('/');
      await page.getByTestId(`zoom-target-${i}`).click();
      await page.waitForTimeout(SETTLE_MS);
      await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false');
    }
  });

  test('back button returns to transistor', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-1').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.getByTestId('back').click();
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-breadcrumb')).toContainText('Gate');
  });

  test('Escape returns to transistor', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-1').click();
    // Wait for arrival via the assertion itself (more resilient than fixed timeout).
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    // Esc keydown is a window listener; click into the document first to make
    // sure focus is on a real DOM target rather than an inner mesh handle.
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
  });

  test('round-trip: T0 → back → T3 → back', async ({ page }) => {
    await page.goto('/');
    const sequence: Array<{ click: string; expectedHidden: string; expectedDepth: RegExp }> = [
      { click: 'zoom-target-0', expectedHidden: 'level-pane-gate', expectedDepth: /level 7/i },
      { click: 'back', expectedHidden: 'level-pane-transistor', expectedDepth: /level 6/i },
      { click: 'zoom-target-3', expectedHidden: 'level-pane-gate', expectedDepth: /level 7/i },
      { click: 'back', expectedHidden: 'level-pane-transistor', expectedDepth: /level 6/i },
    ];
    for (const { click, expectedHidden, expectedDepth } of sequence) {
      await page.getByTestId(click).click();
      await page.waitForTimeout(SETTLE_MS);
      await expect(page.getByTestId(expectedHidden)).toHaveAttribute('aria-hidden', 'true');
      await expect(page.getByTestId('level-breadcrumb')).toContainText(expectedDepth);
    }
  });

  test('hovering an overlay button shows the hover-readout', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').hover();
    await expect(page.getByTestId('hover-readout')).toContainText('T2');
  });

  test('hover-readout disappears when no longer hovering', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-1').hover();
    await expect(page.getByTestId('hover-readout')).toBeVisible();
    // Move pointer away from any zoom target.
    await page.getByTestId('level-breadcrumb').hover();
    await expect(page.getByTestId('hover-readout')).toBeHidden();
  });

  test('gate voltage meter responds to clock ticks (after zoom-in)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await page.waitForTimeout(SETTLE_MS);
    const meter = page.getByTestId('vg-meter-fill');
    await expect(meter).toBeAttached();
    const w0 = await meter.evaluate((el) => (el as HTMLElement).style.width);
    await page.getByTestId('step-cycle').click();
    await expect(async () => {
      const w1 = await meter.evaluate((el) => (el as HTMLElement).style.width);
      expect(w1).not.toBe(w0);
    }).toPass({ timeout: 2500 });
  });

  test('clicking back at transistor (disabled) is a no-op', async ({ page }) => {
    await page.goto('/');
    // Force-click a disabled button.
    await page.getByTestId('back').click({ force: true });
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
  });

  // ── Spotlight: contextual descriptions per level / per part ─────────────

  test('spotlight on gate home: explains the logic gate', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('spotlight-title')).toContainText('logic gate');
    await expect(page.getByTestId('spotlight-body')).toContainText(/boolean function|NAND|transistors/i);
  });

  test('spotlight on transistor (no part selected): explains the switch', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('A transistor', { timeout: 5000 });
    await expect(page.getByTestId('spotlight-body')).toContainText(/V_G/);
  });

  test('clicking gate updates spotlight to gate definition', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    await page.getByTestId('pick-part-gate').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('Gate');
    await expect(page.getByTestId('spotlight-body')).toContainText(/[Pp]olysilicon/);
  });

  test('clicking oxide updates spotlight to insulator definition', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    await page.getByTestId('pick-part-oxide').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('oxide');
    await expect(page.getByTestId('spotlight-body')).toContainText(/SiO/);
  });

  test('clicking source updates spotlight to n+ reservoir', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    await page.getByTestId('pick-part-source').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('Source');
    await expect(page.getByTestId('spotlight-body')).toContainText(/reservoir|electrons/i);
  });

  test('clicking drain updates spotlight to electron exit', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    await page.getByTestId('pick-part-drain').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('Drain');
    await expect(page.getByTestId('spotlight-body')).toContainText(/exit|across/i);
  });

  test('clicking substrate updates spotlight to bulk silicon definition', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    await page.getByTestId('pick-part-substrate').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('Substrate');
    await expect(page.getByTestId('spotlight-body')).toContainText(/p-doped|p-type|silicon/i);
  });

  test('clear restores the default transistor spotlight', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    await page.getByTestId('pick-part-gate').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('Gate');
    await page.getByTestId('pick-part-clear').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('A transistor');
  });

  test('back button restores the gate spotlight', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    await page.getByTestId('pick-part-gate').click();
    await page.getByTestId('back').click();
    await expect(page.getByTestId('spotlight-title')).toContainText('logic gate', { timeout: 5000 });
  });

  test('cycling through all parts updates spotlight title each time', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('zoom-target-2').click();
    await expect(page.getByTestId('level-pane-transistor')).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 });
    const parts = [
      { id: 'pick-part-gate', expected: /^Gate \(terminal\)$/ },
      { id: 'pick-part-oxide', expected: /oxide/ },
      { id: 'pick-part-source', expected: /Source/ },
      { id: 'pick-part-drain', expected: /Drain/ },
      { id: 'pick-part-substrate', expected: /Substrate/ },
    ];
    for (const p of parts) {
      await page.getByTestId(p.id).click();
      await expect(page.getByTestId('spotlight-title')).toHaveText(p.expected);
    }
  });

  test('camera state is reset on page reload (deterministic test target)', async ({ page }) => {
    // Click target 0 then reload — the second goto should put the user back
    // at the home view with all four targets visible. This is what makes the
    // "click coordinates are stable across tests" property work.
    await page.goto('/');
    await page.getByTestId('zoom-target-0').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.goto('/');
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`zoom-target-${i}`)).toBeAttached();
    }
  });
});
