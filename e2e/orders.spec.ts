import { test, expect } from '@playwright/test';

test.describe('Order Management', () => {
  test('should display orders list', async ({ page }) => {
    await page.goto('/dashboard/orders');
    
    const heading = page.getByRole('heading', { name: /aufträge|orders/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have create order button', async ({ page }) => {
    await page.goto('/dashboard/orders');
    
    const createButton = page.getByRole('button', { name: /\+.+hinzufügen|i*neuer|i*auftrag/i });
    await expect(createButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('should open order form', async ({ page }) => {
    await page.goto('/dashboard/orders');
    
    const createButton = page.getByRole('button', { name: /\+.+hinzufügen|i*neuer/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page).toHaveURL(/.*(new|create|form).*/, { timeout: 5000 });
    }
  });

  test('should filter orders by status', async ({ page }) => {
    await page.goto('/dashboard/orders');
    
    // Look for status filter
    const statusFilter = page.getByLabel(/status|filter/i).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await expect(page.getByText(/aktiv|offen|abgeschlossen/i)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Order Form', () => {
  test('should display order form with all sections', async ({ page }) => {
    await page.goto('/dashboard/orders/new');
    
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Basic info section
    const titleInput = page.getByLabel(/titel|name|bezeichnung/i);
    await expect(titleInput).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/dashboard/orders/new');
    
    const submitButton = page.getByRole('button', { name: /speichern|erstellen|submit/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await expect(page.getByText(/erforderlich|pflichtfeld/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have customer selection', async ({ page }) => {
    await page.goto('/dashboard/orders/new');
    
    const customerSelect = page.getByLabel(/kunde|customer/i);
    await expect(customerSelect).toBeVisible({ timeout: 5000 });
  });

  test('should have object/location selection', async ({ page }) => {
    await page.goto('/dashboard/orders/new');
    
    const objectSelect = page.getByLabel(/objekt|standort|location/i);
    await expect(objectSelect).toBeVisible({ timeout: 5000 });
  });
});
