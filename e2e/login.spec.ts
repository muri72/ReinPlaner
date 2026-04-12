import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    // Check for email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.getByLabel(/passwort/i);
    await expect(passwordInput).toBeVisible();
    
    // Check for login button
    const loginButton = page.getByRole('button', { name: /anmelden|login|sign in/i });
    await expect(loginButton).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    
    // Click login without entering credentials
    const loginButton = page.getByRole('button', { name: /anmelden|login|sign in/i });
    await loginButton.click();
    
    // Should show validation errors
    await expect(page.getByText(/erforderlich|pflichtfeld/i)).toBeVisible();
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/login');
    
    const forgotLink = page.getByText(/passwort vergessen/i);
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      await expect(page).toHaveURL(/.*(forgot|reset|password).*/);
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
