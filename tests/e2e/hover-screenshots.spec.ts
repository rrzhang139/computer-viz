// Capture hover-state screenshots for sub-agent zero-context review.
// The sub-agent gets these PNGs + a transistor-level reference shot and
// has to say whether the preview "matches" the drilled-in view.

import { test } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join('test-results', 'visual-trace', 'hover');

test.use({ viewport: { width: 1280, height: 900 } });

test.describe('hover-state visual trace', () => {
  // Capture all four transistors so the orientation can be verified per-role.
  for (const [i, role] of (['PA', 'PB', 'NA', 'NB'] as const).entries()) {
    test(`gate level: hover ${role} and capture inline 3D preview`, async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1500);
      mkdirSync(OUT, { recursive: true });
      await page.getByTestId(`zoom-target-${i}`).hover();
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT, `gate-hover-${role}.png`), fullPage: false });
    });
  }

  // Capture each NMOS in its CONDUCTING state (after stepping the truth
  // table to a row where the relevant input is HIGH). This verifies the
  // electron-flow animation actually triggers when the logical connection
  // is satisfied — at cycle 0 both inputs are 0, so neither NMOS is on.
  test('gate level: hover N_A at cycle 1 (A=0,B=1 — N_B conducting, but N_A not)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    // Default cycle 0 = (A=0, B=0). Step once → (A=0, B=1) → N_B on, N_A off.
    await page.getByTestId('step-cycle').click();
    await page.waitForTimeout(400);
    await page.getByTestId('zoom-target-3').hover(); // N_B
    await page.waitForTimeout(400);
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: join(OUT, 'gate-hover-NB-conducting.png'), fullPage: false });
  });

  test('gate level: hover N_A at cycle 2 (A=1,B=1 — both NMOS conducting)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.getByTestId('step-cycle').click(); // → cycle 1, A=0 B=1
    await page.waitForTimeout(300);
    await page.getByTestId('step-cycle').click(); // → cycle 2, A=1 B=1
    await page.waitForTimeout(400);
    await page.getByTestId('zoom-target-2').hover(); // N_A
    await page.waitForTimeout(400);
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: join(OUT, 'gate-hover-NA-conducting.png'), fullPage: false });
  });

  test('drilled in: PMOS at the transistor level (reference)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    mkdirSync(OUT, { recursive: true });
    await page.getByTestId('zoom-target-0').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(OUT, 'transistor-pmos-reference.png'), fullPage: false });
  });

  test('latch level: hover NAND1 and capture mini visual', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('back').click();
    await page.waitForTimeout(1800);
    await page.getByTestId('nand-1').hover();
    await page.waitForTimeout(300);
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: join(OUT, 'latch-hover-nand1.png'), fullPage: false });
  });

  test('dff level: hover master latch and capture mini visual', async ({ page }) => {
    await page.goto('/');
    // gate → latch → dlatch → dff (3 back-clicks).
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('back').click();
      await page.waitForTimeout(1800);
    }
    await page.getByTestId('master-latch').hover();
    await page.waitForTimeout(300);
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: join(OUT, 'dff-hover-master.png'), fullPage: false });
  });
});
