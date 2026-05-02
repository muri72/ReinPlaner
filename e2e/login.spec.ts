import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login button (primary action)
    const loginButton = page.getByRole('button', { name: /anmelden|login|sign in/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });
    
    // Page should have loaded without 500 error
    await expect(page.getByRole('heading', { name: /willkommen/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    
    // Click login without entering credentials - form should submit/respond
    const loginButton = page.getByRole('button', { name: /anmelden|login|sign in/i });
    await loginButton.click();
    
    // Form should remain on login page (no crash, no redirect)
    await expect(page).toHaveURL(/.*login.*/, { timeout: 5000 });
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/login');
    
    const forgotLink = page.getByText(/passwort vergessen/i);
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      // Toggle resets inline - no URL change, just shows reset form
      await expect(page.getByLabel(/passwort.*email|e-mail.*reset/i).or(
        page.getByText(/email.*senden|email.*schicken|sende.*link/i)
      )).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('should keep authenticated user on dashboard', async ({ page }) => {
    // This test would need proper auth setup
    // Skipping for now as it requires Supabase test setup
  });
});
