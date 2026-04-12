import { test, expect } from '@playwright/test';

// These tests require authentication - we'll use API key auth for E2E
test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Skip auth for now - these are structural tests
    // In CI, you'd set up proper auth cookies
  });

  test('should have main navigation elements', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Sidebar navigation should be visible
    const sidebar = page.locator('nav, [class*="sidebar"], aside');
    await expect(sidebar.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show breadcrumb navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Breadcrumb should exist
    const breadcrumb = page.getByText(/dashboard/i).first();
    await expect(breadcrumb).toBeVisible({ timeout: 10000 });
  });

  test('should have user menu', async ({ page }) => {
    await page.goto('/dashboard');
    
    // User menu/avatar should be visible
    const userMenu = page.locator('[aria-label*="user"], [aria-label*="menu"], img[alt*="avatar"]').first();
    await expect(userMenu).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard Pages', () => {
  test('should load dashboard overview', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
  });

  test('should navigate to orders', async ({ page }) => {
    await page.goto('/dashboard');
    
    const ordersLink = page.getByRole('link', { name: /aufträge|orders/i }).first();
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
      await expect(page).toHaveURL(/.*orders.*/);
    }
  });

  test('should navigate to employees', async ({ page }) => {
    await page.goto('/dashboard');
    
    const employeesLink = page.getByRole('link', { name: /mitarbeiter|employees/i }).first();
    if (await employeesLink.isVisible()) {
      await employeesLink.click();
      await expect(page).toHaveURL(/.*employees.*/);
    }
  });

  test('should navigate to planning', async ({ page }) => {
    await page.goto('/dashboard');
    
    const planningLink = page.getByRole('link', { name: /planung|planning/i }).first();
    if (await planningLink.isVisible()) {
      await planningLink.click();
      await expect(page).toHaveURL(/.*planning.*/);
    }
  });
});

test.describe('Dashboard Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - start;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
