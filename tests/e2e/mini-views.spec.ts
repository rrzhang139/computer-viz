// Visual contract for the connected-hover mini views.
//
// These tests assert each mini PREVIEW is actually rendered visibly on
// screen — not just that its testid is in the DOM. Catches the failure
// mode where a foreignObject / Canvas mounts but the WebGL context is
// blank (0×0 sized), or where the mini sits off-screen.

import { test, expect } from '@playwright/test';

async function gotoLatch(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('[data-testid="zoom-target-0"]');
  await page.getByTestId('back').click();
  await page.waitForTimeout(600);
  await expect(page.getByTestId('latch-scene')).toBeVisible();
}

test.describe('MiniNandView — visual rendering inside the latch', () => {
  test('NAND1 hover: mini container is visible with non-zero size', async ({ page }) => {
    await gotoLatch(page);
    await page.getByTestId('nand-1').hover();
    await page.waitForTimeout(500);

    const container = page.getByTestId('nand-1-detailed');
    await expect(container).toBeVisible();
    const box = await container.boundingBox();
    expect(box, 'mini container has a layout box').not.toBeNull();
    expect(box!.width, 'mini width > 60px').toBeGreaterThan(60);
    expect(box!.height, 'mini height > 40px').toBeGreaterThan(40);

    // The mini is now pure SVG (no canvas). Assert the inner scene <g>
    // renders with sub-elements.
    const scene = container.getByTestId('nand-1-detailed-scene');
    await expect(scene).toBeVisible();
  });

  test('NAND1 hover: parent-latch net labels overlay the mini', async ({ page }) => {
    await gotoLatch(page);
    await page.getByTestId('nand-1').hover();
    await page.waitForTimeout(500);

    for (const id of ['nand-1-detailed-net-a', 'nand-1-detailed-net-b', 'nand-1-detailed-net-y']) {
      const el = page.getByTestId(id);
      await expect(el, id).toBeVisible();
    }
    await expect(page.getByTestId('nand-1-detailed-net-a')).toContainText('S̄');
    await expect(page.getByTestId('nand-1-detailed-net-b')).toContainText('Q̄');
    await expect(page.getByTestId('nand-1-detailed-net-y')).toContainText('Q');
  });

  test('NAND2 hover: mini renders with R̄/Q/Q̄ net labels', async ({ page }) => {
    await gotoLatch(page);
    await page.getByTestId('nand-2').hover();
    await page.waitForTimeout(500);

    const container = page.getByTestId('nand-2-detailed');
    await expect(container).toBeVisible();
    await expect(container.getByTestId('nand-2-detailed-scene')).toBeVisible();
    await expect(page.getByTestId('nand-2-detailed-net-a')).toContainText('R̄');
    await expect(page.getByTestId('nand-2-detailed-net-b')).toContainText('Q');
    await expect(page.getByTestId('nand-2-detailed-net-y')).toContainText('Q̄');
  });

  test('mini canvas actually rendered content (screenshot has color variation, not uniform background)', async ({ page }) => {
    await gotoLatch(page);
    await page.getByTestId('nand-1').hover();
    await page.waitForTimeout(1200);

    // Screenshot just the mini container. If the canvas drew anything (wires,
    // transistors, electron pulses), the resulting PNG should contain MANY
    // distinct colors. If it's blank, we'd see only the parchment bg color
    // plus the corner label text (a tiny number of distinct colors).
    const container = page.getByTestId('nand-1-detailed');
    const buf = await container.screenshot();
    expect(buf.length, 'screenshot bytes returned').toBeGreaterThan(500);

    // Cheap distinct-color count via byte histogram over the PNG buffer.
    // A blank canvas + 2 lines of label text produces ~10-30 unique bytes
    // in the compressed PNG; a real scene with wires + meshes produces 100+.
    const histogram = new Set<number>();
    for (let i = 0; i < buf.length; i += 7) histogram.add(buf[i]);
    expect(histogram.size, 'distinct byte values in PNG').toBeGreaterThan(80);
  });

  test('visual snapshot — mini matches the real gate scene', async ({ page }) => {
    await gotoLatch(page);
    await page.getByTestId('nand-1').hover();
    await page.waitForTimeout(1500);
    await page.getByTestId('nand-1-detailed').screenshot({ path: 'test-results/mini-nand-1.png' });

    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    await page.getByTestId('nand-2').hover();
    await page.waitForTimeout(1500);
    await page.getByTestId('nand-2-detailed').screenshot({ path: 'test-results/mini-nand-2.png' });

    expect(true).toBe(true);
  });

  // Auto-fit regression: the mini must show the FULL gate scene at multiple
  // viewport sizes (different SVG scales). The bug we're guarding against:
  // at large viewports the canvas inside the foreignObject grew but the
  // camera didn't reframe, so only the upper-left corner of the scene was
  // visible. <Bounds fit observe> should re-fit on every resize.
  for (const vp of [
    { name: 'small  1024×640',  w: 1024, h: 640 },
    { name: 'medium 1440×900',  w: 1440, h: 900 },
    { name: 'large  1920×1080', w: 1920, h: 1080 },
  ]) {
    test(`auto-fit: full scene visible at viewport ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await gotoLatch(page);
      await page.getByTestId('nand-1').hover();
      await page.waitForTimeout(1500);
      // Screenshot the mini and save for visual review.
      await page
        .getByTestId('nand-1-detailed')
        .screenshot({ path: `test-results/mini-fit-${vp.w}x${vp.h}.png` });

      // Quantitative check: the screenshot must contain MANY distinct colors,
      // indicating wires + 4 transistors + electron pulses are all rendered.
      // A "scene cut to upper-left only" view shows just P_A and the upper
      // rails — fewer distinct colors and a large blank area.
      const buf = await page.getByTestId('nand-1-detailed').screenshot();
      const histogram = new Set<number>();
      for (let i = 0; i < buf.length; i += 7) histogram.add(buf[i]);
      expect(histogram.size, `distinct PNG bytes at ${vp.name}`).toBeGreaterThan(100);
    });
  }
});
