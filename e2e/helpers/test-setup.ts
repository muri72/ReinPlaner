// ============================================
// E2E Test Helper: Authentication & Test Data
// ============================================

import { test as base, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Extend Playwright test with custom fixtures
export interface AuthenticatedPage {
  supabase: SupabaseClient;
  tenantId: string;
  testCustomerId: string;
  testEmployeeId: string;
  testObjectId: string;
}

export const test = base.extend<AuthenticatedPage>({
  // Create authenticated page with Supabase client
  async ({ page, browser }, use) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get or create test tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', 'reinplaner')
      .single();
    
    const tenantId = tenant?.id || 'test-tenant-id';
    
    // Setup: Create test data if needed
    let testCustomerId = '';
    let testEmployeeId = '';
    let testObjectId = '';
    
    // Try to find existing test data
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();
    testCustomerId = customer?.id || '';
    
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();
    testEmployeeId = employee?.id || '';
    
    const { data: obj } = await supabase
      .from('objects')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();
    testObjectId = obj?.id || '';
    
    // Create test user auth and login
    const testEmail = `e2e-test-${Date.now()}@test.reinplaner.de`;
    const testPassword = 'TestPassword123!';
    
    // Try to sign up or get existing user
    let { data: authUser } = await supabase.auth.admin.listUsers();
    const existingTestUser = authUser?.users.find(u => u.email?.includes('e2e-test'));
    
    if (!existingTestUser) {
      await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });
    }
    
    // Login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    const emailInput = page.getByLabel(/email|e-mail/i).first();
    const passwordInput = page.getByLabel(/passwort|password/i).first();
    const loginButton = page.getByRole('button', { name: /anmelden|login|sign in/i }).first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill(existingTestUser?.email || testEmail);
      await passwordInput.fill(testPassword);
      await loginButton.click();
      
      // Wait for redirect to dashboard
      await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => {});
    }
    
    // Provide fixtures
    await use({
      supabase,
      tenantId,
      testCustomerId,
      testEmployeeId,
      testObjectId,
    });
    
    // Cleanup: Delete test user
    if (existingTestUser) {
      await supabase.auth.admin.deleteUser(existingTestUser.id);
    }
  },
});

// Export for use in tests
export { expect } from '@playwright/test';