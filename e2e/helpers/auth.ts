import { chromium, Browser, Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'aris@reinplaner.de';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'ARIS2026Secure!';

export async function login(page: Page): Promise<boolean> {
  try {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.getByLabel(/email|e-mail/i);
    const passwordInput = page.getByLabel(/passwort|password/i);
    
    // Wait for inputs to be ready
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    // Click login button
    const loginButton = page.getByRole('button', { name: /anmelden|sign in/i });
    await loginButton.click();
    
    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.message);
    return false;
  }
}
