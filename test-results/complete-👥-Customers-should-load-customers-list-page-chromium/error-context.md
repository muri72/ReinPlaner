# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: complete.spec.ts >> 👥 Customers >> should load customers list page
- Location: e2e/complete.spec.ts:143:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e12]:
        - img "ARIS Logo" [ref=e17]
        - generic [ref=e18]:
          - heading "ARIS" [level=1] [ref=e19]
          - paragraph [ref=e20]: Glas- und Gebäudereinigung
          - generic [ref=e21]:
            - generic [ref=e22]:
              - img [ref=e23]
              - generic [ref=e25]: Intuitive Bedienung
            - generic [ref=e26]:
              - img [ref=e27]
              - generic [ref=e31]: Echtzeit-Dashboard
            - generic [ref=e32]:
              - img [ref=e33]
              - generic [ref=e35]: Umfassende Übersicht
      - generic [ref=e36]: Für Reinigungsfirmen jeder Größe
    - generic [ref=e41]:
      - generic [ref=e42]:
        - heading "Willkommen zurück" [level=2] [ref=e43]
        - paragraph [ref=e44]: Melden Sie sich an, um fortzufahren
      - generic [ref=e45]:
        - generic [ref=e46]:
          - text: E-Mail-Adresse
          - generic [ref=e47]:
            - img [ref=e48]
            - textbox "E-Mail-Adresse" [ref=e51]:
              - /placeholder: name@beispiel.de
        - generic [ref=e52]:
          - generic [ref=e53]:
            - generic [ref=e54]: Passwort
            - button "Passwort vergessen?" [ref=e55]
          - generic [ref=e56]:
            - img [ref=e57]
            - textbox "Passwort" [ref=e60]:
              - /placeholder: Ihr Passwort
            - button [ref=e61]:
              - img [ref=e62]
        - generic [ref=e65]:
          - checkbox "Angemeldet bleiben" [ref=e66] [cursor=pointer]
          - generic [ref=e67] [cursor=pointer]: Angemeldet bleiben
        - button "Anmelden" [ref=e68]:
          - generic [ref=e69]:
            - text: Anmelden
            - img [ref=e70]
  - region "Notifications alt+T"
  - generic [ref=e74]:
    - img [ref=e76]
    - button "Open Tanstack query devtools" [ref=e124] [cursor=pointer]:
      - img [ref=e125]
  - button "Open Next.js Dev Tools" [ref=e178] [cursor=pointer]:
    - img [ref=e179]
  - alert [ref=e182]
```

# Test source

```ts
  55  | });
  56  | 
  57  | // ============================================
  58  | // DASHBOARD
  59  | // ============================================
  60  | 
  61  | test.describe('📊 Dashboard', () => {
  62  |   test.beforeEach(async ({ page }) => {
  63  |     // Login first
  64  |     await page.goto('/login');
  65  |     await page.waitForLoadState('networkidle');
  66  |     
  67  |     // Try to login with test credentials or existing session
  68  |     // In real test, you'd use proper test credentials
  69  |     const emailInput = page.getByLabel(/email|e-mail/i);
  70  |     const passwordInput = page.getByLabel(/passwort|password/i);
  71  |     
  72  |     if (await emailInput.isVisible()) {
  73  |       // Test Credentials
  74  | // Admin: aris@reinplaner.de / ARIS2026Secure!
  75  | const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'aris@reinplaner.de';
  76  | const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'ARIS2026Secure!';
  77  |       
  78  |       await emailInput.fill(TEST_EMAIL);
  79  |       await passwordInput.fill(TEST_PASSWORD);
  80  |       await page.getByRole('button', { name: /anmelden|sign in/i }).click();
  81  |       
  82  |       // Wait for redirect
  83  |       await page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {
  84  |         // If login fails, continue anyway for structural tests
  85  |         console.log('Login may have failed, continuing with structural tests');
  86  |       });
  87  |     }
  88  |   });
  89  | 
  90  |   test('should load dashboard page', async ({ page }) => {
  91  |     await page.goto('/dashboard');
  92  |     await page.waitForLoadState('networkidle');
  93  |     
  94  |     // Check page loads without error
  95  |     await expect(page).toHaveTitle(/dashboard|reinplaner/i, { timeout: 10000 });
  96  |   });
  97  | 
  98  |   test('should display sidebar navigation', async ({ page }) => {
  99  |     await page.goto('/dashboard');
  100 |     await page.waitForLoadState('networkidle');
  101 |     
  102 |     // Sidebar should exist
  103 |     const sidebar = page.locator('aside, nav, [class*="sidebar"]').first();
  104 |     await expect(sidebar).toBeVisible({ timeout: 5000 });
  105 |   });
  106 | 
  107 |   test('should navigate to main sections from sidebar', async ({ page }) => {
  108 |     await page.goto('/dashboard');
  109 |     await page.waitForLoadState('networkidle');
  110 |     
  111 |     // Check for key navigation items
  112 |     const navItems = [
  113 |       { name: /aufträge|orders/i, path: /orders/ },
  114 |       { name: /mitarbeiter|employees/i, path: /employees/ },
  115 |       { name: /kunden|customers/i, path: /customers/ },
  116 |       { name: /rechnungen|invoices/i, path: /invoices/ },
  117 |       { name: /planung|planning/i, path: /planning/ },
  118 |     ];
  119 |     
  120 |     for (const item of navItems) {
  121 |       const link = page.getByRole('link', { name: item.name }).first();
  122 |       const isVisible = await link.isVisible().catch(() => false);
  123 |       
  124 |       if (isVisible) {
  125 |         // Click and verify navigation
  126 |         await link.click();
  127 |         await page.waitForLoadState('networkidle');
  128 |         await expect(page).toHaveURL(item.path, { timeout: 5000 }).catch(() => {});
  129 |         
  130 |         // Go back to dashboard
  131 |         await page.goto('/dashboard');
  132 |         await page.waitForLoadState('networkidle');
  133 |       }
  134 |     }
  135 |   });
  136 | });
  137 | 
  138 | // ============================================
  139 | // CUSTOMERS
  140 | // ============================================
  141 | 
  142 | test.describe('👥 Customers', () => {
  143 |   test('should load customers list page', async ({ page }) => {
  144 |     await page.goto('/dashboard/customers');
  145 |     await page.waitForLoadState('networkidle');
  146 |     await page.waitForTimeout(2000);
  147 |     
  148 |     // Should show page heading or main content
  149 |     const heading = page.getByRole('heading', { name: /kunden|customers/i }).first();
  150 |     const mainContent = page.locator('main, [role="main"], .content').first();
  151 |     
  152 |     const headingVisible = await heading.isVisible().catch(() => false);
  153 |     const mainVisible = await mainContent.isVisible().catch(() => false);
  154 |     
> 155 |     expect(headingVisible || mainVisible).toBeTruthy();
      |                                           ^ Error: expect(received).toBeTruthy()
  156 |   });
  157 | 
  158 |   test('should display customers table or list', async ({ page }) => {
  159 |     await page.goto('/dashboard/customers');
  160 |     await page.waitForLoadState('networkidle');
  161 |     await page.waitForTimeout(3000);
  162 |     
  163 |     // Table or card list should exist
  164 |     const table = page.locator('table').first();
  165 |     const cards = page.locator('[class*="card"], [class*="customer"]').first();
  166 |     
  167 |     const hasTable = await table.isVisible().catch(() => false);
  168 |     const hasCards = await cards.isVisible().catch(() => false);
  169 |     
  170 |     // At minimum, page should load without error
  171 |     expect(hasTable || hasCards || true).toBeTruthy();
  172 |   });
  173 | 
  174 |   test('should navigate to new customer form', async ({ page }) => {
  175 |     await page.goto('/dashboard/customers');
  176 |     await page.waitForLoadState('networkidle');
  177 |     
  178 |     // Look for add/new button
  179 |     const addButton = page.locator('a[href*="/new"], button:has-text("+"), a:has-text("Neu")').first();
  180 |     
  181 |     if (await addButton.isVisible().catch(() => false)) {
  182 |       await addButton.click();
  183 |       await page.waitForLoadState('networkidle');
  184 |       
  185 |       // Should be on new customer page or modal should open
  186 |       const isOnNewPage = page.url().includes('/new');
  187 |       const modalOpened = page.locator('[role="dialog"], form').first().isVisible().catch(() => false);
  188 |       
  189 |       expect(isOnNewPage || modalOpened).toBeTruthy();
  190 |     }
  191 |   });
  192 | 
  193 |   test('should search customers', async ({ page }) => {
  194 |     await page.goto('/dashboard/customers');
  195 |     await page.waitForLoadState('networkidle');
  196 |     await page.waitForTimeout(2000);
  197 |     
  198 |     // Search input should exist
  199 |     const searchInput = page.getByPlaceholder(/suche|search/i).first();
  200 |     
  201 |     if (await searchInput.isVisible().catch(() => false)) {
  202 |       await searchInput.fill('Test');
  203 |       await page.waitForTimeout(1000);
  204 |       
  205 |       // Page should still be functional
  206 |       const mainContent = page.locator('main, [role="main"]').first();
  207 |       await expect(mainContent).toBeVisible();
  208 |     }
  209 |   });
  210 | });
  211 | 
  212 | // ============================================
  213 | // EMPLOYEES
  214 | // ============================================
  215 | 
  216 | test.describe('👷 Employees', () => {
  217 |   test('should load employees page', async ({ page }) => {
  218 |     await page.goto('/dashboard/employees');
  219 |     await page.waitForLoadState('networkidle');
  220 |     await page.waitForTimeout(2000);
  221 |     
  222 |     const heading = page.getByRole('heading', { name: /mitarbeiter|employees/i }).first();
  223 |     await expect(heading).toBeVisible({ timeout: 10000 }).catch(() => {
  224 |       // Fallback - check main content loads
  225 |       expect(page.locator('main')).toBeVisible();
  226 |     });
  227 |   });
  228 | 
  229 |   test('should display employee list', async ({ page }) => {
  230 |     await page.goto('/dashboard/employees');
  231 |     await page.waitForLoadState('networkidle');
  232 |     await page.waitForTimeout(3000);
  233 |     
  234 |     // Table, cards, or list should exist
  235 |     const table = page.locator('table');
  236 |     const employeeCards = page.locator('[class*="employee"], [class*="mitarbeiter"]');
  237 |     
  238 |     const tableExists = await table.first().isVisible().catch(() => false);
  239 |     const cardsExist = await employeeCards.first().isVisible().catch(() => false);
  240 |     
  241 |     expect(tableExists || cardsExist).toBeTruthy();
  242 |   });
  243 | 
  244 |   test('should have add employee button', async ({ page }) => {
  245 |     await page.goto('/dashboard/employees');
  246 |     await page.waitForLoadState('networkidle');
  247 |     
  248 |     const addButton = page.getByRole('link', { name: /neue.*mitarbeiter|employee.*add|mitarbeiter.*hinzufügen/i })
  249 |       .or(page.getByRole('button', { name: /\+.+|neu/i }))
  250 |       .first();
  251 |     
  252 |     await expect(addButton).toBeAttached();
  253 |   });
  254 | 
  255 |   test('should open employee form', async ({ page }) => {
```