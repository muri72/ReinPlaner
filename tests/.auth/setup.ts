import { test as setup, expect } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'aris@reinplaner.de';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'ARIS2026Secure!';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await page.getByLabel(/email|e-mail/i).fill(TEST_EMAIL);
  await page.getByLabel(/passwort|password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /anmelden|sign in/i }).click();
  
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  
  await page.context().storageState({ path: 'tests/.auth/admin.json' });
});
