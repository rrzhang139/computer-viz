// D-latch level — connected-hover preview tests.
//
// This file is the REFERENCE TEST SUITE for every new abstraction layer.
// When you add a new level N, you MUST also add a parallel suite that
// covers AT LEAST these five contracts:
//
//   1. CONTAINER VISIBLE — the level renders a scene with non-zero size.
//   2. HOVER PREVIEW — hovering a drill-down child SHOWS a mini preview;
//      moving away dismisses it.
//   3. CLICK DRILLS — clicking the child drills into the next level down.
//   4. WIRE ALIGNMENT — every parent-level wire endpoint coincides
//      pixel-precisely with the corresponding child terminal projection.
//   5. NO LOOSE ENDS — every external child terminal is connected to a
//      parent-level wire (or covered by the parent's supply rails).
//
// CLAUDE.md "new-layer checklist" references this file.

import { test, expect } from '@playwright/test';

const SETTLE = 600;

async function gotoDLatch(page: import('@playwright/test').Page) {
  // Default landing is gate (depth 1). D-latch is depth 3.
  await page.goto('/');
  await page.waitForSelector('[data-testid="zoom-target-0"]');
  await page.getByTestId('back').click();   // gate → latch
  await page.waitForTimeout(SETTLE);
  await page.getByTestId('back').click();   // latch → dlatch
  await page.waitForTimeout(SETTLE);
  await expect(page.getByTestId('dlatch-scene')).toBeVisible();
}

test.describe('D Latch (level 3) — preview-hover contract', () => {
  // (1) Container visible
  test('the dlatch scene renders at full size', async ({ page }) => {
    await gotoDLatch(page);
    const box = await page.getByTestId('dlatch-scene').boundingBox();
    expect(box, 'dlatch container has a layout box').not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.height).toBeGreaterThan(200);
  });

  // (2a) Hover preview shows
  test('hovering the SR-core hit area shows the latch preview', async ({ page }) => {
    await gotoDLatch(page);
    await expect(page.getByTestId('dlatch-sr-preview')).toHaveCount(0);
    await page.getByTestId('dlatch-sr-core').hover();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('dlatch-sr-preview')).toBeVisible();
    await expect(page.getByTestId('dlatch-sr-preview-mini')).toBeVisible();
  });

  // (2b) Hover preview dismisses on leave
  test('moving the cursor off dismisses the preview', async ({ page }) => {
    await gotoDLatch(page);
    await page.getByTestId('dlatch-sr-core').hover();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('dlatch-sr-preview')).toBeVisible();
    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);
    await expect(page.getByTestId('dlatch-sr-preview')).toHaveCount(0);
  });

  // (3) Click drills into the SR latch level
  test('clicking the SR-core hit area drills into the latch level', async ({ page }) => {
    await gotoDLatch(page);
    await page.getByTestId('dlatch-sr-core').click();
    await page.waitForTimeout(800);
    await expect(page.getByTestId('level-pane-latch')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByTestId('level-breadcrumb')).toContainText(/level 2/i);
  });

  // (4) Preview alignment — assert the preview is rendered INSIDE the
  // dlatch scene's viewport area (no off-screen). Tighter pixel-precise
  // alignment is delegated to the underlying MiniLevelView contract
  // (tested in tests/unit/levelModule.test.ts via projection math).
  test('hover preview renders inside the dlatch scene viewport', async ({ page }) => {
    await gotoDLatch(page);
    await page.getByTestId('dlatch-sr-core').hover();
    await page.waitForTimeout(400);
    const sceneBox = await page.getByTestId('dlatch-scene').boundingBox();
    const previewBox = await page.getByTestId('dlatch-sr-preview').boundingBox();
    expect(sceneBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    // Preview must overlap the scene's bounding box.
    expect(previewBox!.x + previewBox!.width).toBeGreaterThan(sceneBox!.x);
    expect(previewBox!.x).toBeLessThan(sceneBox!.x + sceneBox!.width);
    expect(previewBox!.y + previewBox!.height).toBeGreaterThan(sceneBox!.y);
    expect(previewBox!.y).toBeLessThan(sceneBox!.y + sceneBox!.height);
  });

  // (5) No loose ends — every external terminal of the SR-latch preview
  // (when shown) is geometrically inside or on a D-latch wire/scene.
  test('hover preview\'s external terminals are inside the D-latch scene', async ({ page }) => {
    await gotoDLatch(page);
    await page.getByTestId('dlatch-sr-core').hover();
    await page.waitForTimeout(400);
    const sceneBox = await page.getByTestId('dlatch-scene').boundingBox();
    const previewBox = await page.getByTestId('dlatch-sr-preview').boundingBox();
    expect(sceneBox).not.toBeNull();
    expect(previewBox).not.toBeNull();
    // Preview must sit entirely inside the dlatch scene.
    expect(previewBox!.x).toBeGreaterThanOrEqual(sceneBox!.x - 1);
    expect(previewBox!.y).toBeGreaterThanOrEqual(sceneBox!.y - 1);
    expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(sceneBox!.x + sceneBox!.width + 1);
    expect(previewBox!.y + previewBox!.height).toBeLessThanOrEqual(sceneBox!.y + sceneBox!.height + 1);
  });

  // (6) NS hover shows HIGHLIGHT (no connected preview — gate's A/B/Y
  // topology doesn't match NS's D+EN→S̄ shape, so a preview would lie
  // about connections. Highlight + click is the honest UX.)
  test('hovering NS shows a highlight (no preview)', async ({ page }) => {
    await gotoDLatch(page);
    await expect(page.getByTestId('dlatch-ns-highlight')).toHaveCount(0);
    await page.getByTestId('dlatch-ns').hover();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('dlatch-ns-highlight')).toBeVisible();
    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);
    await expect(page.getByTestId('dlatch-ns-highlight')).toHaveCount(0);
  });

  // (7) NR hover shows highlight.
  test('hovering NR shows a highlight (no preview)', async ({ page }) => {
    await gotoDLatch(page);
    await page.getByTestId('dlatch-nr').hover();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('dlatch-nr-highlight')).toBeVisible();
  });

  // (8) Clicking NS or NR drills into the gate level.
  test('clicking NS drills into the gate level', async ({ page }) => {
    await gotoDLatch(page);
    await page.getByTestId('dlatch-ns').click();
    await page.waitForTimeout(800);
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
  });

  test('clicking NR drills into the gate level', async ({ page }) => {
    await gotoDLatch(page);
    await page.getByTestId('dlatch-nr').click();
    await page.waitForTimeout(800);
    await expect(page.getByTestId('level-pane-gate')).toHaveAttribute('aria-hidden', 'false');
  });

  // (9) Only ONE hover effect at a time — SR preview / NS highlight /
  // NR highlight are mutually exclusive.
  test('hovering a different zone dismisses the previous overlay', async ({ page }) => {
    await gotoDLatch(page);
    await page.getByTestId('dlatch-sr-core').hover();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('dlatch-sr-preview')).toBeVisible();
    await page.getByTestId('dlatch-ns').hover();
    await page.waitForTimeout(300);
    await expect(page.getByTestId('dlatch-sr-preview')).toHaveCount(0);
    await expect(page.getByTestId('dlatch-ns-highlight')).toBeVisible();
  });
});
