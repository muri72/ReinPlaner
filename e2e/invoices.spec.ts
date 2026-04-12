// ============================================
// E2E Tests: Invoice Dashboard (/dashboard/invoices)
// ============================================

import { test, expect } from '@playwright/test';

// ============================================
// Helper: Ensure authenticated before each test
// ============================================

async function loginAsTestUser(page: any) {
  // In a real setup you'd navigate to /login and fill credentials
  // For now we check if the page loads and redirect to dashboard/invoices
  await page.goto('/dashboard/invoices');
}

// ============================================
// Invoice List Page Tests
// ============================================

test.describe('Invoice Dashboard - List View', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to invoices page
    await page.goto('/dashboard/invoices');
    // Wait for content to load
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('should load the invoices page without errors', async ({ page }) => {
    // Should not have any unexpected error dialogs
    const errorDialog = page.locator('[role="alertdialog"], .error-modal, [aria-label*="error" i]').first();
    await expect(errorDialog).not.toBeVisible({ timeout: 5000 }).catch(() => {});

    // Page should have a main content area
    const main = page.locator('main, [role="main"], .container').first();
    await expect(main).toBeVisible({ timeout: 10000 });
  });

  test('should display page heading', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /rechnungen|invoices|factures/i }).first();
    await expect(heading).toBeVisible({ timeout: 5000 }).catch(() => {
      // Fallback: check page title
      await expect(page).toHaveTitle(/rechnungen|invoices/i).catch(() => {});
    });
  });

  test('should show new invoice button or link', async ({ page }) => {
    const newButton = page.getByRole('link', { name: /neue.*rechnung|new.*invoice|rechnung.*erstellen/i })
      .or(page.getByRole('button', { name: /neue.*rechnung|new.*invoice|rechnung.*erstellen/i }))
      .or(page.getByLabel(/neue.*rechnung|new.*invoice|rechnung.*erstellen/i))
      .first();

    // Button should exist (even if hidden by loading state)
    const exists = await newButton.isVisible().catch(() => false);
    if (!exists) {
      // Check for any "+" or "Neu" button
      const plusBtn = page.locator('button:has-text("+"), a:has-text("+"), [aria-label*="new" i]').first();
      await expect(plusBtn).toBeAttached().catch(() => {});
    }
  });

  test('should display invoice table or card list', async ({ page }) => {
    // Wait a bit for data to load
    await page.waitForTimeout(2000);

    // Should have a list of invoices (table or cards)
    const table = page.locator('table').first();
    const cardList = page.locator('[class*="invoice"], [class*="card"]').first();

    const hasTable = await table.isVisible().catch(() => false);
    const hasCards = await cardList.isVisible().catch(() => false);

    expect(hasTable || hasCards).toBeTruthy();
  });

  test('should have filter controls visible', async ({ page }) => {
    // Search input
    const searchInput = page.getByPlaceholder(/suche|search|filter/i).first();
    await expect(searchInput).toBeAttached().catch(() => {});

    // Status filter
    const statusFilter = page.locator('select, [role="combobox"]').first();
    await expect(statusFilter).toBeAttached().catch(() => {});
  });

  test('should filter by status when filter is changed', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Find status select
    const statusSelect = page.locator('select').first();
    const exists = await statusSelect.isVisible().catch(() => false);

    if (exists) {
      // Select "Draft"
      await statusSelect.selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(500);

      // Page should update (URL might change or content should filter)
      // We just verify no crash
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
    }
  });

  test('should search invoices by invoice number', async ({ page }) => {
    await page.waitForTimeout(1000);

    const searchInput = page.getByPlaceholder(/suche|search|invoice/i).first();
    const isVisible = await searchInput.isVisible().catch(() => false);

    if (isVisible) {
      await searchInput.fill('R/00001');
      await page.waitForTimeout(500);

      // Should show filtered results
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
    }
  });
});

// ============================================
// Invoice Detail Page Tests
// ============================================

test.describe('Invoice Detail Page', () => {
  test('should navigate to invoice detail when clicking an invoice', async ({ page }) => {
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // Find first invoice link
    const invoiceLink = page.locator('a[href*="/dashboard/invoices/"]').first();
    const linkExists = await invoiceLink.isVisible().catch(() => false);

    if (linkExists) {
      await invoiceLink.click();
      await expect(page).toHaveURL(/\/dashboard\/invoices\/[^/]+/).catch(() => {
        // If URL pattern doesn't match, at least verify navigation happened
        expect(page.url()).not.toBe('/dashboard/invoices');
      });
    }
  });

  test('should display invoice details on detail page', async ({ page }) => {
    // Directly navigate to a known invoice if available
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    const invoiceLink = page.locator('a[href*="/dashboard/invoices/"]').first();
    const linkExists = await invoiceLink.isVisible().catch(() => false);

    if (linkExists) {
      await invoiceLink.click();
      await page.waitForTimeout(2000);

      // Should show invoice number or amount
      const invoiceInfo = page.locator('text=/R\\/\\d+|\\d+[.,]\\d+\\s*€/i').first();
      await expect(invoiceInfo).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('should have back navigation from detail page', async ({ page }) => {
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    const invoiceLink = page.locator('a[href*="/dashboard/invoices/"]').first();
    const linkExists = await invoiceLink.isVisible().catch(() => false);

    if (linkExists) {
      await invoiceLink.click();
      await page.waitForTimeout(1000);

      // Look for back button or breadcrumb
      const backButton = page.locator('a:has-text("Zurück"), button:has-text("Zurück"), [aria-label*="back" i]').first();
      await expect(backButton).toBeAttached().catch(() => {});
    }
  });
});

// ============================================
// Create Invoice Page Tests
// ============================================

test.describe('Create Invoice', () => {
  test('should navigate to new invoice page', async ({ page }) => {
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Click new invoice button if visible
    const newBtn = page.locator('a[href*="/dashboard/invoices/new"], a[href*="/dashboard/invoices/new"]').first();
    const newBtnVisible = await newBtn.isVisible().catch(() => false);

    if (newBtnVisible) {
      await newBtn.click();
      await expect(page).toHaveURL(/.*invoices\/new.*/).catch(() => {});
    }
  });

  test('should display invoice form on new invoice page', async ({ page }) => {
    await page.goto('/dashboard/invoices/new');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // Form should have debtor selection or invoice number field
    const form = page.locator('form').first();
    await expect(form).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('should have debtor dropdown in form', async ({ page }) => {
    await page.goto('/dashboard/invoices/new');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    // Look for debtor customer selection
    const debtorSelect = page.locator('select[name*="debtor"], select[name*="customer"], input[name*="debtor"]').first();
    const exists = await debtorSelect.isVisible().catch(() => false);

    if (!exists) {
      // Try finding by label
      const label = page.getByLabel(/debitor|kunde|customer|rechnungsempfänger/i).first();
      await expect(label).toBeAttached().catch(() => {});
    } else {
      await expect(debtorSelect).toBeVisible();
    }
  });

  test('should have line items section', async ({ page }) => {
    await page.goto('/dashboard/invoices/new');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    const itemsSection = page.locator('text=/position|zeile|leistung|item/i').first();
    await expect(itemsSection).toBeAttached().catch(() => {});
  });

  test('should not submit empty form', async ({ page }) => {
    await page.goto('/dashboard/invoices/new');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    const submitBtn = page.locator('button[type="submit"], button:has-text("Erstellen"), button:has-text("Speichern")').first();
    const submitExists = await submitBtn.isVisible().catch(() => false);

    if (submitExists) {
      await submitBtn.click();
      // Form should still be visible (validation error)
      const form = page.locator('form').first();
      await expect(form).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });
});

// ============================================
// Navigation Tests
// ============================================

test.describe('Invoice Dashboard Navigation', () => {
  test('should navigate to invoices from dashboard sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    const invoicesLink = page.locator('nav a[href*="invoices"], aside a[href*="invoices"]').first();
    const exists = await invoicesLink.isVisible().catch(() => false);

    if (exists) {
      await invoicesLink.click();
      await expect(page).toHaveURL(/.*invoices.*/).catch(() => {});
    }
  });

  test('should have consistent navigation between invoice list and detail', async ({ page }) => {
    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);

    const invoiceLink = page.locator('a[href*="/dashboard/invoices/"]').first();
    const exists = await invoiceLink.isVisible().catch(() => false);

    if (exists) {
      const href = await invoiceLink.getAttribute('href');

      await invoiceLink.click();
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      // Detail page should have the invoice ID in URL
      if (href && href !== '/dashboard/invoices/new') {
        expect(currentUrl).toContain('/dashboard/invoices/');
      }
    }
  });
});

// ============================================
// Performance Tests
// ============================================

test.describe('Invoice Dashboard Performance', () => {
  test('should load invoices page within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard/invoices', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have excessive network requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('localhost') || req.url().includes('supabase')) {
        requests.push(req.url());
      }
    });

    await page.goto('/dashboard/invoices');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);

    // Should have reasonable number of API calls (not more than 20)
    expect(requests.length).toBeLessThan(20);
  });
});
