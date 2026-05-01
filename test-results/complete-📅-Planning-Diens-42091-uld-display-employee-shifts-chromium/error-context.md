# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: complete.spec.ts >> 📅 Planning (Dienstplanung) >> should display employee shifts
- Location: e2e/complete.spec.ts:481:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main, [role="main"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('main, [role="main"]').first()

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
  472 |     const nextBtn = page.getByLabel(/nächste|next|forward/i).first();
  473 |     
  474 |     // At least one should exist
  475 |     const prevExists = await prevBtn.isVisible().catch(() => false);
  476 |     const nextExists = await nextBtn.isVisible().catch(() => false);
  477 |     
  478 |     expect(prevExists || nextExists).toBeTruthy();
  479 |   });
  480 | 
  481 |   test('should display employee shifts', async ({ page }) => {
  482 |     await page.goto('/dashboard/planning');
  483 |     await page.waitForLoadState('networkidle');
  484 |     await page.waitForTimeout(3000);
  485 |     
  486 |     // Employee or shift content should exist
  487 |     const shiftContent = page.locator('main, [role="main"]').first();
> 488 |     await expect(shiftContent).toBeVisible();
      |                                ^ Error: expect(locator).toBeVisible() failed
  489 |   });
  490 | });
  491 | 
  492 | // ============================================
  493 | // OBJECTS (Cleaning Objects/Locations)
  494 | // ============================================
  495 | 
  496 | test.describe('🏢 Objects (Reinigungsobjekte)', () => {
  497 |   test('should load objects list', async ({ page }) => {
  498 |     await page.goto('/dashboard/objects');
  499 |     await page.waitForLoadState('networkidle');
  500 |     await page.waitForTimeout(2000);
  501 |     
  502 |     // Page should load
  503 |     expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  504 |   });
  505 | 
  506 |   test('should display objects with addresses', async ({ page }) => {
  507 |     await page.goto('/dashboard/objects');
  508 |     await page.waitForLoadState('networkidle');
  509 |     await page.waitForTimeout(3000);
  510 |     
  511 |     // List of objects
  512 |     const objectsList = page.locator('table, [class*="object"], [class*="standort"]').first();
  513 |     await expect(objectsList).toBeVisible({ timeout: 5000 }).catch(() => {
  514 |       expect(page.locator('main')).toBeVisible();
  515 |     });
  516 |   });
  517 | 
  518 |   test('should navigate to object details', async ({ page }) => {
  519 |     await page.goto('/dashboard/objects');
  520 |     await page.waitForLoadState('networkidle');
  521 |     await page.waitForTimeout(2000);
  522 |     
  523 |     const objectLink = page.locator('a[href*="/objects/"]').first();
  524 |     
  525 |     if (await objectLink.isVisible().catch(() => false)) {
  526 |       await objectLink.click();
  527 |       await page.waitForLoadState('networkidle');
  528 |       
  529 |       expect(page.locator('main')).toBeVisible();
  530 |     }
  531 |   });
  532 | });
  533 | 
  534 | // ============================================
  535 | // TIME TRACKING
  536 | // ============================================
  537 | 
  538 | test.describe('⏱️ Time Tracking', () => {
  539 |   test('should load time tracking page', async ({ page }) => {
  540 |     await page.goto('/dashboard/time-tracking');
  541 |     await page.waitForLoadState('networkidle');
  542 |     await page.waitForTimeout(2000);
  543 |     
  544 |     const heading = page.getByRole('heading', { name: /zeit|time/i }).first();
  545 |     await expect(heading).toBeVisible({ timeout: 10000 });
  546 |   });
  547 | 
  548 |   test('should display time entries', async ({ page }) => {
  549 |     await page.goto('/dashboard/time-tracking');
  550 |     await page.waitForLoadState('networkidle');
  551 |     await page.waitForTimeout(3000);
  552 |     
  553 |     // Time entries list
  554 |     const timeList = page.locator('table, [class*="time"], [class*="zeit"]').first();
  555 |     await expect(timeList).toBeVisible({ timeout: 5000 }).catch(() => {
  556 |       expect(page.locator('main')).toBeVisible();
  557 |     });
  558 |   });
  559 | 
  560 |   test('should have create time entry option', async ({ page }) => {
  561 |     await page.goto('/dashboard/time-tracking');
  562 |     await page.waitForLoadState('networkidle');
  563 |     
  564 |     const addButton = page.getByRole('link', { name: /neue.*zeit|eintrag.*hinzufügen/i })
  565 |       .or(page.getByRole('button', { name: /\+.+/ }))
  566 |       .first();
  567 |     
  568 |     await expect(addButton).toBeAttached();
  569 |   });
  570 | });
  571 | 
  572 | // ============================================
  573 | // FINANCES
  574 | // ============================================
  575 | 
  576 | test.describe('💵 Finances (Finanzen)', () => {
  577 |   test('should load finances overview', async ({ page }) => {
  578 |     await page.goto('/dashboard/finances');
  579 |     await page.waitForLoadState('networkidle');
  580 |     await page.waitForTimeout(2000);
  581 |     
  582 |     // Page should load
  583 |     expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  584 |   });
  585 | 
  586 |   test('should display financial summary', async ({ page }) => {
  587 |     await page.goto('/dashboard/finances');
  588 |     await page.waitForLoadState('networkidle');
```