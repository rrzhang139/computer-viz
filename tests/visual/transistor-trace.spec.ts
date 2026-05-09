// Capture the NMOS vs PMOS comparison at both gate states.

import { test } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join('test-results', 'visual-trace', 'transistor');

test.use({ viewport: { width: 1280, height: 900 } });

test('NMOS vs PMOS — same V_G, opposite channels', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.goto('/');
  await page.locator('canvas').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(900);
  // Click into a transistor (any will do — they all land on the same Layer 0 view).
  await page.getByTestId('zoom-target-2').click();
  await page.waitForTimeout(1800);

  // V_G = 0 (initial after fresh load + step into transistor)
  await page.screenshot({ path: join(OUT, 'vg-0.png') });

  // V_G = 1 — tick once (use the level toolbar's step button)
  await page.getByTestId('step-cycle').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'vg-1.png') });

  // back to V_G = 0
  await page.getByTestId('step-cycle').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, 'vg-0-again.png') });
});
