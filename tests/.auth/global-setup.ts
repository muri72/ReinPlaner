import { chromium } from '@playwright/test';

async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'aris@reinplaner.de';
  const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'ARIS2026Secure!';
  
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email|e-mail/i).fill(TEST_EMAIL);
  await page.getByLabel(/passwort|password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /anmelden|sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  
  await page.context().storageState({ path: 'tests/.auth/admin.json' });
  await browser.close();
}

export default globalSetup;
