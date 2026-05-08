import { test, expect } from '@playwright/test';

test.describe('Knowledge graph modal', () => {
  test('opens via top-right button, closes via X', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: /knowledge graph/i })).toBeHidden();

    await page.getByRole('button', { name: /open knowledge graph/i }).click();
    await expect(page.getByRole('dialog', { name: /knowledge graph/i })).toBeVisible();

    await page.getByLabel('close').click();
    await expect(page.getByRole('dialog', { name: /knowledge graph/i })).toBeHidden();
  });

  test('opens via Ctrl+K hotkey, closes via Escape', async ({ page }) => {
    await page.goto('/');
    // Focus body so the global keydown handler fires.
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    await expect(page.getByRole('dialog', { name: /knowledge graph/i })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /knowledge graph/i })).toBeHidden();
  });

  test('search filters tree nodes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /open knowledge graph/i }).click();
    const search = page.getByPlaceholder(/search/i);
    await search.fill('electrons');
    await expect(page.getByText(/08_electrons/)).toBeVisible();
    // 02_thread is in another branch — should be filtered out.
    await expect(page.getByText(/02_thread/)).toBeHidden();
  });

  test('clicking a tree node logs navigation and closes the modal', async ({ page }) => {
    await page.goto('/');

    const navigated: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().startsWith('navigate to')) {
        navigated.push(msg.text().replace('navigate to ', ''));
      }
    });

    await page.getByRole('button', { name: /open knowledge graph/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /00_computer/ }).first().click();

    await expect(page.getByRole('dialog')).toBeHidden();
    expect(navigated).toContain('00_computer');
  });

  test('graph view tab renders the react-flow canvas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /open knowledge graph/i }).click();
    // Scope to dialog so we don't match the corner trigger button.
    await page.getByRole('dialog').getByRole('button', { name: 'graph', exact: true }).click();
    await expect(page.getByText(/01_chip/).first()).toBeVisible();
  });
});
