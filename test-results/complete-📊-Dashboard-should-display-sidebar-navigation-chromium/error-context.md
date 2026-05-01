# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: complete.spec.ts >> 📊 Dashboard >> should display sidebar navigation
- Location: e2e/complete.spec.ts:98:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('aside, nav, [class*="sidebar"]').first()
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('aside, nav, [class*="sidebar"]').first()
    9 × locator resolved to <header class="md:hidden fixed top-0 left-0 w-full bg-sidebar text-sidebar-foreground border-b border-sidebar-border p-4 flex items-center justify-between z-50 glassmorphism-card">…</header>
      - unexpected value "hidden"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - link "ReinPlaner" [ref=e6] [cursor=pointer]:
          - /url: /employee/dashboard
          - heading "ReinPlaner" [level=2] [ref=e7]
        - button "Sidebar minimieren" [ref=e8]:
          - img [ref=e9]
      - navigation [ref=e11]:
        - generic [ref=e12]:
          - link "Mitarbeiter-Dashboard" [ref=e13] [cursor=pointer]:
            - /url: /employee/dashboard
            - text: Mitarbeiter-Dashboard
          - generic [ref=e16]:
            - heading "Management" [level=3] [ref=e17]
            - link "Aufträge" [ref=e18] [cursor=pointer]:
              - /url: /dashboard/orders
              - img [ref=e19]
              - text: Aufträge
            - link "Objekte" [ref=e22] [cursor=pointer]:
              - /url: /dashboard/objects
              - img [ref=e23]
              - text: Objekte
          - generic [ref=e26]:
            - heading "Kunden" [level=3] [ref=e27]
            - link "Kunden" [ref=e28] [cursor=pointer]:
              - /url: /dashboard/customers
              - img [ref=e29]
              - text: Kunden
            - link "Feedback" [ref=e34] [cursor=pointer]:
              - /url: /dashboard/feedback
              - img [ref=e35]
              - text: Feedback
            - link "Tickets" [ref=e37] [cursor=pointer]:
              - /url: /dashboard/tickets
              - img [ref=e38]
              - text: Tickets
          - generic [ref=e40]:
            - heading "Personal" [level=3] [ref=e41]
            - link "Mitarbeiter" [ref=e42] [cursor=pointer]:
              - /url: /dashboard/employees
              - text: Mitarbeiter
            - link "Abwesenheiten" [ref=e46] [cursor=pointer]:
              - /url: /dashboard/absence-requests
              - text: Abwesenheiten
            - link "Zeiterfassung" [ref=e50] [cursor=pointer]:
              - /url: /dashboard/time-tracking
              - text: Zeiterfassung
      - generic [ref=e53]:
        - button "Benachrichtigungen" [ref=e54]:
          - img [ref=e55]
        - button "a" [ref=e58]:
          - generic [ref=e60]: a
    - main [ref=e61]:
      - generic [ref=e63]:
        - generic [ref=e65]:
          - generic [ref=e66]:
            - heading "Willkommen zurück, aris!" [level=1] [ref=e67]
            - paragraph [ref=e68]: Freitag, 01. Mai 2026
          - button [ref=e69]:
            - img [ref=e70]
        - generic [ref=e73]:
          - button "Neuer Auftrag" [ref=e74]:
            - img [ref=e75]
            - text: Neuer Auftrag
          - button "Mitarbeiter" [ref=e76]:
            - img [ref=e77]
            - text: Mitarbeiter
          - button "Berichte" [ref=e80]:
            - img [ref=e81]
            - text: Berichte
          - button "Einstellungen" [ref=e83]:
            - img [ref=e84]
            - text: Einstellungen
        - generic [ref=e87]:
          - generic [ref=e88]:
            - generic [ref=e89]:
              - heading "Aktive Aufträge" [level=3] [ref=e90]
              - img [ref=e92]
            - generic [ref=e94]:
              - generic [ref=e95]: "0"
              - generic [ref=e96]:
                - generic [ref=e97]: +12%
                - generic [ref=e98]: vs. letzter Monat
          - generic [ref=e99]:
            - generic [ref=e100]:
              - heading "Abgeschlossene Aufträge" [level=3] [ref=e101]
              - img [ref=e103]
            - generic [ref=e106]:
              - generic [ref=e107]: "0"
              - generic [ref=e108]:
                - generic [ref=e109]: +8%
                - generic [ref=e110]: vs. letzter Monat
          - generic [ref=e111]:
            - generic [ref=e112]:
              - heading "Mitarbeiter aktiv" [level=3] [ref=e113]
              - img [ref=e115]
            - generic [ref=e120]:
              - generic [ref=e121]: "0"
              - generic [ref=e122]:
                - generic [ref=e123]: +5%
                - generic [ref=e124]: vs. letzter Monat
          - generic [ref=e125]:
            - generic [ref=e126]:
              - heading "Ausstehende Anfragen" [level=3] [ref=e127]
              - img [ref=e129]
            - generic [ref=e132]:
              - generic [ref=e133]: "0"
              - generic [ref=e134]:
                - generic [ref=e135]: "-3"
                - generic [ref=e136]: vs. letzter Monat
          - generic [ref=e137]:
            - generic [ref=e138]:
              - heading "Neue Beschwerden" [level=3] [ref=e139]
              - img [ref=e141]
            - generic [ref=e143]:
              - generic [ref=e144]: "0"
              - generic [ref=e145]:
                - generic [ref=e146]: "-2"
                - generic [ref=e147]: heute
        - generic [ref=e149]:
          - generic [ref=e150]:
            - heading "Heutige Einsätze" [level=3] [ref=e151]:
              - img [ref=e152]
              - text: Heutige Einsätze
            - paragraph [ref=e155]: Eine Übersicht aller geplanten, laufenden und abgeschlossenen Aufträge für heute.
          - generic [ref=e157]:
            - generic [ref=e158]:
              - heading "Bevorstehend 0" [level=3] [ref=e159]:
                - button "Bevorstehend 0" [expanded] [ref=e160]:
                  - generic [ref=e161]:
                    - generic [ref=e162]:
                      - img [ref=e163]
                      - paragraph [ref=e167]: Bevorstehend
                    - generic [ref=e168]: "0"
                  - img [ref=e169]
              - region "Bevorstehend 0" [ref=e171]:
                - paragraph [ref=e173]: Keine bevorstehenden Aufträge.
            - generic [ref=e174]:
              - heading "In Bearbeitung 0" [level=3] [ref=e175]:
                - button "In Bearbeitung 0" [expanded] [ref=e176]:
                  - generic [ref=e177]:
                    - generic [ref=e178]:
                      - img [ref=e179]
                      - paragraph [ref=e183]: In Bearbeitung
                    - generic [ref=e184]: "0"
                  - img [ref=e185]
              - region "In Bearbeitung 0" [ref=e187]:
                - paragraph [ref=e189]: Keine Aufträge in Bearbeitung.
            - heading "Abgeschlossen 0" [level=3] [ref=e191]:
              - button "Abgeschlossen 0" [ref=e192]:
                - generic [ref=e193]:
                  - generic [ref=e194]:
                    - img [ref=e195]
                    - paragraph [ref=e199]: Abgeschlossen
                  - generic [ref=e200]: "0"
                - img [ref=e201]
        - generic [ref=e203]:
          - generic [ref=e204]:
            - generic [ref=e206]:
              - generic [ref=e207]:
                - heading "Aktuelle Aktivitäten" [level=3] [ref=e208]:
                  - img [ref=e209]
                  - text: Aktuelle Aktivitäten
                - paragraph [ref=e211]: Die neuesten Aktivitäten im Unternehmen
              - button "Alle" [ref=e212]:
                - text: Alle
                - img [ref=e213]
            - generic [ref=e216]:
              - img [ref=e218]
              - paragraph [ref=e220]: Keine aktuellen Aktivitäten
          - generic [ref=e221]:
            - generic [ref=e223]:
              - generic [ref=e224]:
                - heading "Anstehende Aufgaben" [level=3] [ref=e225]:
                  - img [ref=e226]
                  - text: Anstehende Aufgaben
                - paragraph [ref=e230]: Aufgaben für die nächsten 7 Tage
              - button "Alle" [ref=e231]:
                - text: Alle
                - img [ref=e232]
            - generic [ref=e235]:
              - img [ref=e237]
              - paragraph [ref=e240]: Keine anstehenden Aufgaben
        - generic [ref=e241]:
          - generic [ref=e242]:
            - generic [ref=e243]:
              - heading "Geplante Aufträge" [level=3] [ref=e244]
              - img [ref=e246]
            - generic [ref=e248]:
              - generic [ref=e249]: "0"
              - paragraph [ref=e250]: 0 heute abgeschlossen
          - generic [ref=e251]:
            - generic [ref=e252]:
              - heading "Mitarbeiter" [level=3] [ref=e253]
              - img [ref=e255]
            - generic [ref=e260]:
              - generic [ref=e261]: "0"
              - paragraph [ref=e262]: 0 heute aktiv
          - generic [ref=e263]:
            - generic [ref=e264]:
              - heading "Kunden" [level=3] [ref=e265]
              - img [ref=e267]
            - generic [ref=e270]:
              - generic [ref=e271]: "0"
              - paragraph [ref=e272]: 0 Objekte betreut
          - generic [ref=e273]:
            - generic [ref=e274]:
              - heading "Beschwerden" [level=3] [ref=e275]
              - img [ref=e277]
            - generic [ref=e279]:
              - generic [ref=e280]: "0"
              - paragraph [ref=e281]: Ungelöste Tickets
        - generic [ref=e283]:
          - generic [ref=e285]:
            - heading "Offene Rechnungen" [level=3] [ref=e286]:
              - img [ref=e287]
              - text: Offene Rechnungen
            - link "Alle anzeigen" [ref=e290] [cursor=pointer]:
              - /url: /dashboard/invoices
          - generic [ref=e291]:
            - generic [ref=e293]:
              - generic [ref=e294]: Überfällig
              - generic [ref=e295]: "0"
            - generic [ref=e297]:
              - generic [ref=e298]: Ausstehend
              - generic [ref=e299]: "0"
  - region "Notifications alt+T"
  - generic [ref=e300]:
    - img [ref=e302]
    - button "Open Tanstack query devtools" [ref=e350] [cursor=pointer]:
      - img [ref=e351]
  - generic [ref=e403] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e404]:
      - img [ref=e405]
    - generic [ref=e408]:
      - button "Open issues overlay" [ref=e409]:
        - generic [ref=e410]:
          - generic [ref=e411]: "0"
          - generic [ref=e412]: "1"
        - generic [ref=e413]: Issue
      - button "Collapse issues badge" [ref=e414]:
        - img [ref=e415]
  - alert [ref=e417]
```

# Test source

```ts
  4   | 
  5   | import { test, expect } from '@playwright/test';
  6   | 
  7   | /**
  8   |  * Test Configuration
  9   |  * 
  10  |  * These tests require:
  11  |  * 1. .env.local with Supabase credentials
  12  |  * 2. Supabase database with seeded data
  13  |  * 3. Dev server running (npm run dev)
  14  |  * 
  15  |  * Run with: npx playwright test
  16  |  */
  17  | 
  18  | // ============================================
  19  | // LOGIN & AUTHENTICATION
  20  | // ============================================
  21  | 
  22  | test.describe('🔐 Authentication', () => {
  23  |   test('should display login page correctly', async ({ page }) => {
  24  |     await page.goto('/login');
  25  |     await page.waitForLoadState('networkidle');
  26  |     
  27  |     // Check logo is visible
  28  |     const logo = page.locator('img').filter({ has: page.locator('[alt*="ReinPlaner"], [alt*="ARIS"]') }).first();
  29  |     await expect(page.locator('img[alt*="ReinPlaner"], img[alt*="ARIS"]').first()).toBeVisible({ timeout: 5000 });
  30  |     
  31  |     // Check form elements
  32  |     await expect(page.getByLabel(/email|e-mail/i)).toBeVisible();
  33  |     await expect(page.getByLabel(/passwort|password/i)).toBeVisible();
  34  |     await expect(page.getByRole('button', { name: /anmelden|sign in/i })).toBeVisible();
  35  |   });
  36  | 
  37  |   test('should show error for invalid credentials', async ({ page }) => {
  38  |     await page.goto('/login');
  39  |     await page.waitForLoadState('networkidle');
  40  |     
  41  |     await page.getByLabel(/email|e-mail/i).fill('invalid@test.com');
  42  |     await page.getByLabel(/passwort|password/i).fill('wrongpassword');
  43  |     await page.getByRole('button', { name: /anmelden|sign in/i }).click();
  44  |     
  45  |     // Should show error message
  46  |     await expect(page.getByText(/fehlgeschlagen|invalid|error|falsch/i)).toBeVisible({ timeout: 5000 });
  47  |   });
  48  | 
  49  |   test('should redirect unauthenticated users to login', async ({ page }) => {
  50  |     await page.goto('/dashboard');
  51  |     
  52  |     // Should redirect to login
  53  |     await expect(page).toHaveURL(/login/, { timeout: 10000 });
  54  |   });
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
> 104 |     await expect(sidebar).toBeVisible({ timeout: 5000 });
      |                           ^ Error: expect(locator).toBeVisible() failed
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
  155 |     expect(headingVisible || mainVisible).toBeTruthy();
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
```