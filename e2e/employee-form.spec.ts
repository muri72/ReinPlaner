import { test, expect } from '@playwright/test';

test.describe('Employee Form', () => {
  test('should display all form sections', async ({ page }) => {
    await page.goto('/dashboard/employees/new');
    
    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Check for basic info section
    const firstNameLabel = page.getByLabel(/vorname/i);
    await expect(firstNameLabel).toBeVisible();
    
    // Check for last name
    const lastNameLabel = page.getByLabel(/nachname/i);
    await expect(lastNameLabel).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/dashboard/employees/new');
    
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /speichern|erstellen|submit/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation errors
      await expect(page.getByText(/erforderlich|pflichtfeld/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have employment section', async ({ page }) => {
    await page.goto('/dashboard/employees/new');
    
    // Employment section should exist
    const employmentSection = page.getByText(/status|vertragsart|beschäftigung/i);
    await expect(employmentSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have schedule section', async ({ page }) => {
    await page.goto('/dashboard/employees/new');
    
    // Schedule section for weekly hours
    const scheduleSection = page.getByText(/wochenstunden|arbeitszeit/i);
    await expect(scheduleSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have vacation section', async ({ page }) => {
    await page.goto('/dashboard/employees/new');
    
    // Vacation balance section
    const vacationSection = page.getByText(/urlaub/i);
    await expect(vacationSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have wage section with TV GD 2026', async ({ page }) => {
    await page.goto('/dashboard/employees/new');
    
    // Wage group section with TV GD 2026 reference
    const wageSection = page.getByText(/lohngruppe|tv gd|vergütung/i);
    await expect(wageSection.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Employee List', () => {
  test('should display employee list', async ({ page }) => {
    await page.goto('/dashboard/employees');
    
    // Should show employees heading or list
    const heading = page.getByRole('heading', { name: /mitarbeiter|employees/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have add employee button', async ({ page }) => {
    await page.goto('/dashboard/employees');
    
    const addButton = page.getByRole('button', { name: /\+.+hinzufügen|i*neuer|mitarbeiter/i });
    await expect(addButton.first()).toBeVisible({ timeout: 10000 });
  });
});
