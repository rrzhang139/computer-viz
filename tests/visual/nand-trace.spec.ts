// Capture screenshots of the NAND gate cycling through inputs so a fresh
// reviewer can decide if the visualization is intuitive without explanation.

import { test } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = join('test-results', 'visual-trace', 'nand');

test.use({ viewport: { width: 1280, height: 900 } });

test('NAND truth-table tour with pulse animation', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  await page.goto('/');
  await page.locator('canvas').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(900);

  // Capture each input combination + a mid-pulse frame for each.
  const states = ['00', '01', '11', '10'] as const;
  for (let i = 0; i < states.length; i++) {
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `state-${states[i]}-a.png`) });
    await page.waitForTimeout(700); // half-pulse later
    await page.screenshot({ path: join(OUT, `state-${states[i]}-b.png`) });
    if (i < states.length - 1) await page.getByTestId('step-cycle').click();
  }
});
