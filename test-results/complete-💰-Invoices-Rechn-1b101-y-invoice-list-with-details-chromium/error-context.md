# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: complete.spec.ts >> 💰 Invoices (Rechnungen) >> should display invoice list with details
- Location: e2e/complete.spec.ts:363:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('main')

```

# Test source

```ts
  271 | // ORDERS
  272 | // ============================================
  273 | 
  274 | test.describe('📋 Orders (Aufträge)', () => {
  275 |   test('should load orders list', async ({ page }) => {
  276 |     await page.goto('/dashboard/orders');
  277 |     await page.waitForLoadState('networkidle');
  278 |     await page.waitForTimeout(2000);
  279 |     
  280 |     const heading = page.getByRole('heading', { name: /aufträge|orders/i }).first();
  281 |     await expect(heading).toBeVisible({ timeout: 10000 });
  282 |   });
  283 | 
  284 |   test('should display orders with status indicators', async ({ page }) => {
  285 |     await page.goto('/dashboard/orders');
  286 |     await page.waitForLoadState('networkidle');
  287 |     await page.waitForTimeout(3000);
  288 |     
  289 |     // Orders should be visible as table or cards
  290 |     const ordersList = page.locator('table, [class*="order"], [class*="auftrag"]').first();
  291 |     await expect(ordersList).toBeVisible({ timeout: 5000 }).catch(() => {
  292 |       // If no orders exist, page should still load
  293 |       expect(page.locator('main')).toBeVisible();
  294 |     });
  295 |   });
  296 | 
  297 |   test('should filter orders by status', async ({ page }) => {
  298 |     await page.goto('/dashboard/orders');
  299 |     await page.waitForLoadState('networkidle');
  300 |     
  301 |     // Status filter should exist
  302 |     const statusFilter = page.locator('select, [role="combobox"]').first();
  303 |     
  304 |     if (await statusFilter.isVisible().catch(() => false)) {
  305 |       // Select different statuses
  306 |       const options = await statusFilter.locator('option').all();
  307 |       if (options.length > 1) {
  308 |         await statusFilter.selectOption({ index: 1 });
  309 |         await page.waitForTimeout(1000);
  310 |         
  311 |         // Page should still work
  312 |         expect(page.locator('main')).toBeVisible();
  313 |       }
  314 |     }
  315 |   });
  316 | 
  317 |   test('should create new order', async ({ page }) => {
  318 |     await page.goto('/dashboard/orders/new');
  319 |     await page.waitForLoadState('networkidle');
  320 |     await page.waitForTimeout(2000);
  321 |     
  322 |     // Form should exist
  323 |     const form = page.locator('form');
  324 |     await expect(form).toBeVisible({ timeout: 5000 });
  325 |     
  326 |     // Required fields should exist
  327 |     await expect(page.getByLabel(/titel|name|bezeichnung/i).first()).toBeAttached();
  328 |     await expect(page.getByLabel(/kunde|customer/i).first()).toBeAttached();
  329 |   });
  330 | 
  331 |   test('should validate required order fields', async ({ page }) => {
  332 |     await page.goto('/dashboard/orders/new');
  333 |     await page.waitForLoadState('networkidle');
  334 |     await page.waitForTimeout(2000);
  335 |     
  336 |     const submitButton = page.getByRole('button', { name: /speichern|erstellen|create/i }).first();
  337 |     
  338 |     if (await submitButton.isVisible().catch(() => false)) {
  339 |       await submitButton.click();
  340 |       await page.waitForTimeout(1000);
  341 |       
  342 |       // Should show validation errors
  343 |       const validationError = page.getByText(/erforderlich|pflichtfeld|required/i).first();
  344 |       // Validation may or may not show depending on implementation
  345 |     }
  346 |   });
  347 | });
  348 | 
  349 | // ============================================
  350 | // INVOICES
  351 | // ============================================
  352 | 
  353 | test.describe('💰 Invoices (Rechnungen)', () => {
  354 |   test('should load invoices list', async ({ page }) => {
  355 |     await page.goto('/dashboard/invoices');
  356 |     await page.waitForLoadState('networkidle');
  357 |     await page.waitForTimeout(2000);
  358 |     
  359 |     const heading = page.getByRole('heading', { name: /rechnungen|invoices/i }).first();
  360 |     await expect(heading).toBeVisible({ timeout: 10000 });
  361 |   });
  362 | 
  363 |   test('should display invoice list with details', async ({ page }) => {
  364 |     await page.goto('/dashboard/invoices');
  365 |     await page.waitForLoadState('networkidle');
  366 |     await page.waitForTimeout(3000);
  367 |     
  368 |     // Table or invoice cards
  369 |     const invoiceList = page.locator('table, [class*="invoice"], [class*="rechnung"]').first();
  370 |     await expect(invoiceList).toBeVisible({ timeout: 5000 }).catch(() => {
> 371 |       expect(page.locator('main')).toBeVisible();
      |                                    ^ Error: expect(locator).toBeVisible() failed
  372 |     });
  373 |   });
  374 | 
  375 |   test('should search invoices', async ({ page }) => {
  376 |     await page.goto('/dashboard/invoices');
  377 |     await page.waitForLoadState('networkidle');
  378 |     
  379 |     const searchInput = page.getByPlaceholder(/suche|search|invoice/i).first();
  380 |     
  381 |     if (await searchInput.isVisible().catch(() => false)) {
  382 |       await searchInput.fill('R/');
  383 |       await page.waitForTimeout(1000);
  384 |       
  385 |       // Should filter without error
  386 |       expect(page.locator('main')).toBeVisible();
  387 |     }
  388 |   });
  389 | 
  390 |   test('should filter invoices by status', async ({ page }) => {
  391 |     await page.goto('/dashboard/invoices');
  392 |     await page.waitForLoadState('networkidle');
  393 |     
  394 |     const statusSelect = page.locator('select').first();
  395 |     
  396 |     if (await statusSelect.isVisible().catch(() => false)) {
  397 |       const options = await statusSelect.locator('option').all();
  398 |       if (options.length > 1) {
  399 |         await statusSelect.selectOption({ index: 1 });
  400 |         await page.waitForTimeout(500);
  401 |         
  402 |         expect(page.locator('main')).toBeVisible();
  403 |       }
  404 |     }
  405 |   });
  406 | 
  407 |   test('should open new invoice form', async ({ page }) => {
  408 |     await page.goto('/dashboard/invoices/new');
  409 |     await page.waitForLoadState('networkidle');
  410 |     await page.waitForTimeout(2000);
  411 |     
  412 |     const form = page.locator('form');
  413 |     await expect(form).toBeVisible({ timeout: 5000 });
  414 |     
  415 |     // Customer selector
  416 |     await expect(page.getByLabel(/kunde|customer|debitor/i).first()).toBeAttached();
  417 |   });
  418 | 
  419 |   test('should view invoice details', async ({ page }) => {
  420 |     await page.goto('/dashboard/invoices');
  421 |     await page.waitForLoadState('networkidle');
  422 |     await page.waitForTimeout(2000);
  423 |     
  424 |     // Click on first invoice if exists
  425 |     const invoiceLink = page.locator('a[href*="/dashboard/invoices/"][href$!="/new"]').first();
  426 |     
  427 |     if (await invoiceLink.isVisible().catch(() => false)) {
  428 |       await invoiceLink.click();
  429 |       await page.waitForLoadState('networkidle');
  430 |       
  431 |       // Should show invoice details
  432 |       const detailContent = page.locator('main, [role="main"]').first();
  433 |       await expect(detailContent).toBeVisible();
  434 |     }
  435 |   });
  436 | });
  437 | 
  438 | // ============================================
  439 | // PLANNING
  440 | // ============================================
  441 | 
  442 | test.describe('📅 Planning (Dienstplanung)', () => {
  443 |   test('should load planning page', async ({ page }) => {
  444 |     await page.goto('/dashboard/planning');
  445 |     await page.waitForLoadState('networkidle');
  446 |     await page.waitForTimeout(2000);
  447 |     
  448 |     const heading = page.getByRole('heading', { name: /planung|planning/i }).first();
  449 |     await expect(heading).toBeVisible({ timeout: 10000 });
  450 |   });
  451 | 
  452 |   test('should display calendar view', async ({ page }) => {
  453 |     await page.goto('/dashboard/planning');
  454 |     await page.waitForLoadState('networkidle');
  455 |     await page.waitForTimeout(2000);
  456 |     
  457 |     // Calendar or week view
  458 |     const calendar = page.locator('[class*="calendar"], [class*="plan"], table').first();
  459 |     await expect(calendar).toBeVisible({ timeout: 5000 });
  460 |   });
  461 | 
  462 |   test('should show week navigation', async ({ page }) => {
  463 |     await page.goto('/dashboard/planning');
  464 |     await page.waitForLoadState('networkidle');
  465 |     
  466 |     // Week indicator
  467 |     const weekIndicator = page.getByText(/kw|kalenderwoche|woche/i).first();
  468 |     await expect(weekIndicator).toBeVisible({ timeout: 5000 }).catch(() => {});
  469 |     
  470 |     // Navigation buttons
  471 |     const prevBtn = page.getByLabel(/vorher|back|previous/i).first();
```