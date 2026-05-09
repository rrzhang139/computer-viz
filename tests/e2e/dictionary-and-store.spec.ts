import { test, expect } from '@playwright/test';

test.describe('Dictionary terms and units', () => {
  test('hovering a term shows its definition', async ({ page }) => {
    await page.goto('/');
    // Use the explicit Term examples in the demo paragraph.
    const mesi = page.getByText('MESI', { exact: true }).first();
    await mesi.hover();
    await expect(page.getByText(/cache-coherence protocol/i)).toBeVisible();
  });

  test('hovering an inline unit shows long name + scientific notation', async ({ page }) => {
    await page.goto('/');
    const oneNs = page.getByText(/^1 ns$/).first();
    await oneNs.hover();
    // "nanosecond" appears in tooltip both as <strong> long-name and in definition body.
    await expect(page.getByText(/nanosecond/i).first()).toBeVisible();
  });

  test('TermText auto-detects terms in prose', async ({ page }) => {
    await page.goto('/');
    const tlb = page.getByText('TLB', { exact: true }).first();
    await tlb.hover();
    // TLB definition mentions "virtual→physical address translations"
    await expect(page.getByText(/translation/i).first()).toBeVisible();
  });
});

test.describe('Execution stepper (dev panel)', () => {
  // The exec-state panel is hidden inside a <details> element by default
  // (it's not part of the learning UI — it's a dev counter). Each test
  // expands the panel before interacting.
  async function openPanel(page: import('@playwright/test').Page): Promise<void> {
    const summary = page.locator('summary', { hasText: /dev panel/i });
    await summary.click();
  }

  test('step instr advances retiredInstrs and cycle', async ({ page }) => {
    await page.goto('/');
    await openPanel(page);
    await expect(page.locator('pre').filter({ hasText: 'cycle:' })).toContainText('cycle:           0');
    await page.getByRole('button', { name: 'step instr' }).click();
    await expect(page.locator('pre').filter({ hasText: 'cycle:' })).toContainText('cycle:           5');
    await expect(page.locator('pre').filter({ hasText: 'retiredInstrs' })).toContainText('retiredInstrs:   1');
  });

  test('step cycle advances cycle by 1', async ({ page }) => {
    await page.goto('/');
    await openPanel(page);
    await page.getByRole('button', { name: 'step cycle' }).click();
    await page.getByRole('button', { name: 'step cycle' }).click();
    await expect(page.locator('pre').filter({ hasText: 'cycle:' })).toContainText('cycle:           2');
  });

  test('reset returns counters to zero', async ({ page }) => {
    await page.goto('/');
    await openPanel(page);
    await page.getByRole('button', { name: 'step instr' }).click();
    await page.getByRole('button', { name: 'step instr' }).click();
    await page.getByRole('button', { name: 'reset', exact: true }).click();
    await expect(page.locator('pre').filter({ hasText: 'cycle:' })).toContainText('cycle:           0');
    await expect(page.locator('pre').filter({ hasText: 'retiredInstrs' })).toContainText('retiredInstrs:   0');
  });
});
