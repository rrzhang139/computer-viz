// Interaction guarantees: clicking the visible interactive labels at each
// level drills DOWN to the child level. We assert ONLY the labeled preview
// targets are clickable (the user explicitly does not want the entire
// transistor area clickable — see CLAUDE.md "preview-only click contract").

import { test, expect } from '@playwright/test';

async function gotoGate(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="zoom-target-0"]', { timeout: 10000 });
  await page.waitForTimeout(700);
}

async function gotoLatch(page: import('@playwright/test').Page) {
  await gotoGate(page);
  await page.getByTestId('back').click();
  await page.waitForTimeout(700);
}

async function isAtLevel(page: import('@playwright/test').Page, level: number): Promise<boolean> {
  const text = await page.getByTestId('level-breadcrumb').textContent();
  return text?.includes(`level ${level}`) ?? false;
}

test.describe('Gate (level 1) → Transistor (level 0): every label preview drills down', () => {
  for (const idx of [0, 1, 2, 3]) {
    test(`zoom-target-${idx} click drills to level 0`, async ({ page }) => {
      await gotoGate(page);
      await page.getByTestId(`zoom-target-${idx}`).click();
      await page.waitForTimeout(1500);
      expect(await isAtLevel(page, 0), `breadcrumb=${await page.getByTestId('level-breadcrumb').textContent()}`).toBe(true);
    });
  }

  test('clicking somewhere OFF the label preview does NOT drill (cursor stays default)', async ({ page }) => {
    await gotoGate(page);
    // Click the gate-scene SVG at a position FAR from any label preview
    // (top-left corner). Only the per-transistor chip rects are clickable;
    // the surrounding canvas is inert.
    const scene = page.getByTestId('gate-scene');
    const box = await scene.boundingBox();
    if (!box) throw new Error('no gate-scene');
    await page.mouse.click(box.x + 30, box.y + 30);
    await page.waitForTimeout(700);
    expect(await isAtLevel(page, 1), 'still at gate level').toBe(true);
  });
});

test.describe('Latch (level 2) → Gate (level 1): every NAND drills down', () => {
  for (const which of ['nand-1', 'nand-2'] as const) {
    test(`${which} click drills to gate level`, async ({ page }) => {
      await gotoLatch(page);
      await page.getByTestId(which).click();
      await page.waitForTimeout(1200);
      expect(await isAtLevel(page, 1)).toBe(true);
    });
  }
});

test.describe('Cursor hygiene: no flicker across the gate canvas', () => {
  test('moving the cursor across the canvas only sets pointer over labels', async ({ page }) => {
    await gotoGate(page);
    const scene = page.getByTestId('gate-scene');
    const box = await scene.boundingBox();
    if (!box) throw new Error('no gate-scene');

    // Sample cursor at non-label positions — should NOT be pointer.
    const offLabel: { x: number; y: number; cursor: string }[] = [];
    for (const [dx, dy] of [[50, 50], [box.width - 50, 50], [box.width / 2, box.height / 2], [50, box.height - 50]] as const) {
      await page.mouse.move(box.x + dx, box.y + dy);
      await page.waitForTimeout(200);
      const cursor = await page.evaluate(() => document.body.style.cursor || getComputedStyle(document.body).cursor);
      offLabel.push({ x: dx, y: dy, cursor });
    }

    for (const sample of offLabel) {
      expect(sample.cursor, `off-label cursor at (${sample.x},${sample.y}) is "${sample.cursor}"`).not.toBe('pointer');
    }

    // Sample cursor OVER a label — should be pointer.
    const labelBox = await page.getByTestId('zoom-target-0').boundingBox();
    if (!labelBox) throw new Error('no label');
    await page.mouse.move(labelBox.x + labelBox.width / 2, labelBox.y + labelBox.height / 2);
    await page.waitForTimeout(200);
    const cursorOnLabel = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="zoom-target-0"]')!).cursor);
    expect(cursorOnLabel, 'cursor over label preview').toBe('pointer');
  });
});
